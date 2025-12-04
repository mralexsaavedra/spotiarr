<div align="center">

<a href="https://github.com/mralexsaavedra/spotiarr">
  <img src="assets/logo.svg" alt="SpotiArr Logo" width="160" height="160">
</a>

# SpotiArr

**Self-hosted Spotify downloader with Jellyfin/Plex integration**

[![License](https://img.shields.io/github/license/mralexsaavedra/spotiarr)](LICENSE)
[![Release](https://img.shields.io/github/v/release/mralexsaavedra/spotiarr)](https://github.com/mralexsaavedra/spotiarr/releases)
[![Docker Pulls](https://img.shields.io/docker/pulls/mralexandersaavedra/spotiarr)](https://hub.docker.com/r/mralexandersaavedra/spotiarr)
[![Stars](https://img.shields.io/github/stars/mralexsaavedra/spotiarr)](https://github.com/mralexsaavedra/spotiarr)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/mralexsaavedra)

Download Spotify playlists, albums, and tracks with automatic metadata tagging and Jellyfin-ready folder structure.

[Quick Start](#-quick-start) • [Features](#-features) • [Installation](#-installation) • [Configuration](#%EF%B8%8F-configuration)

</div>

---

## ✨ Features

| Feature                    | Description                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| 🎵 **Smart Downloads**     | Paste any Spotify URL (track/album/playlist) and download with metadata     |
| 🔄 **Auto-Sync Playlists** | Subscribe to playlists for automatic updates when new tracks are added      |
| 📁 **Jellyfin-Ready**      | Organized folder structure (`Playlists/`, `Artist/Album/`) + M3U generation |
| 🎨 **Modern UI**           | Spotify-inspired dark theme with real-time progress tracking                |
| 🏷️ **Rich Metadata**       | Automatic tagging (artist, album, year, cover art embedded + saved)         |
| 🚫 **Duplicate Detection** | Smart checks to avoid re-downloading existing tracks                        |
| 🐳 **Docker First**        | One-command deployment with Redis included                                  |

**Stack:** Express + Prisma + React 18 + Vite + Tailwind + SQLite + Redis + BullMQ

> [!IMPORTANT]  
> **Legal Notice:** Personal use only. Download music you have legal rights to access. The author is not responsible for misuse.

## 🚀 Quick Start

### Prerequisites

1. **Get Spotify API credentials** (free):
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create an app → note your `Client ID` and `Client Secret`
   - **Set redirect URI based on your setup:**
     - **Local development:** `http://127.0.0.1:5173/api/auth/spotify/callback`
     - **Production (Docker):** `https://YOUR_SERVER_IP:3000/api/auth/spotify/callback`
       - Replace `YOUR_SERVER_IP` with your actual server IP
       - ⚠️ **Must use HTTPS** for non-localhost IPs (certificates auto-generated in Docker)

2. **Run with Docker Compose** (recommended):

   Includes Redis + health checks + persistent storage + automatic HTTPS.

```bash
# 1. Clone repo
git clone https://github.com/mralexsaavedra/spotiarr.git && cd spotiarr

# 2. Configure
cp .env.example .env
# Edit .env → add:
#   SPOTIFY_CLIENT_ID=your_client_id
#   SPOTIFY_CLIENT_SECRET=your_client_secret
#   PUBLIC_HOST=your_server_ip

# 3. Start
docker compose up -d
```

3. **Open** → `https://YOUR_SERVER_IP:3000` 🎉
   - Accept the self-signed certificate warning (first time only)
   - Login with Spotify to authorize the app

## 📦 Installation

### Build from Source

**Requirements:** Node.js 24+, pnpm 10+, Redis, FFmpeg, yt-dlp, Python 3.11/3.12

```bash
# 1. Setup
git clone https://github.com/mralexsaavedra/spotiarr.git && cd spotiarr
corepack enable
pnpm install

# 2. Install services (macOS example)
brew install redis ffmpeg yt-dlp
brew services start redis

# 3. Configure
cp .env.example .env
# Edit .env → add Spotify credentials + set REDIS_HOST=localhost

# 4. Run
pnpm dev
# Frontend: http://localhost:5173 (Hot Reload)
# Backend:  http://localhost:3000 (API)
```

**Troubleshooting:** See [CONTRIBUTING.md](CONTRIBUTING.md#having-trouble) for common issues (Redis, better-sqlite3, FFmpeg, yt-dlp).

## ⚙️ Configuration

### Environment Variables

| Variable                | Required | Default        | Description                                                                        |
| ----------------------- | -------- | -------------- | ---------------------------------------------------------------------------------- |
| `SPOTIFY_CLIENT_ID`     | ✅       | -              | Spotify app Client ID                                                              |
| `SPOTIFY_CLIENT_SECRET` | ✅       | -              | Spotify app Client Secret                                                          |
| `PUBLIC_HOST`           | ❌       | `localhost`    | Public hostname or IP (e.g., `X.X.X.X` or `spotiarr.yourdomain.com`)               |
| `SPOTIFY_REDIRECT_URI`  | ❌       | Auto-generated | Override OAuth callback if needed (auto-built from `PUBLIC_HOST`)                  |
| `REDIS_HOST`            | ❌       | `localhost`    | Redis hostname (`redis` for Docker)                                                |
| `REDIS_PORT`            | ❌       | `6379`         | Redis port                                                                         |
| `YT_COOKIES`            | ❌       | -              | YouTube cookies for yt-dlp ([how to get](#youtube-cookies))                        |
| `NODE_ENV`              | ❌       | `development`  | Environment mode (`development` = HTTP, `production` = HTTPS) - auto-set in Docker |
| `DATABASE_URL`          | ❌       | Auto-set       | SQLite database path - auto-configured                                             |

**Note:** Protocol (HTTP/HTTPS) and port are automatic based on `NODE_ENV`:

- **Development:** `http://localhost:5173` (Vite dev server)
- **Production:** `https://PUBLIC_HOST:3000` (with auto-generated SSL certificates)

### In-App Settings

Most options are configured via the **Settings** page (stored in database):

- **Downloads path** → where files are saved
- **Audio format** → mp3, m4a, etc.
- **M3U generation** → auto-create playlist files
- **Download rate limit** → avoid YouTube throttling
- **Playlist sync interval** → how often to check for new tracks (default: 60 min)

### YouTube Cookies

<details>
<summary>How to extract cookies from browser</summary>

1. Visit https://www.youtube.com and log in
2. Open DevTools (F12) → Application/Storage tab
3. Cookies → https://www.youtube.com
4. Copy all cookies as: `NAME1=value1; NAME2=value2; ...`
5. Paste into `YT_COOKIES` env var

</details>

## 📁 File Organization

SpotiArr follows Jellyfin/Plex best practices:

```
downloads/
├── Playlists/
│   └── My Playlist/
│       ├── 01 - Artist - Track.mp3
│       ├── My Playlist.m3u8
│       └── cover.jpg
└── Artist Name/
    └── Album Name/
        ├── 01 - Track.mp3
        └── cover.jpg
```

- **Metadata** embedded in files (artist, album, year, cover)
- **M3U playlists** auto-generated for easy import
- **Cover art** saved as `cover.jpg` + embedded

## 🛠️ Development

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and guidelines.

**Quick commands:**

```bash
pnpm dev       # Backend + frontend
pnpm lint      # ESLint + Prettier
pnpm build     # Production build
```

**Architecture:**

- **Backend:** Express + Prisma + BullMQ + SQLite
- **Frontend:** React 18 + Vite + TanStack Query + Tailwind + Zustand
- **Queue:** Redis + BullMQ for download jobs
- **Processing:** FFmpeg + yt-dlp

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 💬 Support

- 🐛 [Open an issue](https://github.com/mralexsaavedra/spotiarr/issues)
- 💡 [Discussions](https://github.com/mralexsaavedra/spotiarr/discussions)
- ⭐ Star the repo if you find it useful!

## ⚖️ License

[MIT](LICENSE) © [mralexsaavedra](https://github.com/mralexsaavedra)

---

<div align="center">

Made with ❤️ for the self-hosting community

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buymeacoffee)](https://buymeacoffee.com/mralexsaavedra)

</div>
