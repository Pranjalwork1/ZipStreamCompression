# ZipStream — Production Deployment Notes

## Production architecture

- **Vercel / zipstream.online** serves the React application and all public share links.
- **Railway** runs the Node/Express + Socket.IO backend and Ghostscript PDF compressor.
- PDF compression uses Ghostscript with adaptive profiles and refuses to return an inflated result.
- DOCX/PPTX/XLSX compression is lossless OOXML package recompression in the browser.
- P2P uses WebRTC for the fast path, with a verified Railway room-cache recovery path for NAT/firewall/mobile failures.
- Shared-room files are streamed as raw bytes with SHA-256 verification; metadata endpoints no longer return the full Base64 payload by default.

## Vercel environment variables

Set:

```text
VITE_BACKEND_URL=https://YOUR-RAILWAY-DOMAIN
VITE_PUBLIC_APP_URL=https://zipstream.online
```

## Railway environment variables

Set production secrets only in Railway:

```text
NODE_ENV=production
GEMINI_API_KEY=...
TURN_URL=...
TURN_USERNAME=...
TURN_CREDENTIAL=...
```

`TURN_*` values are optional but recommended for reliable WebRTC across restrictive networks.

## Deploy

```bash
git checkout main
git pull origin main
git add .
git commit -m "Harden production compression and P2P sharing"
git push origin main
```

Railway uses the included Dockerfile, which installs Ghostscript and runs `npm start`.

## Production smoke tests

1. Open `https://zipstream.online/compress-pdf` and compress a real multi-page/image-heavy PDF.
2. Verify the downloaded PDF is smaller and opens correctly.
3. Upload a `.docx`, `.pptx`, or `.xlsx` and run compression.
4. Open P2P Share on desktop, copy the public `/room/<id>` link, then open it on a phone using mobile data.
5. Scan the QR code from the phone camera and verify the room file downloads/reconstructs to 100%.
6. Turn off WebRTC/TURN or test behind a restrictive network; the guest should still recover the cached room document.
7. Use the downloaded file and verify its SHA-256 integrity against the source when needed.

Do not commit `.env`, API keys, Telegram bot tokens, or TURN credentials.


## Production environment
- `VITE_BACKEND_URL` points the Vercel frontend to Railway.
- `VITE_PUBLIC_APP_URL=https://zipstream.online` makes QR/share links canonical.
- `MAX_ROOM_DOCUMENT_BYTES` controls the binary P2P recovery cache limit (default 250MB).
- `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` are recommended for WebRTC stability.
