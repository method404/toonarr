FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium ca-certificates fonts-noto-color-emoji gosu \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd --system appgroup && useradd --system --gid appgroup --create-home appuser
RUN mkdir -p /app/data /app/storage && chown -R appuser:appgroup /app/data /app/storage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY docker/entrypoint.sh /usr/local/bin/toonarr-entrypoint
RUN chmod +x /usr/local/bin/toonarr-entrypoint
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/toonarr-entrypoint"]
