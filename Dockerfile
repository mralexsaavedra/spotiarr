FROM node:23.10.0-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /spotiarr
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY src/backend/package.json ./src/backend/
COPY src/frontend/package.json ./src/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the project
RUN pnpm run build

FROM node:23.10.0-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Install runtime dependencies (ffmpeg for audio processing)
RUN apk add --no-cache ffmpeg

WORKDIR /spotiarr

# Copy built files
COPY --from=builder /spotiarr/dist ./dist
COPY --from=builder /spotiarr/package.json ./package.json
COPY --from=builder /spotiarr/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /spotiarr/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /spotiarr/src/backend/package.json ./src/backend/package.json

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["node", "dist/backend/main.js"]