FROM python:3.10-slim
WORKDIR /app

# Install Ghostscript and QPDF (essential for parsing real progress)
RUN apt-get update && \
    apt-get install -y ghostscript qpdf && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
