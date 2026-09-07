import os
import uuid
from typing import Dict, Any
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.templating import Jinja2Templates

# Base Paths Setup
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
TEMPLATES_DIR = BASE_DIR / "templates"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="FliQR - Instant QR File Sharing",
    description="Drop files on desktop, scan QR, and download instantly on mobile."
)

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# In-memory storage for file metadata
# Schema: { file_id: { "original_filename": str, "file_path": str, "size_bytes": int, "size_mb": float } }
file_store: Dict[str, Dict[str, Any]] = {}


@app.get("/", response_class=HTMLResponse)
async def serve_index(request: Request):
    """
    Desktop upload page with drag-and-drop zone.
    """
    return templates.TemplateResponse(request=request, name="index.html")


@app.post("/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """
    Asynchronously ingest file, assign 8-character unique ID, save to uploads directory,
    and return downloadable landing URL for QR generation.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty or invalid filename.")

    file_id = str(uuid.uuid4())[:8]
    sanitized_filename = os.path.basename(file.filename)
    extension = Path(sanitized_filename).suffix
    saved_filename = f"{file_id}{extension}"
    target_path = UPLOAD_DIR / saved_filename

    # Stream file to disk in chunks to handle arbitrary file sizes safely
    bytes_written = 0
    try:
        with open(target_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                f.write(chunk)
                bytes_written += len(chunk)
    except Exception as e:
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to write file to disk: {str(e)}")

    size_mb = round(bytes_written / (1024 * 1024), 2)
    if size_mb == 0.0 and bytes_written > 0:
        size_mb = 0.01

    # Store metadata in-memory
    file_store[file_id] = {
        "original_filename": sanitized_filename,
        "file_path": str(target_path),
        "size_bytes": bytes_written,
        "size_mb": size_mb,
    }

    # Construct the download landing URL using the incoming request Host header
    base_url = str(request.base_url).rstrip("/")
    download_link = f"{base_url}/d/{file_id}"

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "file_id": file_id,
            "original_filename": sanitized_filename,
            "size_mb": size_mb,
            "download_link": download_link,
        }
    )


@app.get("/d/{file_id}", response_class=HTMLResponse)
async def mobile_landing_page(request: Request, file_id: str):
    """
    Mobile-optimized landing page displayed when scanning the QR code.
    """
    file_info = file_store.get(file_id)
    if not file_info or not Path(file_info["file_path"]).exists():
        return templates.TemplateResponse(
            request=request,
            name="download.html",
            context={
                "found": False,
                "file_id": file_id
            },
            status_code=404
        )

    return templates.TemplateResponse(
        request=request,
        name="download.html",
        context={
            "found": True,
            "file_id": file_id,
            "filename": file_info["original_filename"],
            "size_mb": file_info["size_mb"],
            "download_url": f"/download/{file_id}"
        }
    )


@app.get("/download/{file_id}")
async def direct_download(file_id: str):
    """
    Direct file download route triggered by the 'Download to Device' button.
    """
    file_info = file_store.get(file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="File metadata not found or expired.")

    file_path = Path(file_info["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File does not exist on disk.")

    return FileResponse(
        path=str(file_path),
        filename=file_info["original_filename"],
        media_type="application/octet-stream"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
