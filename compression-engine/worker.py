import os
import re
import subprocess
from celery import Celery
import redis

# Connect to Redis Message Queue
r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), port=int(os.getenv('REDIS_PORT', 6379)), db=0, decode_responses=True)
redis_url = f"redis://{os.getenv('REDIS_HOST', 'redis')}:{os.getenv('REDIS_PORT', 6379)}/0"
celery = Celery('tasks', broker=redis_url, backend=redis_url)

def get_total_pages(file_path):
    # Instantly grabs the total page count before compression starts
    result = subprocess.run(["qpdf", "--show-npages", file_path], capture_output=True, text=True)
    return int(result.stdout.strip()) if result.returncode == 0 else 1

@celery.task(bind=True)
def compress_pdf_task(self, input_path, output_path):
    task_id = self.request.id
    r.set(f"progress:{task_id}", "0")
    total_pages = get_total_pages(input_path)
    
    # Notice we REMOVED -dQUIET so Ghostscript prints "Page 1", "Page 2"
    cmd = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dPDFSETTINGS=/ebook", # Compresses images to 150dpi
        "-dNOPAUSE",
        "-dBATCH",
        "-dBufferSpace=1000000000", # Protects RAM during cross-reference mapping
        f"-sOutputFile={output_path}",
        input_path
    ]
    
    # Read the output line by line as Ghostscript works
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    for line in process.stdout:
        match = re.search(r"Page\s+(\d+)", line)
        if match:
            current_page = int(match.group(1))
            # Ghostscript takes ~10% of total time at the end to write the file map.
            # We scale visual progress to max out at 90% until it actually finishes.
            progress = int((current_page / total_pages) * 90)
            r.set(f"progress:{task_id}", str(progress))
            
    process.wait()
    
    if process.returncode == 0:
        r.set(f"progress:{task_id}", "100") # Truly finished
        return {"status": "success", "file": output_path}
    else:
        r.set(f"progress:{task_id}", "error")
        return {"status": "error"}
