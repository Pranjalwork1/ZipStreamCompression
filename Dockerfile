FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ghostscript \
     ffmpeg \
     libreoffice-writer \
     libreoffice-core \
     fonts-liberation \
     fonts-dejavu-core \
     ca-certificates \
     curl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/storage/uploads /data/storage/compressed /data/storage/word-uploads /data/storage/word-converted

WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
