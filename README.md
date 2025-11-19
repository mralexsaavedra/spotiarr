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
- [🚀 Installation](#-installation)
  - [Spotify App Configuration](#spotify-app-configuration)
  - [Docker](#docker)
    - [Docker command](#docker-command)
    - [Docker compose](#docker-compose)
  - [Build from source](#build-from-source)
    - [Process](#requirements)
    - [Requirements](#process)
  - [Environment variables](#environment-variables)
- [⚖️ License](#-license)

## 🚀 Installation
Recommended and the easiest way how to start to use of Spooty is using docker.

### Spotify App Configuration

To fully use Spooty, you need to create an application in the Spotify Developer Dashboard:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Sign in with your Spotify account
3. Create a new application
4. Note your `Client ID` and `Client Secret`
5. Configure the redirect URI to `http://localhost:3000/api/callback` (or the corresponding URL of your instance)

These credentials will be used by Spooty to access the Spotify API.

### Docker

Just run docker command or use docker compose configuration.
For detailed configuration, see available [environment variables](#environment-variables).

#### Docker command
```shell
docker run -d -p 3000:3000 \
  -v /path/to/downloads:/spooty/backend/downloads \
  -e SPOTIFY_CLIENT_ID=your_client_id \
  -e SPOTIFY_CLIENT_SECRET=your_client_secret \
  raiper34/spooty:latest
```

#### Docker compose
```yaml
services:
  spooty:
    image: raiper34/spooty:latest
    container_name: spooty
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /path/to/downloads:/spooty/backend/downloads
    environment:
      - SPOTIFY_CLIENT_ID=your_client_id
      - SPOTIFY_CLIENT_SECRET=your_client_secret
      # Configure other environment variables if needed
```

### Build from source

Spooty can be also build from source files on your own.

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

Some behaviour and settings of Spooty can be configured using environment variables and `.env` file.

 Name                 | Default                                     | Description                                                                                                                                                      |
----------------------|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
 DB_PATH              | `./config/db.sqlite` (relative to backend)  | Path where Spooty database will be stored                                                                                                                        |
 FE_PATH              | `../frontend/browser` (relative to backend) | Path to frontend part of application                                                                                                                             |
 DOWNLOADS_PATH       | `./downloads` (relative to backend)         | Path where downaloded files will be stored                                                                                                                       |
 FORMAT               | `mp3`                                       | Format of downloaded files (currently fully supported only `mp3` but you can try whatever you want from [ffmpeg](https://ffmpeg.org/ffmpeg-formats.html#Muxers)) |
 PORT                 | 3000                                        | Port of Spooty server                                                                                                                                            |
 REDIS_PORT           | 6379                                        | Port of Redis server                                                                                                                                             |
 REDIS_HOST           | localhost                                   | Host of Redis server                                                                                                                                             |
 RUN_REDIS            | false                                       | Whenever Redis server should be started from backend (recommended for Docker environment)                                                                        |
 SPOTIFY_CLIENT_ID    | your_client_id                              | Client ID of your Spotify application (required)                                                                                                                  |
 SPOTIFY_CLIENT_SECRET| your_client_secret                          | Client Secret of your Spotify application (required)                                                                                                              |
 YT_DOWNLOADS_PER_MINUTE | 3                                           | Set the maximum number of YouTube downloads started per minute                                                                                                  |
 YT_COOKIES           |                                             | Allows you to pass your YouTube cookies to bypass some download restrictions. See [below](#how-to-get-your-youtube-cookies) for instructions.                   |

### How to get your YouTube cookies (using browser dev tools):
1. Go to https://www.youtube.com and log in if needed.
2. Open the browser developer tools (F12 or right click > Inspect).
3. Go to the "Application" tab (in Chrome) or "Storage" (in Firefox).
4. In the left menu, find "Cookies" and select https://www.youtube.com.
5. Copy all the cookies (name=value) and join them with a semicolon and a space, like:
   VISITOR_INFO1_LIVE=xxxx; YSC=xxxx; SID=xxxx; ...
6. Paste this string into the YT_COOKIES environment variable (in your .env or Docker config).

# ⚖️ License
[MIT](https://choosealicense.com/licenses/mit/)
