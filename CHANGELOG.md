# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.3](https://github.com/mralexsaavedra/spotiarr/compare/v0.1.2...v0.1.3) (2025-12-09)

### Features

- Add `invalid_spotify_url` error code and replace generic errors with `AppError` for Spotify URL validation. ([9b2e0fc](https://github.com/mralexsaavedra/spotiarr/commit/9b2e0fc3bcb66059991705415804eae4079af93b))
- Add clickable owner URL to Spotify playlist cards. ([eb6d196](https://github.com/mralexsaavedra/spotiarr/commit/eb6d1963e8b76c039f0ae57602e284f1696ca7ec))
- add commitlint with conventional config and husky hook ([d6d3d2e](https://github.com/mralexsaavedra/spotiarr/commit/d6d3d2e2b4c4c397c8ea0e83b666c776f6279fcf))
- Add configurable Spotify market setting and integrate it into Spotify API requests. ([6a328a5](https://github.com/mralexsaavedra/spotiarr/commit/6a328a5b0b987b16ee76786d26bc1ff0a43b69f6))
- Add owner and ownerUrl columns to Playlist table ([deee205](https://github.com/mralexsaavedra/spotiarr/commit/deee20553319cd2dc33765af5e07b1c329bb7251))
- Add playlist owner and owner URL to the playlist entity, persistence, and synchronization process. ([6bd5096](https://github.com/mralexsaavedra/spotiarr/commit/6bd50960361c6d51b5ace6a7a27c4ff1770cff19))
- add standard-version for release management ([6a076ee](https://github.com/mralexsaavedra/spotiarr/commit/6a076eed67c1e3e5172883ac6e34cd0402c7eadf))
- Add underline on hover to Spotify playlist card title. ([e7d1ca3](https://github.com/mralexsaavedra/spotiarr/commit/e7d1ca358343ea813eaa5235a77a067bc4959779))
- centralize Spotify track normalization logic into a new helper method. ([08da9be](https://github.com/mralexsaavedra/spotiarr/commit/08da9beb228e4fe38e8fc0a646fee8404b5573c7))
- Display playlist owner information and link to their Spotify profile on playlist previews. ([37736b3](https://github.com/mralexsaavedra/spotiarr/commit/37736b3f4d109f13f9dc0eac9a6ecbb5b32455b2))
- Enable YouTube cookies configuration through application settings. ([f33e071](https://github.com/mralexsaavedra/spotiarr/commit/f33e0714d472787484f8beeb009b469063cb1c8f))
- Implement rate limit retry with exponential backoff for Spotify API calls. ([e31ff5d](https://github.com/mralexsaavedra/spotiarr/commit/e31ff5deded66f6a2f2f8295f5043197d1512de5))
- Implement Spotify user library service to fetch user playlists and followed artists' recent releases with caching. ([ceca5dd](https://github.com/mralexsaavedra/spotiarr/commit/ceca5dd8a84b9d7fadecbc88fa8661ca41f85023))
- integrate custom fonts into the application stylesheet ([c01f5a8](https://github.com/mralexsaavedra/spotiarr/commit/c01f5a8145ddd3e1af34137f285a40ae775beea6))
- introduce SpotifyAuthService for token management and refactor playlist track processing to use NormalizedTrack with batching. ([eb0ae37](https://github.com/mralexsaavedra/spotiarr/commit/eb0ae37ad2d8e26e9623d4d26d607a84c438dba6))
- Skip unavailable tracks and implement batched parallel creation for new playlist tracks. ([07e10cf](https://github.com/mralexsaavedra/spotiarr/commit/07e10cf2725b2ea18ab76c15aaa5fff4b27d819a))
- upgrade to tailwind css v4 consolidating configuration and integrating with vite ([5d9dfc7](https://github.com/mralexsaavedra/spotiarr/commit/5d9dfc766e9cf61b8d4119279b683e2006995e10))

## [0.1.2] - 2025-12-09

### Added

- feat: Add functionality to fetch and display user's Spotify playlists
- feat: Add mobile-only history link to app header
- feat: Add mobile settings link to header and filter mobile bottom navigation items
- feat: Add `faListUl` icon to the frontend icon set
- docs: Add interface screenshots and updated setup instructions to README
- docs: Add application views section to README

### Changed

- refactor: update `CONTRIBUTING.md` to detail the new backend Clean Architecture/DDD structure
- chore: enable React Query Devtools

### Performance

- perf: Optimize virtual list and grid rendering by memoizing item content

## [0.1.1] - 2025-12-08

### Fixed

- ci: add QEMU setup to fix ARM64 build segfaults
- fix: multiple ARM64 build fixes (trigger errors, package verification)
- build: Add `--break-glass` flag to `apk add` commands

## [0.1.0] - 2025-12-04

### Added

- Initial release
- fix: add permissions for github release
