FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

# Install build dependencies
# Workaround for busybox trigger error in ARM64 QEMU builds
# The trigger fails but packages install correctly, so we verify installation
RUN apk add --no-cache python3 make g++ || \
    (python3 --version && make --version && g++ --version)

WORKDIR /spotiarr

# Copy configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

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

# Produce a production-only node_modules deployment (no devDependencies).
# pnpm deploy copies the workspace package with its production deps into
# a standalone directory, so the final image ships only runtime packages.
RUN pnpm --filter backend deploy --prod --legacy /spotiarr/prod-deploy

FROM node:22-alpine

# Pre-cache pnpm in a system-wide corepack store. The entrypoint sets
# COREPACK_HOME=/usr/local/share/corepack before su-exec so the shim
# finds the cached binary without attempting any download at startup.
RUN corepack enable && \
    COREPACK_HOME=/usr/local/share/corepack corepack prepare pnpm@10.20.0 --activate && \
    chmod -R a+r /usr/local/share/corepack

# Install runtime dependencies
# Workaround for busybox trigger error in ARM64 QEMU builds
# The trigger fails but packages install correctly, so we verify installation
RUN apk add --no-cache ffmpeg python3 curl openssl su-exec shadow || \
    (ffmpeg -version && python3 --version && curl --version)

# Install a pinned yt-dlp release for reproducible builds.
# Bump YTDLP_VERSION to update (kept current via Dependabot/Renovate).
ARG YTDLP_VERSION=2026.06.09
RUN curl -L "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp" -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    yt-dlp --version

WORKDIR /spotiarr

# Create downloads directory and a writable config dir for the node user
RUN mkdir -p /downloads /spotiarr/config && chown node:node /spotiarr/config

# Copy root configuration
COPY --chown=node:node --from=builder /spotiarr/package.json /spotiarr/pnpm-workspace.yaml /spotiarr/pnpm-lock.yaml ./

# Copy entrypoint script
COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Copy built artifacts only — keep TS source and tests out of the runtime image.
# Selective COPY ships only node_modules, compiled dist, and the Prisma
# schema/migrations, reducing image size and attack surface.
# node_modules comes from the pnpm deploy output (production deps only —
# devDependencies such as pino-pretty, vitest, and tsc-alias are excluded).
COPY --chown=node:node --from=builder /spotiarr/prod-deploy/node_modules ./apps/backend/node_modules
COPY --chown=node:node --from=builder /spotiarr/apps/backend/package.json ./apps/backend/
COPY --chown=node:node --from=builder /spotiarr/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node --from=builder /spotiarr/apps/backend/prisma ./apps/backend/prisma
# The Playwright real-stack harness is build-time test tooling; drop it from prod.
RUN rm -rf /spotiarr/apps/backend/dist/testing
COPY --chown=node:node --from=builder /spotiarr/apps/frontend/package.json ./apps/frontend/
COPY --chown=node:node --from=builder /spotiarr/apps/frontend/dist ./apps/frontend/dist
COPY --chown=node:node --from=builder /spotiarr/packages/shared/package.json ./packages/shared/
COPY --chown=node:node --from=builder /spotiarr/packages/shared/dist ./packages/shared/dist

# Prisma writes engine binaries at startup; make those dirs world-writable
# so they work when PUID != 1000 (the build uid).
RUN find /spotiarr/apps/backend/node_modules -name "engines" -path "*/@prisma/*" -type d \
    -exec chmod a+w {} + 2>/dev/null || true

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