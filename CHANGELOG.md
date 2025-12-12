# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.5](https://github.com/mralexsaavedra/spotiarr/compare/v0.1.4...v0.1.5) (2025-12-12)

### Features

- Add disc number and total tracks to track metadata and file naming logic. ([9ea5546](https://github.com/mralexsaavedra/spotiarr/commit/9ea55462bb1c036d1a21101a81551340fc3a28cf))
- Dynamically determine cover art file extension from content type and remove redundant artist image saving. ([e02b814](https://github.com/mralexsaavedra/spotiarr/commit/e02b8149508335cda3d6f44ef58e55c197691e2f))
- Implement an application event bus to hot-reload workers when specific settings are updated. ([0e3cfe4](https://github.com/mralexsaavedra/spotiarr/commit/0e3cfe42b55a94ea6496a21cf350873f921e64ae))
- Save artist images as both `folder.jpg` and `artist.jpg`, and set universal read permissions for cover art files. ([e467d3c](https://github.com/mralexsaavedra/spotiarr/commit/e467d3c021c36d7d903300e4d1dd6c2a807d6fde))

### [0.1.4](https://github.com/mralexsaavedra/spotiarr/compare/v0.1.3...v0.1.4) (2025-12-11)

### Features

- Add `DOWNLOADS` environment variable for Docker volume mapping and update `SPOTIFY_REDIRECT_URI` examples. ([0b58e39](https://github.com/mralexsaavedra/spotiarr/commit/0b58e396148324481ba364a26be80673319628ca))
- Add 2025 audit report and document advanced Redis configuration options. ([c2b19b2](https://github.com/mralexsaavedra/spotiarr/commit/c2b19b212810c60b909644601448cbaed4e64867))
- Add 2025 audit report and update pnpm lock file. ([79b0844](https://github.com/mralexsaavedra/spotiarr/commit/79b084410b5446720409baca173aaba96c6d13dd))
- Add and configure `prettier-plugin-tailwindcss` in the frontend and update shared Prettier configuration. ([db49ef6](https://github.com/mralexsaavedra/spotiarr/commit/db49ef6e3ee6c41d92b3b8ce843b6513271f10e0))
- Add and configure Prettier Tailwind CSS plugin. ([1cf081b](https://github.com/mralexsaavedra/spotiarr/commit/1cf081ba174e8b7f7929f912f4d057a999b04108))
- Add comprehensive localization for settings sections and items. ([3af7000](https://github.com/mralexsaavedra/spotiarr/commit/3af70003817f1d07582e6523aac2e7857661fa4a))
- Add error and track status translations and apply them to the NotFound, RouteErrorBoundary, and TrackStatusIndicator components. ([85d6d53](https://github.com/mralexsaavedra/spotiarr/commit/85d6d535bd292d1f12a99d7c5a975efd160f5cb9))
- Add error handling utilities and type-safe Prisma JSON and enum conversions. ([bb23c6d](https://github.com/mralexsaavedra/spotiarr/commit/bb23c6d8610b51a97468e606da8ec62cfd4b8d02))
- Add i18n support to playlist components by introducing new translation keys for various UI texts and actions. ([39793bb](https://github.com/mralexsaavedra/spotiarr/commit/39793bbdfcf7e7fe59b42b4d980446a73a9efac8))
- add linux-musl-openssl-3.0.x to Prisma client binary targets ([f7f1087](https://github.com/mralexsaavedra/spotiarr/commit/f7f1087ca4a6d09516aeeac70f9af76ab16d136e))
- Add PUID/PGID environment variables for Docker file permissions and include a 2025 audit report. ([1a4238f](https://github.com/mralexsaavedra/spotiarr/commit/1a4238f681c5cb586e34d85092e1fba8d0a944c7))
- Add Spotify token exchange and logout functionality to `spotify-auth.service` and refactor auth routes to use it. ([9be1b4e](https://github.com/mralexsaavedra/spotiarr/commit/9be1b4eda5523ad4bb3ebc9a1e7bc7345cca7064))
- Add SpotifyAuthCard skeleton component and display it during loading. ([d101949](https://github.com/mralexsaavedra/spotiarr/commit/d1019494f04b02fc445528ddc731de1912118e30))
- add Traefik reverse proxy service and configure spotiarr for dynamic routing. ([9933cb6](https://github.com/mralexsaavedra/spotiarr/commit/9933cb68059b53263da2ef9a19e38d45a07202d7))
- Add type definitions for VITE_API_URL environment variable to `import.meta.env`. ([bfa6be4](https://github.com/mralexsaavedra/spotiarr/commit/bfa6be4a02175975b840e772d98717b062e07be2))
- Configure `@` path alias for absolute imports in the frontend. ([de7bab5](https://github.com/mralexsaavedra/spotiarr/commit/de7bab5cd9d7aa3c0d2845b6091870876b707f2c))
- dynamically configure Vite server host and proxy using all environment variables and remove redundant comments from type definitions and Toast component. ([251d61c](https://github.com/mralexsaavedra/spotiarr/commit/251d61cd33cea428a302e2d8ad10b4abbb7f3e70))
- enhance server startup console output with detailed URLs and HTTPS information ([ad9ef0a](https://github.com/mralexsaavedra/spotiarr/commit/ad9ef0af25c4daec233b064500c9426705b93ad0))
- implement and run stuck track rescue logic at application startup ([b4498e1](https://github.com/mralexsaavedra/spotiarr/commit/b4498e18b08648a43caf42948995d29d5300818d))
- Implement chat UI with improved input, message display, and scroll-to-bottom functionality. ([dc719ad](https://github.com/mralexsaavedra/spotiarr/commit/dc719adceffac3b170b2fdc3c53b109c450dbe06))
- implement graceful shutdown ([75bf1c1](https://github.com/mralexsaavedra/spotiarr/commit/75bf1c15d5cbbf43b11fac9fdf7674d8f3d682dd))
- Implement internationalization for artist-related UI texts and discography filters by adding new translation keys. ([575d0f6](https://github.com/mralexsaavedra/spotiarr/commit/575d0f65933f09d9d247e05d3b89c0c97733d3b3))
- Implement PUID/PGID user management, set default PUBLIC_HOST to 0.0.0.0, and simplify .dockerignore. ([62fec81](https://github.com/mralexsaavedra/spotiarr/commit/62fec81e8887e1f2f97ae2fe792a6b65facc1685))
- internationalize 'Unknown Album' text in playlist metadata ([8a90a5f](https://github.com/mralexsaavedra/spotiarr/commit/8a90a5fe26b2a3cc14e1abbff958dc3289fac46f))
- internationalize "Open in Spotify" text in SpotifyLinkButton component by adding translation keys. ([4f57169](https://github.com/mralexsaavedra/spotiarr/commit/4f571695aeae406f6b8ea72efa3f9d6b487d0214))
- Internationalize album, playlist, and status badge UI strings with new translation keys for English and Spanish. ([e5ea2fc](https://github.com/mralexsaavedra/spotiarr/commit/e5ea2fc8a421b8b08deec6c4d535ef6e53c992e0))
- Internationalize HistoryList component by adding new locale strings and applying them to UI elements. ([0ea3f92](https://github.com/mralexsaavedra/spotiarr/commit/0ea3f922e44a5eee628bccbd8a81fb5c0f67fa6f))
- internationalize relative date formatting by adding new locale keys and updating the date utility to use them. ([add4496](https://github.com/mralexsaavedra/spotiarr/commit/add4496a450715bf56984832a2e588a0274622f4))
- Internationalize Spotify playlist card text and update its styling and layout. ([7361a68](https://github.com/mralexsaavedra/spotiarr/commit/7361a682bb1d299506f71530249fab102f3014ee))
- Introduce `APP_LOCALES` and `APP_LOCALE_LABELS` and refactor setting option label formatting. ([623dbf0](https://github.com/mralexsaavedra/spotiarr/commit/623dbf00796adbac484dc6923cda41ea8cb1065c))
- introduce `playlistIndex` for consistent track ordering and file naming within playlists. ([b759d4a](https://github.com/mralexsaavedra/spotiarr/commit/b759d4a00438ffd3081a1a9c1a66c1ff8e211bb5))
- introduce i18n support for core UI elements and add English and Spanish translations. ([0c0346d](https://github.com/mralexsaavedra/spotiarr/commit/0c0346d3efc5807bc2add5f552b265ef6d3e798f))
- Introduce internationalization with English and Spanish locales and a language selection option in settings. ([150af76](https://github.com/mralexsaavedra/spotiarr/commit/150af760646b311174737628c7e92f3dcb9acac8))
- introduce UI language setting and synchronize i18n with user preference ([20bda33](https://github.com/mralexsaavedra/spotiarr/commit/20bda33770b9cc4aa81a22528108118c7652f1a4))
- localize AppHeader's URL input placeholder and download button text. ([32a340b](https://github.com/mralexsaavedra/spotiarr/commit/32a340b3f06ef3b3fa2160b86957ff438cbb4ba8))
- Remove HTTPS support and self-signed certificate generation, defaulting to HTTP-only operation. ([dfc7a1e](https://github.com/mralexsaavedra/spotiarr/commit/dfc7a1e1f26e7d658315e8af42707df42b21e1e9))
- Standardize downloads directory environment variable to `DOWNLOADS_DIR` for external use and `DOWNLOADS` for internal auto-configuration. ([88f4074](https://github.com/mralexsaavedra/spotiarr/commit/88f4074fd93f4ea075cf4c6e9c201bcaf7882885))

### Bug Fixes

- **docker:** resolve prisma sqlite json errors and build issues ([258a4a4](https://github.com/mralexsaavedra/spotiarr/commit/258a4a442ae723d1dcecfbf8e6df549b80f208ef))

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
