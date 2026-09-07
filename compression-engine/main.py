from fastapi import FastAPI, UploadFile, File
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from worker import compress_pdf_task
import redis
import os
import asyncio

app = FastAPI()
r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), port=int(os.getenv('REDIS_PORT', 6379)), db=0, decode_responses=True)

os.makedirs("uploads", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    input_path = f"uploads/{file.filename}"
    output_path = f"outputs/compressed_{file.filename}"
    
    with open(input_path, "wb") as buffer:
        buffer.write(await file.read())
        
    # Send task to the Redis queue, allowing the API to immediately respond
    task = compress_pdf_task.delay(input_path, output_path)
    return {"task_id": task.id, "filename": file.filename}

@app.get("/status/{task_id}")
async def get_status(task_id: str):
    # Streams real-time progress updates back to the browser
    async def event_stream():
        while True:
            progress = r.get(f"progress:{task_id}")
            if progress:
                yield f"data: {progress}\n\n"
                if progress == "100" or progress == "error":
                    break
            await asyncio.sleep(0.5)
            
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/download/{filename}")
async def download(filename: str):
    return FileResponse(f"outputs/compressed_{filename}")

@app.get("/")
async def root():
    with open("index.html", "r") as f:
        return HTMLResponse(f.read())
