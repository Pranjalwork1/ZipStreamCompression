# ZipStream Cloudflare OCR Container
# Pinned to stable, production-tested OCRmyPDF base image
FROM jbarlow83/ocrmypdf:v16.10.1

USER root

# Install additional Tesseract language packs:
# - eng: English (default)
# - hin: Hindi (Devanagari script support)
# - osd: Orientation and Script Detection (required for --rotate-pages)
# - fra: French
# - deu: German
# - spa: Spanish
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-osd \
    tesseract-ocr-fra \
    tesseract-ocr-deu \
    tesseract-ocr-spa \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /tmp/zipstream-ocr \
    && chown -R 1000:1000 /tmp/zipstream-ocr

# Copy container HTTP orchestration server
WORKDIR /app
COPY server.py /app/server.py
RUN chown -R 1000:1000 /app

# Run as non-root user (UID 1000 from base image)
USER 1000

ENV PORT=8080
ENV PYTHONUNBUFFERED=1
ENV TEMP_DIR=/tmp/zipstream-ocr

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["python3", "/app/server.py"]
