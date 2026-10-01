# ZipStream OCR & Searchable PDF Subsystem — Security Model

## 1. Security Architecture Principles

The OCR processing subsystem handles untrusted user-uploaded binary documents. To maintain bank-grade security, the subsystem enforces defense-in-depth across the network, container, filesystem, and application layers:

```
[ Untrusted Input ]
       │
       ▼
1. Strict Boundary Validation (Magic Bytes %PDF-, 50MB Size Cap, 100 Page Cap)
       │
       ▼
2. Rate Limiting & Concurrency Control (15 req/min/IP via Redis)
       │
       ▼
3. Zero Shell Interpolation (execFile / subprocess.run with argument arrays)
       │
       ▼
4. Non-Root Container Execution (UID 1000 sandbox)
       │
       ▼
5. Ephemeral Isolated Filesystem (/tmp/zipstream-ocr/job_<uuid>/)
       │
       ▼
6. SSRF & Network Isolation (Container network restricted to internal loopback)
       │
       ▼
7. IDOR Protection (Cryptographic Capability Tokens on all download links)
       │
       ▼
8. Automated File Cleanup & No-Cache Headers (Purged within 1 hour)
```

---

## 2. Command Injection Prevention

### Vulnerability Pattern (Strictly Prohibited):
```javascript
// FORBIDDEN — Vulnerable to shell injection:
exec(`ocrmypdf -l ${userLang} ${filePath}`);
```

### ZipStream Hardened Implementation:
1. **Allowlisted Language Normalization:** The user's input is mapped against a strict set of known language tokens (`eng`, `hin`, `eng+hin`, `fra`, `deu`, `spa`). Any unmatched input is immediately dropped and defaulted to `eng`.
2. **Safe Argument Arrays:**
   ```typescript
   // TypeScript Gateway:
   const args = ['--language', options.language, '--output-type', 'pdf', inputPath, outputPath];
   await execFileAsync('ocrmypdf', args, { timeout: 180000 });
   ```
   ```python
   # Python Container Service:
   cmd = ["ocrmypdf", "--language", lang, "--output-type", "pdf", input_path, output_path]
   proc = subprocess.run(cmd, capture_output=True, timeout=timeout_sec)
   ```
   Because `shell=True` is never passed, arbitrary shell metacharacters (`;`, `&`, `|`, `` ` ``, `$()`) are treated as literal characters and cannot be executed.

---

## 3. Container & Operating System Hardening

- **Non-Root Runtime User:** The container switches to `USER 1000` (non-root `appuser`) immediately after package installation. It cannot modify system binaries or install arbitrary packages.
- **Isolated Ephemeral Directories:** Every job generates a cryptographic UUIDv4 workspace directory:
  ```text
  /tmp/zipstream-ocr/job_7b28d5e1-8840-424b-853f-4e09d1341c22/
  ```
  The directory is destroyed in a guaranteed `finally` block when processing completes or errors out.
- **Path Traversal Protection:** User-supplied filenames are stripped and sanitized using `sanitizeFileName()`. The server never uses client-supplied paths on the disk.

---

## 4. Insecure Direct Object References (IDOR)

When an OCR job produces an output file on the server, a cryptographically random 24-byte hex token is generated:
```typescript
job.downloadToken = crypto.randomBytes(24).toString('hex');
```
To download the generated searchable PDF via `GET /api/ocr/:jobId/download`, the requester must provide the matching `?token=<downloadToken>`. An attacker guessing sequential job IDs cannot retrieve documents belonging to another user.

---

## 5. Denial of Service (DoS) & Resource Exhaustion

1. **Payload Size Capping:** Requests exceeding 50MB are rejected at the HTTP gateway before buffer allocation.
2. **Rate Limiting:** IP-based sliding window rate limiter permits a maximum of 15 OCR requests per minute per IP.
3. **Execution Hard Timeout:** An unconditional 180-second process timeout kills stuck or infinite-loop jobs.
4. **Memory Caps:** Node.js buffers and container runtimes are constrained to prevent OOM panics.

---

## 6. Document Privacy & Data Retention

- **Temporary Processing Notice:** The UI explicitly states:
  > *"Your PDF is securely processed temporarily on ZipStream's infrastructure to create a searchable PDF. Processing files are automatically removed according to our retention policy."*
- **No Permanent Cloud Storage:** Files are not held in long-term databases. R2 lifecycle policies enforce automatic 24-hour object expiration. Local ephemeral files are purged within 1 hour.
- **Cache Control:** All output downloads include:
  ```http
  Cache-Control: private, no-store, no-cache, must-revalidate
  Pragma: no-cache
  ```
  Preventing intermediate CDNs and shared proxies from caching sensitive document downloads.
