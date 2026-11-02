FROM node:22-bookworm-slim

# Install system dependencies: Python, pip, FFmpeg, curl, and certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    ca-certificates \
    && ln -s /usr/bin/python3 /usr/bin/python || true \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp standalone binary and symlink across all standard binary paths
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && ln -sf /usr/local/bin/yt-dlp /usr/bin/yt-dlp \
    && ln -sf /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl \
    && ln -sf /usr/local/bin/yt-dlp /usr/bin/youtube-dl \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp || true

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install npm production dependencies
RUN npm install --omit=dev

# Copy project files
COPY . .

# Create persistent storage folder for SQLite database
RUN mkdir -p /app/data

# Default port (7860 is Hugging Face Spaces default; Render/Koyeb inject $PORT)
ENV PORT=7860
EXPOSE 7860

# Run WaveMusic
CMD ["npm", "start"]
