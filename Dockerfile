FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install build dependencies
RUN apk add --no-cache python3 make g++

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
RUN apk add --no-cache ffmpeg yt-dlp python3 curl

WORKDIR /spotiarr

# Create downloads directory and set permissions
RUN mkdir -p /downloads && chown -R node:node /downloads /spotiarr

# Copy root configuration with correct ownership
COPY --from=builder --chown=node:node /spotiarr/package.json /spotiarr/pnpm-workspace.yaml /spotiarr/pnpm-lock.yaml /spotiarr/.npmrc ./

# Copy entire src directory with correct ownership
COPY --from=builder --chown=node:node /spotiarr/src/ ./src/

# Switch to non-root user
USER node

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Generate Prisma Client for production
RUN pnpm --filter backend prisma:generate

# Default downloads path inside the container; can be overridden by env if needed
ENV DOWNLOADS_PATH=/downloads

EXPOSE 3000

# Healthcheck to ensure the service is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "pnpm --filter backend prisma:migrate:deploy && pnpm start"]