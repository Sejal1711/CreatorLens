FROM node:20-slim

# Install Python + yt-dlp + ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    --no-install-recommends && \
    pip3 install --break-system-packages yt-dlp && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build with memory limit
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=460
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["node", ".next/standalone/server.js"]
