[![GitHub License](https://img.shields.io/github/license/mralexsaavedra/spotiarr)](https://github.com/mralexsaavedra/spotiarr)
[![GitHub Repo stars](https://img.shields.io/github/stars/mralexsaavedra/spotiarr)](https://github.com/mralexsaavedra/spotiarr)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/mralexsaavedra/spotiarr)](https://github.com/mralexsaavedra/spotiarr/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/mralexandersaavedra/spotiarr)](https://hub.docker.com/r/mralexandersaavedra/spotiarr)

![spotiarr logo](assets/logo.svg)

# SpotiArr - Self-hosted Spotify Downloader

> **Lidarr-inspired music automation. Download and organize your Spotify playlists with smart file management for Jellyfin/Plex integration.**

SpotiArr bridges the gap between Spotify and your personal media server. Download tracks, albums, and entire playlists with automatic metadata tagging, smart folder organization, and native Jellyfin compatibility. Perfect for music enthusiasts who want complete control over their music collection.

## ✨ Key Features

### 🎵 **Smart Music Management**

- Download tracks, albums, and playlists from Spotify URLs
- Automatic metadata tagging (artist, album, year, cover art)
- Subscribe to playlists for automatic updates when new tracks are added
- Smart duplicate detection

### 📁 **Jellyfin-Ready Organization**

- Automatic folder structure following Jellyfin best practices
- Separate organization for playlists vs. albums
- Automatic M3U8 playlist generation for easy imports
- Cover art embedded in files and saved as `cover.jpg`

### 🎨 **Modern User Interface**

- Spotify-inspired dark mode design
- Real-time download progress tracking
- Multiple artist support with clickable profile links
- Responsive design for desktop and mobile

### 🔗 **Ecosystem Integration**

- Native Jellyfin compatibility
- Works with Navidrome, Plex, and other media servers
- \*ARR ecosystem ready (Radarr, Sonarr, Lidarr patterns)
- Docker support for easy deployment

**Tech Stack:** NestJS (Backend) + Angular 19 (Frontend) + Tailwind CSS + SQLite + Redis

> [!IMPORTANT]
> **Legal Notice:** This tool is intended for personal use only. Download only music you have legal rights to access. The author is not responsible for any misuse of this software.

## 🚀 Quick Start

```bash
# Using Docker (recommended)
docker run -d -p 3000:3000 \
  -v /path/to/music:/spotiarr/downloads \
  -e SPOTIFY_CLIENT_ID=your_client_id \
  -e SPOTIFY_CLIENT_SECRET=your_client_secret \
  mralexandersaavedra/spotiarr:latest
```

Then open http://localhost:3000 in your browser!

## 📚 Table of Contents

- [SpotiArr - Self-hosted Spotify Downloader](#spotiarr---self-hosted-spotify-downloader)
  - [✨ Key Features](#-key-features)
    - [🎵 **Smart Music Management**](#-smart-music-management)
    - [📁 **Jellyfin-Ready Organization**](#-jellyfin-ready-organization)
    - [🎨 **Modern User Interface**](#-modern-user-interface)
    - [🔗 **Ecosystem Integration**](#-ecosystem-integration)
  - [🚀 Quick Start](#-quick-start)
  - [📚 Table of Contents](#-table-of-contents)
  - [🚀 Installation](#-installation)
    - [Spotify App Configuration](#spotify-app-configuration)
    - [Docker](#docker)
      - [Docker command](#docker-command)
      - [Docker compose (Recommended)](#docker-compose-recommended)
    - [Build from source](#build-from-source)
      - [Requirements](#requirements)
      - [Process](#process)
      - [Troubleshooting](#troubleshooting)
    - [Environment variables](#environment-variables)
    - [How to get your YouTube cookies (using browser dev tools):](#how-to-get-your-youtube-cookies-using-browser-dev-tools)
    - [🎵 M3U Playlist Generation](#-m3u-playlist-generation)
  - [📺 Jellyfin Integration](#-jellyfin-integration)
  - [🛠️ Development](#️-development)
    - [Project Structure](#project-structure)
    - [Tech Stack](#tech-stack)
    - [Available Scripts](#available-scripts)
    - [Development Workflow](#development-workflow)
  - [🤝 Contributing](#-contributing)
  - [📝 Changelog](#-changelog)
  - [💬 Support](#-support)
  - [⭐ Show Your Support](#-show-your-support)
- [⚖️ License](#️-license)

## 🚀 Installation

Recommended and the easiest way how to start to use of SpotiArr is using docker.

### Spotify App Configuration

To fully use SpotiArr, you need to create an application in the Spotify Developer Dashboard:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Sign in with your Spotify account
3. Create a new application
4. Note your `Client ID` and `Client Secret`
5. Configure the redirect URI to `http://localhost:3000/api/callback` (or the corresponding URL of your instance)

These credentials will be used by SpotiArr to access the Spotify API.

### Docker

Just run docker command or use docker compose configuration.
For detailed configuration, see available [environment variables](#environment-variables).

#### Docker command

```shell
docker run -d -p 3000:3000 \
  -v /path/to/downloads:/spotiarr/downloads \
  -e SPOTIFY_CLIENT_ID=your_client_id \
  -e SPOTIFY_CLIENT_SECRET=your_client_secret \
  mralexandersaavedra/spotiarr:latest
```

#### Docker compose (Recommended)

A complete `docker-compose.yml` is included in the repository with Redis:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your Spotify credentials
# REDIS_HOST=redis (already set for Docker)

# 3. Start services (uses DockerHub image)
docker-compose up -d

# OR for local development (builds from source)
docker-compose -f docker-compose.dev.yml up -d
```

The compose file includes Redis, resource limits, health checks, and persistent volumes.

### Build from source

SpotiArr can be also build from source files on your own.

#### Requirements

- Node.js v24 LTS (use `nvm` to install: `nvm install 24`)
- pnpm v9+ (`npm install -g pnpm`)
- Redis (for queue management)
- FFmpeg (for audio processing)
- yt-dlp (for downloading from YouTube)
- Python 3.11 or 3.12 (required for native module compilation)

#### Process

1. **Install Node.js v24 LTS**: `nvm install && nvm use`
2. **Install pnpm globally** (if not installed): `npm install -g pnpm`
3. **Clone the repository**:
   ```bash
   git clone https://github.com/mralexsaavedra/spotiarr.git
   cd spotiarr
   ```
4. **Install dependencies**: `pnpm install`
5. **Configure environment**:

   ```bash
   # Copy template to root
   cp .env.example .env

   # Edit .env:
   # 1. Add your Spotify credentials
   # 2. Change REDIS_HOST=redis to REDIS_HOST=localhost (important!)
   ```

6. **Install system dependencies**:

   ```bash
   # macOS (Homebrew)
   brew install redis ffmpeg yt-dlp
   brew services start redis

   # Linux (Ubuntu/Debian)
   sudo apt update
   sudo apt install redis-server ffmpeg
   pip install yt-dlp
   sudo systemctl start redis

   # Or use Docker for Redis
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

7. **Start development servers**:

   ```bash
   # Option 1: Start both backend and frontend together
   pnpm dev

   # Option 2: Start separately in different terminals
   pnpm start:be  # Backend at http://localhost:3000
   pnpm start:fe  # Frontend at http://localhost:4200
   ```

8. **Build for production**:
   ```bash
   pnpm build  # Output in dist/ folder
   pnpm start  # Start production server
   ```

#### Troubleshooting

**Error: `ENOTFOUND redis`**

- For local development, ensure `REDIS_HOST=localhost` in `.env`
- Start Redis locally or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`
- For Docker Compose, use `REDIS_HOST=redis`

**Issue: better-sqlite3 compilation errors**

- Ensure Python 3.11 or 3.12 is installed (Python 3.13+ won't work)
- Run: `pnpm rebuild better-sqlite3`
- If still failing, try: `pnpm rebuild better-sqlite3 --config.ignore-scripts=false`

**Issue: Redis connection errors**

- Make sure Redis is running: `redis-server` or via Docker
- Check `REDIS_HOST` and `REDIS_PORT` in your `.env` file
- For local dev use `REDIS_HOST=localhost`, for Docker use `REDIS_HOST=redis`

**Issue: FFmpeg not found**

- macOS: `brew install ffmpeg`
- Ubuntu/Debian: `sudo apt install ffmpeg`
- Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

**Issue: yt-dlp not found**

- The application auto-detects yt-dlp from your PATH
- macOS: `brew install yt-dlp`
- Linux: `pip install yt-dlp` or `sudo apt install yt-dlp`
- If needed, set `YT_DLP_PATH` in `.env` to specify a custom location

### Environment variables

Some behaviour and settings of SpotiArr can be configured using environment variables and `.env` file.

| Name                    | Default            | Description                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOWNLOADS_PATH          | `./downloads`      | Path where downloaded files will be stored (relative to project root)                                                                                                                                                                                       |
| FORMAT                  | `mp3`              | Format of downloaded files (currently fully supported only `mp3` but you can try whatever you want from [ffmpeg](https://ffmpeg.org/ffmpeg-formats.html#Muxers))                                                                                            |
| PORT                    | 3000               | Port of SpotiArr server                                                                                                                                                                                                                                     |
| REDIS_PORT              | 6379               | Port of Redis server                                                                                                                                                                                                                                        |
| REDIS_HOST              | localhost          | Host of Redis server                                                                                                                                                                                                                                        |
| SPOTIFY_CLIENT_ID       | your_client_id     | Client ID of your Spotify application (required)                                                                                                                                                                                                            |
| SPOTIFY_CLIENT_SECRET   | your_client_secret | Client Secret of your Spotify application (required)                                                                                                                                                                                                        |
| YT_DOWNLOADS_PER_MINUTE | 3                  | Set the maximum number of YouTube downloads started per minute                                                                                                                                                                                              |
| YT_COOKIES              |                    | Allows you to pass your YouTube cookies to bypass some download restrictions. See [below](#how-to-get-your-youtube-cookies) for instructions.                                                                                                               |
| YT_DLP_PATH             |                    | Custom path to yt-dlp binary (auto-detected from PATH if not set)                                                                                                                                                                                           |
| M3U_GENERATION_ENABLED  | `true`             | Enable/disable automatic M3U playlist generation. When enabled, M3U8 playlist files are automatically created for Spotify playlists (not for albums or single tracks). These playlists are compatible with Jellyfin, VLC, and other M3U-compatible players. |

### How to get your YouTube cookies (using browser dev tools):

1. Go to https://www.youtube.com and log in if needed.
2. Open the browser developer tools (F12 or right click > Inspect).
3. Go to the "Application" tab (in Chrome) or "Storage" (in Firefox).
4. In the left menu, find "Cookies" and select https://www.youtube.com.
5. Copy all the cookies (name=value) and join them with a semicolon and a space, like:
   VISITOR_INFO1_LIVE=xxxx; YSC=xxxx; SID=xxxx; ...
6. Paste this string into the YT_COOKIES environment variable (in your .env or Docker config).

### 🎵 M3U Playlist Generation

SpotiArr automatically generates M3U8 playlist files when downloading playlists from Spotify.

## 📺 Jellyfin Integration

SpotiArr organizes your music library following Jellyfin's recommended structure:

- **Playlists:** `downloads/Playlists/PlaylistName/01 - Artist - Track.mp3`
- **Albums:** `downloads/Artist/Album/01 - Track.mp3`
- **Cover Art:** Automatically saved as `cover.jpg` in each folder
- **M3U Files:** Generated for playlists for easy import

For detailed setup instructions, see [JELLYFIN_SETUP.md](JELLYFIN_SETUP.md)

## 🛠️ Development

### Project Structure

```
spotiarr/
├── src/
│   ├── backend/          # NestJS backend
│   │   ├── src/
│   │   │   ├── playlist/ # Playlist management
│   │   │   ├── track/    # Track downloads & processing
│   │   │   └── shared/   # Shared services (Spotify, YouTube, etc.)
│   └── frontend/         # Angular 19 frontend
├── assets/               # Static assets (logo, etc.)
└── dist/                 # Build output
```

### Tech Stack

- **Backend**: NestJS, TypeORM, BullMQ, better-sqlite3
- **Frontend**: Angular 19, Tailwind CSS, RxJS
- **Processing**: FFmpeg, ytdlp-nodejs
- **Storage**: SQLite, Redis

### Available Scripts

```bash
pnpm dev          # Run backend and frontend concurrently
pnpm start:be     # Run backend in watch mode
pnpm start:fe     # Run frontend dev server
pnpm build        # Build both backend and frontend
pnpm lint         # Lint all workspaces
pnpm format       # Format all files with Prettier
```

### Development Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Test locally: `pnpm dev`
4. Run linters: `pnpm lint`
5. Build: `pnpm build`
6. Create a Pull Request

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.

## 💬 Support

If you encounter any issues or have questions:

- Open an [issue](https://github.com/mralexsaavedra/spotiarr/issues)
- Check existing issues for solutions
- Read the [Jellyfin Integration Guide](JELLYFIN_SETUP.md)

## ⭐ Show Your Support

If you find SpotiArr useful, please consider giving it a star on GitHub! It helps the project gain visibility and encourages further development.

# ⚖️ License

[MIT](https://choosealicense.com/licenses/mit/)
