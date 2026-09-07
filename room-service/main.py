import os
import time
import uuid
import asyncio
from pathlib import Path
from collections import defaultdict
from typing import Dict, Set, List, Any

from fastapi import FastAPI, UploadFile, File, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

# ─── Directories Setup ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
TEMP_ROOMS_DIR = BASE_DIR / "temp_rooms"
TEMPLATES_DIR = BASE_DIR / "templates"

TEMP_ROOMS_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

# ─── FastAPI App Initialization ───────────────────────────────────────────────
app = FastAPI(
    title="ZipStream Room Sharing Engine",
    description="Real-time WebSocket room-based file sync with ephemeral caching and in-browser PDF preview."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


# ─── WebSocket Connection & Room State Manager ────────────────────────────────
class RoomConnectionManager:
    def __init__(self):
        # Maps room_id -> set of active WebSockets
        self.active_rooms: Dict[str, Set[WebSocket]] = defaultdict(set)
        # Maps room_id -> list of file metadata objects
        self.room_files: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        # Track when a room became empty to allow immediate/graceful purge
        self.empty_room_timestamps: Dict[str, float] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_rooms[room_id].add(websocket)
        self.empty_room_timestamps.pop(room_id, None)

        active_count = len(self.active_rooms[room_id])
        # 1. Send existing room files to the newly joined client
        await websocket.send_json({
            "type": "room_state",
            "active_count": active_count,
            "files": self.room_files.get(room_id, [])
        })

        # 2. Broadcast updated participant counter to everyone else
        await self.broadcast(room_id, {
            "type": "user_joined",
            "active_count": active_count
        })

    def disconnect(self, room_id: str, websocket: WebSocket):
        if websocket in self.active_rooms[room_id]:
            self.active_rooms[room_id].remove(websocket)

        if not self.active_rooms[room_id]:
            self.active_rooms.pop(room_id, None)
            self.empty_room_timestamps[room_id] = time.time()
            # Schedule immediate cleanup of empty room files
            self.purge_room_files(room_id)

    async def broadcast(self, room_id: str, message: dict):
        if room_id not in self.active_rooms:
            return

        dead_connections = []
        for connection in list(self.active_rooms[room_id]):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            if dead in self.active_rooms[room_id]:
                self.active_rooms[room_id].remove(dead)

    def add_file(self, room_id: str, file_meta: Dict[str, Any]):
        self.room_files[room_id].append(file_meta)

    def purge_room_files(self, room_id: str):
        """Immediately removes disk files and cache when a room has 0 occupants."""
        files = self.room_files.pop(room_id, [])
        for f in files:
            path_str = f.get("file_path")
            if path_str:
                p = Path(path_str)
                if p.exists():
                    try:
                        p.unlink(missing_ok=True)
                    except Exception:
                        pass


manager = RoomConnectionManager()


# ─── Ephemeral Background Cleanup Task ────────────────────────────────────────
async def ephemeral_cleanup_worker():
    """
    Background worker that runs continuously:
    1. Purges files older than 30 minutes from ./temp_rooms/
    2. Deletes any orphaned room caches whose occupants dropped to 0
    """
    while True:
        try:
            now = time.time()
            # 1. Sweep disk files older than 30 minutes (1800 seconds)
            for file_path in TEMP_ROOMS_DIR.glob("*"):
                if file_path.is_file():
                    try:
                        stat = file_path.stat()
                        if now - stat.st_mtime > 1800:
                            file_path.unlink(missing_ok=True)
                    except Exception:
                        pass

            # 2. Cleanup file metadata older than 30 mins from memory
            for room_id in list(manager.room_files.keys()):
                manager.room_files[room_id] = [
                    f for f in manager.room_files[room_id]
                    if now - f.get("timestamp", now) <= 1800
                ]
                if not manager.room_files[room_id] and room_id not in manager.active_rooms:
                    manager.room_files.pop(room_id, None)

        except Exception as err:
            print(f"[CleanupWorker] Error during ephemeral sweep: {err}")

        # Sleep for 60 seconds before next sweep
        await asyncio.sleep(60)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(ephemeral_cleanup_worker())


# ─── Helper Functions ─────────────────────────────────────────────────────────
def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


# ─── HTTP Routes ──────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def lobby(request: Request):
    """Room Lobby: generate or enter a 6-digit room code."""
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/room/{room_id}", response_class=HTMLResponse)
async def room_view(request: Request, room_id: str):
    """Live room view with drag-and-drop zone, file feed, and PDF.js viewer."""
    sanitized_room_id = room_id.strip()
    return templates.TemplateResponse(
        request=request,
        name="room.html",
        context={"room_id": sanitized_room_id}
    )


@app.post("/upload/{room_id}")
async def upload_file_to_room(room_id: str, file: UploadFile = File(...)):
    """
    Standard HTTP POST route for file ingestion.
    Writes file to ./temp_rooms/{room_id}_{uuid}_{filename} in chunks (never blocking event loop).
    Broadcasts 'new_file' metadata over WebSocket to everyone in that room.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing.")

    file_id = str(uuid.uuid4())[:8]
    clean_name = Path(file.filename).name.replace(" ", "_")
    target_filename = f"{room_id}_{file_id}_{clean_name}"
    target_path = TEMP_ROOMS_DIR / target_filename

    # Stream write in 1MB chunks to safely handle large documents
    bytes_written = 0
    try:
        with open(target_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
                bytes_written += len(chunk)
    except Exception as e:
        if target_path.exists():
            target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"File save failure: {str(e)}")

    is_pdf = clean_name.lower().endswith(".pdf") or (file.content_type == "application/pdf")
    formatted_size = format_file_size(bytes_written)

    file_meta = {
        "file_id": file_id,
        "filename": clean_name,
        "size": formatted_size,
        "size_bytes": bytes_written,
        "is_pdf": is_pdf,
        "download_url": f"/download/{room_id}/{file_id}",
        "preview_url": f"/preview/{room_id}/{file_id}" if is_pdf else None,
        "file_path": str(target_path),
        "timestamp": time.time()
    }

    # Store in memory for late-joining participants
    manager.add_file(room_id, file_meta)

    # Broadcast notification to everyone connected to this room
    await manager.broadcast(room_id, {
        "type": "new_file",
        "file_id": file_id,
        "filename": clean_name,
        "size": formatted_size,
        "is_pdf": is_pdf,
        "download_url": f"/download/{room_id}/{file_id}",
        "preview_url": f"/preview/{room_id}/{file_id}" if is_pdf else None,
    })

    return JSONResponse(status_code=200, content={"success": True, "file_id": file_id})


@app.get("/download/{room_id}/{file_id}")
async def download_room_file(room_id: str, file_id: str):
    """Triggers download of the specified file with attachment header."""
    matching_files = list(TEMP_ROOMS_DIR.glob(f"{room_id}_{file_id}_*"))
    if not matching_files or not matching_files[0].exists():
        raise HTTPException(status_code=404, detail="File not found or has expired.")

    target_path = matching_files[0]
    original_filename = target_path.name.replace(f"{room_id}_{file_id}_", "")

    return FileResponse(
        path=str(target_path),
        filename=original_filename,
        media_type="application/octet-stream"
    )


@app.get("/preview/{room_id}/{file_id}")
async def preview_room_file(room_id: str, file_id: str):
    """Streams the PDF with inline Content-Disposition so pdf.js can load it directly."""
    matching_files = list(TEMP_ROOMS_DIR.glob(f"{room_id}_{file_id}_*"))
    if not matching_files or not matching_files[0].exists():
        raise HTTPException(status_code=404, detail="File not found or has expired.")

    target_path = matching_files[0]
    return FileResponse(
        path=str(target_path),
        media_type="application/pdf"
    )


# ─── Native WebSocket Endpoint with Heartbeats ────────────────────────────────
@app.websocket("/ws/{room_id}")
async def websocket_room_endpoint(websocket: WebSocket, room_id: str):
    """
    WebSocket signaling channel for room presence, live participant counts,
    and real-time 'new_file' broadcasts.
    """
    await manager.connect(room_id, websocket)
    try:
        while True:
            # Receive client ping or keep-alive messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        await manager.broadcast(room_id, {
            "type": "user_left",
            "active_count": len(manager.active_rooms.get(room_id, []))
        })
    except Exception:
        manager.disconnect(room_id, websocket)
