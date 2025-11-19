[![GitHub License](https://img.shields.io/github/license/mralexsaavedra/spotiarr)](https://github.com/mralexsaavedra/spotiarr)
[![GitHub Repo stars](https://img.shields.io/github/stars/mralexsaavedra/spotiarr)](https://github.com/mralexsaavedra/spotiarr)

![spotiarr logo](assets/logo.svg)
# SpotiArr - Self-hosted Spotify Downloader

SpotiArr is a self-hosted Spotify downloader with media server integration and *ARR compatibility.
Download tracks, playlists, and albums from Spotify URLs with automatic metadata tagging.
Subscribe to playlists to automatically download new releases.
Perfect for integration with media servers (Jellyfin, Navidrome, etc) and the *ARR ecosystem (Radarr, Sonarr, etc).

**Features:**
- 🎵 Download tracks, albums, and playlists from Spotify URLs
- 🔄 Subscribe to playlists for automatic updates
- 🎨 Modern Spotify-inspired UI with dark mode
- 📦 Multiple artist support with individual profile links
- 🏷️ Automatic metadata tagging for media server compatibility
- 🔗 Integration-ready for *ARR ecosystem

Built with NestJS and Angular 19 with Tailwind CSS.

> [!IMPORTANT]
> Please do not use this tool for piracy! Download only music you own rights! Use this tool only on your responsibility.

### Content
- [SpotiArr - Self-hosted Spotify Downloader](#spotiarr---self-hosted-spotify-downloader)
    - [Content](#content)
  - [🚀 Installation](#-installation)
    - [Spotify App Configuration](#spotify-app-configuration)
    - [Docker](#docker)
      - [Docker command](#docker-command)
      - [Docker compose](#docker-compose)
    - [Build from source](#build-from-source)
      - [Requirements](#requirements)
      - [Process](#process)
    - [Environment variables](#environment-variables)
    - [How to get your YouTube cookies (using browser dev tools):](#how-to-get-your-youtube-cookies-using-browser-dev-tools)
    - [🎵 M3U Playlist Generation](#-m3u-playlist-generation)
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
  -v /path/to/downloads:/spotiarr/backend/downloads \
  -e SPOTIFY_CLIENT_ID=your_client_id \
  -e SPOTIFY_CLIENT_SECRET=your_client_secret \
  mralexandersaavedra/spotiarr:latest
```

#### Docker compose
```yaml
services:
  spotiarr:
    image: mralexandersaavedra/spotiarr:latest
    container_name: spotiarr
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /path/to/downloads:/spotiarr/backend/downloads
    environment:
      - SPOTIFY_CLIENT_ID=your_client_id
      - SPOTIFY_CLIENT_SECRET=your_client_secret
      # Configure other environment variables if needed
```

### Build from source

SpotiArr can be also build from source files on your own.

#### Requirements
- Node v18.19.1 (it is recommended to use `nvm` node version manager to install proper version of node)
- Redis in memory cache
- Ffmpeg
- Python3

#### Process
- install Node v18.19.1 using `nvm install` and use that node version `nvm use`
- from project root install all dependencies using `npm install`
- copy `.env.default` as `.env` in `src/backend` folder and modify desired environment properties (see [environment variables](#environment-variables))
- add your Spotify application credentials to the `.env` file:
  ```
  SPOTIFY_CLIENT_ID=your_client_id
  SPOTIFY_CLIENT_SECRET=your_client_secret
  ```
- build source files `npm run build`
    - built project will be stored in `dist` folder
- start server `npm run start`

### Environment variables

Some behaviour and settings of SpotiArr can be configured using environment variables and `.env` file.

 Name                 | Default                                     | Description                                                                                                                                                      |
----------------------|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
 DB_PATH              | `./config/db.sqlite` (relative to backend)  | Path where SpotiArr database will be stored                                                                                                                        |
 FE_PATH              | `../frontend/browser` (relative to backend) | Path to frontend part of application                                                                                                                             |
 DOWNLOADS_PATH       | `./downloads` (relative to backend)         | Path where downaloded files will be stored                                                                                                                       |
 FORMAT               | `mp3`                                       | Format of downloaded files (currently fully supported only `mp3` but you can try whatever you want from [ffmpeg](https://ffmpeg.org/ffmpeg-formats.html#Muxers)) |
 PORT                 | 3000                                        | Port of SpotiArr server                                                                                                                                            |
 REDIS_PORT           | 6379                                        | Port of Redis server                                                                                                                                             |
 REDIS_HOST           | localhost                                   | Host of Redis server                                                                                                                                             |
 RUN_REDIS            | false                                       | Whenever Redis server should be started from backend (recommended for Docker environment)                                                                        |
 SPOTIFY_CLIENT_ID    | your_client_id                              | Client ID of your Spotify application (required)                                                                                                                  |
 SPOTIFY_CLIENT_SECRET| your_client_secret                          | Client Secret of your Spotify application (required)                                                                                                              |
 YT_DOWNLOADS_PER_MINUTE | 3                                           | Set the maximum number of YouTube downloads started per minute                                                                                                  |
 YT_COOKIES           |                                             | Allows you to pass your YouTube cookies to bypass some download restrictions. See [below](#how-to-get-your-youtube-cookies) for instructions.                   |
 M3U_GENERATION_ENABLED | `true` | Enable/disable automatic M3U playlist generation. When enabled, M3U8 playlist files are automatically created for Spotify playlists (not for albums or single tracks). These playlists are compatible with Jellyfin, VLC, and other M3U-compatible players. |


### How to get your YouTube cookies (using browser dev tools):
1. Go to https://www.youtube.com and log in if needed.
2. Open the browser developer tools (F12 or right click > Inspect).
3. Go to the "Application" tab (in Chrome) or "Storage" (in Firefox).
4. In the left menu, find "Cookies" and select https://www.youtube.com.
5. Copy all the cookies (name=value) and join them with a semicolon and a space, like:
   VISITOR_INFO1_LIVE=xxxx; YSC=xxxx; SID=xxxx; ...
6. Paste this string into the YT_COOKIES environment variable (in your .env or Docker config).

### 🎵 M3U Playlist Generation
Spooty automatically generates M3U8 playlist files when downloading playlists from Spotify

# ⚖️ License
[MIT](https://choosealicense.com/licenses/mit/)
