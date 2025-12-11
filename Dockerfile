FROM node:24-alpine AS builder

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
COPY src/backend/package.json ./src/backend/
COPY src/frontend/package.json ./src/frontend/
COPY src/shared/package.json ./src/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY src/ ./src/

# Build all packages (backend build runs prisma:generate internally)
RUN pnpm run build

FROM node:24-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install runtime dependencies
# Workaround for busybox trigger error in ARM64 QEMU builds
# The trigger fails but packages install correctly, so we verify installation
RUN apk add --no-cache ffmpeg yt-dlp python3 curl openssl su-exec shadow || \
    (ffmpeg -version && yt-dlp --version && python3 --version && curl --version)

WORKDIR /spotiarr

# Create downloads directory
RUN mkdir -p /downloads

# Copy root configuration
COPY --from=builder /spotiarr/package.json /spotiarr/pnpm-workspace.yaml /spotiarr/pnpm-lock.yaml /spotiarr/.npmrc ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Copy entire src directory
COPY --from=builder /spotiarr/src/ ./src/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Generate Prisma Client for production
RUN pnpm --filter backend prisma:generate

# Default environment variables
ENV NODE_ENV=production
ENV PUBLIC_HOST=0.0.0.0
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV DOWNLOADS_PATH=/downloads
ENV DATABASE_URL="file:/spotiarr/config/db.sqlite"

EXPOSE 3000

# Healthcheck to ensure the service is running (using -k to ignore self-signed cert errors if https)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f -k http://localhost:3000/api/health || curl -f -k https://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["sh", "-c", "pnpm --filter backend prisma:migrate:deploy && pnpm start"]