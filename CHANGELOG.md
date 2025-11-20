# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-20

Initial public release of SpotiArr - Self-hosted Spotify downloader with Jellyfin/Plex integration.

### 🎯 Core Features

- **Playlist Management**: Sync Spotify playlists via URL, automatic track discovery
- **Download System**: Parallel track downloads with BullMQ queues and Redis
- **Real-time Updates**: WebSocket integration for live download progress
- **Media Server Integration**: Automatic M3U playlist generation for Jellyfin/Plex
- **Web Interface**: Modern React 18 + Vite frontend with real-time status updates
- **Docker Support**: Complete Docker Compose setup for production deployment

### 🛠️ Technical Stack

- **Backend**: NestJS with TypeORM, BullMQ, Socket.io, better-sqlite3
- **Frontend**: React 18 + Vite, Tailwind CSS, TanStack Query
- **Runtime**: Node.js 24 LTS, pnpm 10.20.0
- **Infrastructure**: Docker multi-stage builds, Redis for job queues
- **Download Tools**: yt-dlp with auto-detection, ffmpeg for audio processing

### 🏗️ Architecture & Code Quality

- **DTOs with Validation**: Created `CreatePlaylistDto`, `UpdatePlaylistDto`, `CreateTrackDto`, and `UpdateTrackDto` with class-validator decorators for automatic input validation
- **Global Exception Filter**: Centralized error handling with `AllExceptionsFilter` providing standardized error responses with timestamps, paths, and detailed logging
- **WebSocket Gateways**: Separated WebSocket logic into dedicated `PlaylistGateway` and `TrackGateway` classes for better separation of concerns
- **Global ValidationPipe**: Added automatic DTO validation with `transform`, `whitelist`, and `forbidNonWhitelisted` options in `main.ts`
- **Repository Pattern**: Implemented `IPlaylistRepository`/`PlaylistRepository` and `ITrackRepository`/`TrackRepository` to abstract TypeORM operations from business logic
- **TrackFileHelper**: Extracted file naming and path logic (`getTrackFileName()`, `getFolderName()`) into dedicated helper class for better reusability and testing
- **Use Cases Pattern**:
  - `CreatePlaylistUseCase`: Encapsulates complete playlist creation workflow including Spotify integration, track fetching, and parallel track processing
  - `SearchTrackOnYoutubeUseCase`: Encapsulates YouTube search logic with status management, error handling, and download queue integration
  - `DownloadTrackUseCase`: Encapsulates complete download workflow including validation, YouTube download, cover art embedding, album/artist/playlist cover saving, and M3U generation
  - Services simplified to thin orchestration layers, reducing complexity by ~270 lines across multiple methods
- **Layered Architecture**: Clean separation with Controllers → Services (orchestration) → Use Cases (business logic) → Repositories (data access) → Entities
- **Error Handling**: Standardized error handling across all services using `HttpException`, `Logger`, and proper error typing
- **Testability**: Business logic isolated in use cases, making unit testing straightforward without mocking complex dependencies
- **Maintainability**: Single Responsibility Principle applied - each use case handles one specific business operation

### 🔧 Development Features

- **Pre-commit Hooks**: Automatic linting with husky + lint-staged
- **Code Quality**: ESLint + Prettier configured across all workspaces
- **Monorepo**: pnpm workspaces for backend and frontend
- **Scripts**: Format, lint, build, and dev commands for all workspaces
- **Hot Reload**: Concurrent backend/frontend development with `pnpm dev`

### 📦 Dependencies

- **Added**: `class-validator@^0.14.2`, `class-transformer@^0.5.1` for DTO validation
- **Optimized**: Removed 9 unused dependencies (fluent-ffmpeg, rxjs, test tools, build tools)
- **Upgraded**: TypeScript ESLint to v8 for TypeScript 5.6 support
- **Consolidated**: Testing infrastructure (removed Jest, Karma, Jasmine)

### 🐳 Docker & DevOps

- Multi-stage Dockerfile with Node.js 24-alpine
- Complete Docker Compose setup (main, override, dev configurations)
- GitHub Actions workflow for automated Docker Hub publishing
- Multi-platform support (linux/amd64, linux/arm64)

### 📚 Documentation

- Comprehensive README with installation and usage guides
- CONTRIBUTING guide with development setup and best practices
- Jellyfin setup guide for media server integration
- Troubleshooting sections for common issues (yt-dlp, Redis, FFmpeg, SQLite)

### 🎨 UI/UX

- Custom favicon and app icons (multiple sizes for all platforms)
- PWA manifest with SpotiArr branding
- Responsive design with Tailwind CSS
- Real-time progress tracking for downloads

### 🔐 Configuration

- Single `.env` file for all configuration (consolidated from 3 files)
- Environment variable validation
- Auto-detection of yt-dlp binary path
- Configurable download paths and Redis connection

### 📝 Project Metadata

- Updated project description: "Lidarr-inspired music automation"
- Proper LICENSE (MIT)
- Comprehensive keywords for discoverability
- Repository metadata and contribution guidelines
- Updated all documentation from npm to pnpm commands
