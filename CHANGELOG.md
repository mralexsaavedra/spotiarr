# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- docs: add comprehensive frontend and backend architecture documentation to CONTRIBUTING.md

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
