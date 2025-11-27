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

# Build all packages
RUN pnpm run build

FROM node:24-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install runtime dependencies
RUN apk add --no-cache ffmpeg yt-dlp python3

WORKDIR /spotiarr

# Copy root configuration
COPY --from=builder /spotiarr/package.json /spotiarr/pnpm-workspace.yaml /spotiarr/pnpm-lock.yaml /spotiarr/.npmrc ./

# Copy entire src directory (includes all package.json and dist folders)
COPY --from=builder /spotiarr/src/ ./src/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Default downloads path inside the container; can be overridden by env if needed
ENV DOWNLOADS_PATH=/downloads

EXPOSE 3000
CMD ["pnpm", "start"]