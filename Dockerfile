FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install build dependencies
# Workaround for busybox trigger error in ARM64 QEMU builds
# The trigger fails but packages install correctly, so we verify installation
RUN apk add --no-cache python3 make g++ || \
    (python3 --version && make --version && g++ --version)

WORKDIR /spotiarr

# Copy configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./

# Copy workspace package.json files for dependency installation
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY apps/ ./apps/
COPY packages/ ./packages/

# Build all packages (backend build runs prisma:generate internally)
RUN pnpm run build

FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install runtime dependencies
# Workaround for busybox trigger error in ARM64 QEMU builds
# The trigger fails but packages install correctly, so we verify installation
RUN apk add --no-cache ffmpeg python3 curl openssl su-exec shadow || \
    (ffmpeg -version && python3 --version && curl --version)

# Install latest yt-dlp directly from core source for best compatibility
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    yt-dlp --version

WORKDIR /spotiarr

# Create downloads directory
RUN mkdir -p /downloads

# Copy root configuration
COPY --chown=node:node --from=builder /spotiarr/package.json /spotiarr/pnpm-workspace.yaml /spotiarr/pnpm-lock.yaml /spotiarr/.npmrc ./

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Copy application artifacts (node_modules, dist, prisma) from builder
COPY --chown=node:node --from=builder /spotiarr/node_modules ./node_modules
COPY --chown=node:node --from=builder /spotiarr/apps ./apps
COPY --chown=node:node --from=builder /spotiarr/packages ./packages

# Default environment variables
ENV NODE_ENV=production
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV DOWNLOADS=/downloads
ENV DATABASE_URL="file:/spotiarr/config/db.sqlite"

EXPOSE 3000

# Healthcheck to ensure the service is running (using -k to ignore self-signed cert errors if https)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["sh", "-c", "pnpm --filter backend prisma:migrate:deploy && pnpm start"]