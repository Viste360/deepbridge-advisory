FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends clamav ca-certificates \
  && freshclam \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json server.js ./

ENV PORT=8080
USER node
CMD ["node", "server.js"]
