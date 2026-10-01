#!/usr/bin/env python3
"""
ZipStream OCR Container Service
Production runner for OCRmyPDF + Tesseract.

Provides high-performance, containerized PDF optical character recognition with:
- Non-root security isolation
- Strict language code allowlisting
- Automatic deskew & orientation correction
- In-memory/ephemeral filesystem cleanup
- Output validation for searchable PDF layers
"""

import http.server
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import time
import uuid

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [ZipStream-OCR] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("zipstream_ocr")

PORT = int(os.environ.get("PORT", "8080"))
TEMP_BASE_DIR = os.environ.get("TEMP_DIR", "/tmp/zipstream-ocr")
MAX_FILE_SIZE_BYTES = int(os.environ.get("OCR_MAX_FILE_SIZE_MB", "50")) * 1024 * 1024
DEFAULT_TIMEOUT_SEC = 180
MAX_TIMEOUT_SEC = 300

# Verified Tesseract language allowlist
ALLOWED_LANGUAGES = {
    "eng": "English",
    "hin": "Hindi",
    "eng+hin": "English + Hindi",
    "hin+eng": "Hindi + English",
    "fra": "French",
    "deu": "German",
    "spa": "Spanish",
}

class OcrRequestHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        # Override standard log to use structured logger
        logger.info("%s - %s", self.address_string(), format % args)

    def send_json(self, status_code: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.handle_health()
        elif self.path == "/languages":
            self.handle_languages()
        else:
            self.send_json(404, {"error": "Not Found", "path": self.path})

    def handle_health(self):
        # Check installed tesseract languages
        tess_langs = []
        try:
            res = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True, check=True)
            tess_langs = [line.strip() for line in res.stdout.splitlines()[1:] if line.strip()]
        except Exception as e:
            logger.warning(f"Failed to query tesseract languages: {e}")

        # Query OCRmyPDF version
        ocrmypdf_version = "unknown"
        try:
            res = subprocess.run(["ocrmypdf", "--version"], capture_output=True, text=True, check=True)
            ocrmypdf_version = res.stdout.strip()
        except Exception:
            pass

        self.send_json(200, {
            "status": "healthy",
            "service": "ZipStream OCR Container Engine",
            "ocrmypdf_version": ocrmypdf_version,
            "tesseract_languages": tess_langs,
            "supported_languages": list(ALLOWED_LANGUAGES.keys()),
            "timestamp": int(time.time()),
        })

    def handle_languages(self):
        self.send_json(200, {
            "languages": [
                {"code": code, "label": label, "installed": True}
                for code, label in ALLOWED_LANGUAGES.items()
            ]
        })

    def do_POST(self):
        if self.path == "/ocr" or self.path == "/api/ocr":
            self.handle_ocr()
        else:
            self.send_json(404, {"error": "Endpoint not found"})

    def handle_ocr(self):
        start_time = time.time()
        job_id = self.headers.get("X-OCR-Job-Id", str(uuid.uuid4()))
        
        # Read content length
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except (ValueError, TypeError):
            self.send_json(400, {"error": "Invalid Content-Length", "jobId": job_id})
            return

        if content_length <= 0:
            self.send_json(400, {"error": "Empty PDF payload", "jobId": job_id})
            return

        if content_length > MAX_FILE_SIZE_BYTES:
            self.send_json(413, {
                "error": f"PDF exceeds maximum allowed size ({MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB)",
                "jobId": job_id
            })
            return

        # Read parameters from headers
        lang = self.headers.get("X-OCR-Language", "eng").strip().lower()
        if lang not in ALLOWED_LANGUAGES:
            self.send_json(400, {
                "error": f"Unsupported or unallowlisted language: {lang}. Supported: {list(ALLOWED_LANGUAGES.keys())}",
                "jobId": job_id
            })
            return

        mode = self.headers.get("X-OCR-Mode", "auto").strip().lower()
        if mode not in ["auto", "force", "skip"]:
            mode = "auto"

        deskew = self.headers.get("X-OCR-Deskew", "true").strip().lower() == "true"
        rotate = self.headers.get("X-OCR-Rotate", "true").strip().lower() == "true"

        try:
            timeout_sec = min(int(self.headers.get("X-OCR-Timeout", DEFAULT_TIMEOUT_SEC)), MAX_TIMEOUT_SEC)
        except ValueError:
            timeout_sec = DEFAULT_TIMEOUT_SEC

        # Read binary body
        pdf_bytes = self.rfile.read(content_length)
        if len(pdf_bytes) < 5 or not pdf_bytes.startswith(b"%PDF-"):
            self.send_json(400, {"error": "Invalid PDF magic header. Expected %PDF-", "jobId": job_id})
            return

        # Prepare isolated workspace
        job_dir = os.path.join(TEMP_BASE_DIR, f"job_{job_id}")
        os.makedirs(job_dir, exist_ok=True)
        input_path = os.path.join(job_dir, "input.pdf")
        output_path = os.path.join(job_dir, "output_searchable.pdf")

        try:
            with open(input_path, "wb") as f:
                f.write(pdf_bytes)

            # Build safe command arguments
            cmd = [
                "ocrmypdf",
                "--language", lang,
                "--output-type", "pdf",
                "--jobs", "2",
                "--optimize", "0",  # Preserve original image quality without heavy re-compression
            ]

            if deskew:
                cmd.append("--deskew")

            if rotate:
                cmd.append("--rotate-pages")

            if mode == "force":
                cmd.append("--redo-ocr")
            elif mode == "skip":
                cmd.append("--skip-text")

            cmd.extend([input_path, output_path])

            logger.info(f"[{job_id}] Invoking: {' '.join(cmd)}")
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout_sec
            )

            # Check exit codes
            # Exit code 0: success
            # Exit code 6: already has text (if not in redo mode)
            # Exit code 2: input file is encrypted/password-protected
            if proc.returncode != 0:
                stdout_err = (proc.stderr or proc.stdout or "").strip()
                logger.warning(f"[{job_id}] OCRmyPDF exited with code {proc.returncode}: {stdout_err}")

                if proc.returncode == 2 or "encrypted" in stdout_err.lower() or "password" in stdout_err.lower():
                    self.send_json(422, {
                        "error": "This PDF is password protected or encrypted. Please unlock it first.",
                        "code": "ENCRYPTED_PDF",
                        "jobId": job_id
                    })
                    return

                if "already has text" in stdout_err.lower():
                    # Return original with header indicating already searchable
                    self.send_response(200)
                    self.send_header("Content-Type", "application/pdf")
                    self.send_header("Content-Disposition", 'attachment; filename="searchable.pdf"')
                    self.send_header("Content-Length", str(len(pdf_bytes)))
                    self.send_header("X-OCR-Status", "already_searchable")
                    self.send_header("X-OCR-Job-Id", job_id)
                    self.end_headers()
                    self.wfile.write(pdf_bytes)
                    return

                self.send_json(500, {
                    "error": "OCR processing failed on this document.",
                    "details": stdout_err[:300] if stdout_err else "Non-zero exit code",
                    "jobId": job_id
                })
                return

            # Validate output
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                self.send_json(500, {"error": "OCR succeeded but output file was not generated", "jobId": job_id})
                return

            output_size = os.path.getsize(output_path)
            with open(output_path, "rb") as out_f:
                out_bytes = out_f.read()

            if not out_bytes.startswith(b"%PDF-"):
                self.send_json(500, {"error": "Generated output is not a valid PDF file", "jobId": job_id})
                return

            elapsed = round(time.time() - start_time, 2)
            logger.info(f"[{job_id}] OCR completed successfully in {elapsed}s (Size: {output_size} bytes)")

            # Send valid searchable PDF
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Disposition", 'attachment; filename="searchable.pdf"')
            self.send_header("Content-Length", str(len(out_bytes)))
            self.send_header("X-OCR-Status", "completed")
            self.send_header("X-OCR-Duration-Sec", str(elapsed))
            self.send_header("X-OCR-Job-Id", job_id)
            self.send_header("X-OCR-Language", lang)
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.end_headers()
            self.wfile.write(out_bytes)

        except subprocess.TimeoutExpired:
            logger.error(f"[{job_id}] OCR timed out after {timeout_sec}s")
            self.send_json(504, {
                "error": f"OCR processing timed out ({timeout_sec}s limit exceeded).",
                "code": "OCR_TIMEOUT",
                "jobId": job_id
            })
        except Exception as e:
            logger.error(f"[{job_id}] Unexpected error during OCR: {e}", exc_info=True)
            self.send_json(500, {
                "error": "Internal OCR processing error.",
                "jobId": job_id
            })
        finally:
            # Ephemeral workspace cleanup
            shutil.rmtree(job_dir, ignore_errors=True)


def run_server():
    os.makedirs(TEMP_BASE_DIR, exist_ok=True)
    server_address = ("0.0.0.0", PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, OcrRequestHandler)
    logger.info(f"Starting ZipStream OCR Container Service on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Stopping OCR service...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
