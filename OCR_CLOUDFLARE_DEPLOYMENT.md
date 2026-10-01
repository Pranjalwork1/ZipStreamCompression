# ZipStream OCR — Cloudflare Workers & Container Deployment Guide

## 1. Cloudflare Container Deployment Architecture

The OCR engine runs as a containerized microservice connected to the Cloudflare Worker orchestration gateway:

```
[ User Request ]
       │
       ▼
Cloudflare Edge Network
       │
       ▼
Cloudflare Worker (zipstream)
       ├── wrangler.jsonc (Assets, Variables, R2 Binding)
       ├── Express Router (/api/ocr)
       └── R2 Temporary Storage (zipstream-ocr-temp)
       │
       ▼ (Service Binding / Internal HTTP)
Cloudflare Container Sandbox (zipstream-ocr-container)
       ├── workers/ocr/Dockerfile (Pinned jbarlow83/ocrmypdf:v16.10.1)
       └── workers/ocr/server.py (Port 8080)
```

---

## 2. Wrangler Configuration (`wrangler.jsonc`)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "zipstream",
  "compatibility_date": "2026-09-26",
  "workers_dev": true,
  "observability": {
    "enabled": true
  },
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  "vars": {
    "OCR_MAX_FILE_SIZE_MB": "50",
    "OCR_MAX_PAGES": "100",
    "OCR_TIMEOUT_MS": "180000",
    "OCR_SUPPORTED_LANGUAGES": "eng,hin,fra,deu,spa",
    "OCR_CONTAINER_NAME": "zipstream-ocr-container"
  },
  "r2_buckets": [
    {
      "binding": "OCR_TEMP_BUCKET",
      "bucket_name": "zipstream-ocr-temp"
    }
  ]
}
```

---

## 3. Container Build & Push

### Build Container Locally
```bash
cd workers/ocr
docker build -t zipstream-ocr:v1.0.0 .
```

### Run Container Locally for Development
```bash
docker run -d --name zipstream-ocr -p 8080:8080 -e PORT=8080 zipstream-ocr:v1.0.0
```
Verify container health:
```bash
curl http://localhost:8080/health
```
Expected output:
```json
{
  "status": "healthy",
  "service": "ZipStream OCR Container Engine",
  "ocrmypdf_version": "16.10.1",
  "tesseract_languages": ["deu", "eng", "fra", "hin", "osd", "spa"],
  "supported_languages": ["eng", "hin", "eng+hin", "hin+eng", "fra", "deu", "spa"]
}
```

---

## 4. Deploying Worker to Cloudflare

### Deploy Worker & Static Assets
```bash
npm run build
wrangler deploy
```

---

## 5. R2 Bucket Lifecycle Policy
To ensure compliance with ZipStream's privacy policy, the temporary R2 bucket must automatically purge expired objects:

```json
{
  "Rules": [
    {
      "ID": "ExpireTemporaryOcrUploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

---

## 6. Rollback Procedure
If the container microservice experiences transient infrastructure issues or high load:
1. Revert `wrangler.jsonc` or unset `OCR_CONTAINER_URL`.
2. The Node/Worker gateway gracefully falls back to local CLI invocation if OCRmyPDF is present on the host.
3. If completely disabled, the API returns a structured HTTP 503 `ENGINE_UNAVAILABLE` error and guides the user to retry or use existing PDF tools without corrupting any other feature.
