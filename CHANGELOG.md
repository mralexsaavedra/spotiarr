# Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

## [0.1.0] - 2025-01-XX

### ⚠️ Breaking Changes
- Upgraded from Node.js 18 to **Node.js 23.10.0** (requires Node.js >=23.0.0)
- Migrated from npm to **pnpm** package manager (requires pnpm >=9.0.0)
- Changed database driver from `sqlite3` to `better-sqlite3` for Node.js 23 compatibility

### 🚀 Features
- Added `pnpm dev` command to run backend and frontend concurrently
- Improved Docker build with multi-stage optimization
- Added GitHub Actions workflow for automated Docker builds on version tags
- Multi-platform Docker images (linux/amd64, linux/arm64)

### 🔧 Improvements
- Updated all package.json scripts to use pnpm
- Configured pnpm workspaces for monorepo management
- Standardized TypeScript version to ~5.6.3 across all packages
- Added comprehensive troubleshooting section to README
- Improved development documentation with project structure and workflow

### 🗑️ Removed
- Removed `release-it` and related release automation tools
- Removed `auto-changelog` dependency
- Removed `commitizen` and conventional commit tooling
- Cleaned up unused npm scripts (changelog, commit)

### 📦 Dependencies
- Updated to better-sqlite3 v12.4.1
- Added concurrently for parallel dev server execution
- Updated Dockerfile to use Node.js 23-alpine with pnpm

### 🐛 Bug Fixes
- Fixed native module compilation with Python 3.11/3.12 requirement
- Resolved TypeScript version conflicts between Angular and backend

### 📚 Documentation
- Complete README overhaul with modern setup instructions
- Added detailed troubleshooting for better-sqlite3, Redis, and FFmpeg
- Added development section with available scripts and workflow
- Updated all documentation from npm to pnpm commands
