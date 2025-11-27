# TODO / Ideas

- [ ] Artist releases feed similar to Spotify’s "new from your artists"
  - Use Spotify Web API: `GET /me/following?type=artist` + `GET /artists/{id}/albums`
  - Cache artist data and releases; be careful with rate limits
  - Build a feed UI in SpotiArr to show recent releases from followed artists
  - Provide actions from the feed, e.g. "Add album to downloads" or "Create subscription"

- [ ] Improve artist downloads to fetch tracks via Spotify API albums instead of only top-tracks
  - Explore `GET /v1/artists/{id}/albums` with pagination (albums, singles) and reuse `getAlbumTracks`
  - Aggregate and dedupe tracks per artist; consider limiting to recent albums to avoid excessive API calls
  - Replace `getArtistTopTracks` usage in backend playlist creation with this more complete source
