# Jellyfin Integration Guide

## Overview

SpotiArr has been configured to organize downloaded music in a Jellyfin-compatible folder structure, making it easy to add your downloaded music to your Jellyfin media server.

## Folder Structure

SpotiArr organizes music following Jellyfin's recommended structure, with different layouts for playlists and albums:

### Spotify Playlists

Playlists are stored together in a dedicated folder:

```
Playlists/
├── My Playlist/
│   ├── 01 - Artist A - Track Name.mp3
│   ├── 02 - Artist B - Track Name.mp3
│   ├── 03 - Artist C - Track Name.mp3
│   ├── My Playlist.m3u8
│   └── cover.jpg
└── Another Playlist/
    ├── 01 - Artist X - Track Name.mp3
    ├── Another Playlist.m3u8
    └── cover.jpg
```

### Individual Albums/Tracks

Single albums or tracks are organized by artist:

```
Artist Name/
├── Album Name/
│   ├── 01 - Track Name.mp3
│   ├── 02 - Track Name.mp3
│   ├── 03 - Track Name.mp3
│   └── cover.jpg
└── Another Album/
    ├── 01 - Track Name.mp3
    └── cover.jpg

Another Artist/
└── Album Name/
    ├── 01 - Track Name.mp3
    └── cover.jpg
```

### Folder Hierarchy

**For Playlists:**

1. **Playlists/** - All playlists container
2. **Playlist Name/** - Individual playlist folder
3. **Tracks** - Files with format: `{TrackNumber} - {Artist} - {TrackName}.{ext}`
4. **M3U File** - Playlist file in the same folder
5. **Cover Art** - `cover.jpg` for playlist artwork

**For Albums:**

1. **Artist/** - Folder for each artist
2. **Album/** - Folder for each album under the artist
3. **Tracks** - Files with format: `{TrackNumber} - {TrackName}.{ext}`
4. **Cover Art** - `cover.jpg` for album artwork

## How It Works

### Track Information

Each track is stored with the following metadata:

- **Artist Name**: Primary artist of the track
- **Album Name**: Defaults to the Spotify playlist name if album info is not available
- **Track Number**: Sequential numbering from the playlist order
- **Track Name**: Original track title

### Cover Art

Cover art is automatically downloaded and saved as `cover.jpg` (Jellyfin's preferred format).

Cover art is also embedded in the audio file's metadata.

## Jellyfin Configuration

### Adding Music to Jellyfin

1. Open Jellyfin Dashboard
2. Navigate to **Libraries** → **Add Media Library**
3. Select **Music** as the content type
4. Add the path to your downloads folder (e.g., `/path/to/spotiarr/downloads`)
5. Enable **Automatically refresh metadata from the internet**
6. Save the library

### Recommended Jellyfin Settings

For optimal music organization:

1. **Library Settings**:
   - Enable: "Automatically add to collection"
   - Enable: "Enable chapter image extraction"
2. **Metadata Settings**:
   - Preferred metadata language: Your language
   - Country: Your country
   - Enable: "Save artwork into media folders"

3. **Media Info**: Enable "Extract chapter images"

## M3U Playlist Files

SpotiArr automatically generates M3U8 playlist files for **Spotify playlists only** (not for albums or individual tracks). These files are saved **in the same folder** as the playlist tracks for easy access.

### M3U File Structure

For Spotify playlists, the M3U file uses relative paths in the same directory:

```m3u
#EXTM3U
#PLAYLIST:My Playlist
#EXTINF:-1,Artist A - Track Name
#EXTART:Artist A
01 - Artist A - Track Name.mp3

#EXTINF:-1,Artist B - Track Name
#EXTART:Artist B
02 - Artist B - Track Name.mp3
```

**Note:** M3U files are only generated for playlists with multiple tracks. Albums and individual tracks don't need M3U files as they are already organized by artist/album structure.

### Using M3U Files with Jellyfin

Jellyfin can import M3U playlists:

1. The `.m3u8` files are automatically in the `Music/Playlists/PlaylistName/` folders
2. In Jellyfin, go to your music library
3. Right-click and select "Scan Media Library"
4. Jellyfin will automatically detect and import the playlists

## Directory Layout

After downloading music, your directory structure will look like this:

```
downloads/                          # Jellyfin music library
├── Playlists/                      # All Spotify playlists
│   ├── My Playlist/
│   │   ├── 01 - Artist A - Song 1.mp3
│   │   ├── 02 - Artist B - Song 2.mp3
│   │   ├── 03 - Artist C - Song 3.mp3
│   │   ├── My Playlist.m3u8
│   │   └── cover.jpg
│   └── Workout Mix/
│       ├── 01 - Artist X - Song 1.mp3
│       ├── 02 - Artist Y - Song 2.mp3
│       ├── Workout Mix.m3u8
│       └── cover.jpg
├── Artist 1/                       # Individual albums
│   └── Album A/
│       ├── 01 - Song 1.mp3
│       ├── 02 - Song 2.mp3
│       └── cover.jpg
└── Artist 2/
    └── Album B/
        ├── 01 - Song 1.mp3
        └── cover.jpg
```

## Troubleshooting

### Jellyfin Doesn't Detect Music

1. Verify folder permissions (Jellyfin needs read access)
2. Trigger a manual library scan in Jellyfin
3. Check that the `Music/` folder path is correctly configured in Jellyfin

### Missing Cover Art

- Cover art is downloaded from Spotify when available
- If covers are missing, check the log for download errors
- Jellyfin can also fetch covers automatically during metadata refresh

### Track Numbers Not Showing

- Track numbers are assigned based on playlist order
- If a track has explicit track number metadata from Spotify, that will be used
- Re-scan the library in Jellyfin if numbers appear incorrect

## Settings

Runtime settings (preferred way to configure SpotiArr):

- **Audio format** (FORMAT)
- **M3U generation** (M3U_GENERATION_ENABLED)

These options are exposed in the **Settings** page of the UI and persisted in
the database. The corresponding environment variables only act as initial
defaults on first run.

## Database Schema Changes

The following fields were added to support Jellyfin structure:

### TrackEntity

- `album`: string (nullable) - Album name for the track
- `trackNumber`: number (nullable) - Position in the album/playlist

These fields are automatically populated when importing from Spotify.
