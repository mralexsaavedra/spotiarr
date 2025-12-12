# Architecture & Technical Decisions

This document details the project's philosophy, technology choices, and code structure. It serves as a guide to understand why SpotiArr is built this way.

## 1. The Initiative

SpotiArr was born from the need to bridge the gap between music discovery on **Spotify** and local media collection (self-hosted) on servers like **Jellyfin** or **Plex**.

While tools like _Lidarr_ exist, direct integration for downloading Spotify playlists with perfect metadata often requires complex configurations or multiple tools. SpotiArr aims to be an "all-in-one" solution:

- **From:** "I like this playlist/album on Spotify".
- **To:** "It's already on my server, with cover art, tags, and organized by folders", without intermediate steps.

## 2. Monorepo Strategy

For this project, a **Monorepo** architecture managed by **pnpm workspaces** was chosen.

### Why Monorepo?

1.  **Shared Code (`shared`):**
    - We have a `@spotiarr/shared` package containing TypeScript types (DTOs), constants, and utilities.
    - **Benefit:** Avoids duplication. If we define a `Track` interface in the backend, the frontend consumes it directly. If it changes, TypeScript warns us of compilation errors on both sides.

2.  **Unified Tooling:**
    - Central configurations for ESLint, Prettier, and TypeScript (`src/eslint-config`, `src/tsconfig`).
    - **Benefit:** All code follows the same standard. No fights over styles; the repo imposes it automatically.

3.  **Atomic Management:**
    - Joint versioning and deployment. A single commit can contain the database migration (Backend) and the UI component consuming that new data (Frontend).

### Why pnpm?

- **Efficiency:** It is much faster than npm/yarn and uses a global _store_, saving hundreds of megabytes on disk by not duplicating `node_modules`.

## 3. Tech Stack

The technology choice prioritizes **Modernity**, **Typing (TypeScript)**, and **Developer Experience (DX)**.

### Frontend (`/src/frontend`)

- **React 19:** Latest version to be future-proof (although we use SPA model).
- **Vite:** Standard build tool. Instant startup and extremely fast HMR.
- **Tailwind CSS v4:** Modern and fast style engine.
- **State:**
  - **Zustand:** Global UI state (modals, sidebar).
  - **TanStack Query:** Asynchronous state (server state, caching).
- **React Router:** SPA navigation.

### Backend (`/src/backend`)

- **Node.js & Express:** Robust and battle-tested.
- **Prisma ORM:** Type-safe with DB. SQLite by default (easy deployment).
- **BullMQ + Redis:** Robust queue system to handle heavy downloads in background.

### Media Core

- **yt-dlp:** Main download engine.
- **FFmpeg:** Audio conversion and post-processing.
- **Node-ID3:** Metadata tagging (Cover art, Artist, Album, etc.).

## 4. Project Structure

### 4.1. Backend (Clean Architecture)

The backend follows **Clean Architecture** and simplified **Domain-Driven Design (DDD)** principles.

```
src/backend/src/
├── application/         # Pure business logic
│   ├── services/        # Orchestrator services (TrackService, PlaylistService)
│   └── use-cases/       # Unique actions: CreateTrack, DownloadTrack...
├── domain/              # Models and contracts (Interfaces)
├── infrastructure/      # Concrete implementations
│   ├── database/        # Prisma Repositories
│   ├── external/        # Integrations (Spotify API, YouTube, Filesystem)
│   ├── jobs/            # Scheduled tasks (Cron Jobs)
│   └── messaging/       # Queues (BullMQ) and Events (SSE)
├── presentation/        # REST API (Routes and Controllers)
└── container.ts         # Manual Dependency Injection (DI)
```

**Backend Patterns Used:**

1.  **Dependency Injection (DI):** Everything is instantiated in `container.ts` for testability.
2.  **Repository Pattern:** Decouples business logic from the database (Prisma).
3.  **Use Cases:** Each user action has a dedicated class, avoiding monolithic services.

### 4.2. Frontend (Atomic Design + Feature Driven)

The frontend is organized to scale, separating pure visual components from business logic and views.

```
src/frontend/src/
├── components/          # Reusable UI elements (Atomic Design)
│   ├── atoms/           # Buttons, Inputs, Basic Icons
│   ├── molecules/       # Search fields, Simple Cards
│   └── organisms/       # Complex Cards, Lists, Modals
├── views/               # Full pages (Application Screens)
├── hooks/               # Custom Hooks Architecture
│   ├── controllers/     # View Logic (ViewModel Pattern)
│   ├── queries/         # API Read wrappers (React Query)
│   ├── mutations/       # API Write wrappers (React Query)
│   └── useServerEvents  # Real-time Sync (SSE)
├── services/            # Pure Fetchers
└── store/               # Global UI State (Zustand)
```

**Advanced Hook Patterns:**

1.  **Controller Pattern (`hooks/controllers`):**
    - We implement the **ViewModel** pattern.
    - Instead of having a view like `PlaylistDetail.tsx` full of logic and `useEffect`, we extract everything to a hook `usePlaylistDetailController`.
    - The view only takes care of "painting" what the controller returns.
2.  **Logic Segregation:**
    - `queries/` and `mutations/` centralize cache keys and API calls.
    - This allows reusing "get playlists" logic in any component without repeating code.
3.  **Real-time Sync (`useServerEvents`):**
    - A global hook listens to **Server-Sent Events** from the backend.
    - When an event arrives (e.g., `track-downloaded`), it automatically invalidates affected queries.
    - **Result:** The UI updates itself without the user reloading, keeping data consistent "magically".

## 5. Key Internal Components

### 5.1. Shared Library (`@spotiarr/shared`)

The glue between backend and frontend. Defines the common system language:

- **State Enums:** `TrackStatusEnum` (New, Searching, Downloading...) controlling UI.
- **Formats:** `SUPPORTED_AUDIO_FORMATS` (mp3, flac, opus, etc.).
- **i18n:** `APP_LOCALES` (es, en) for internationalization.

### 5.2. Spotify Integration (`SpotifyAuthService`)

Handles OAuth2 complexity transparently:

- **Dual Token Strategy:** Uses _Client Credentials_ for public searches and _Authorization Code_ for user data.
- **Auto-Refresh:** Stores `refresh_token` in encrypted database and renews token automatically before expiry, ensuring nightly Cron Jobs never fail due to auth.

### 5.3. Download Engine (`YoutubeDownloadService`)

Not just a shell script. It's a smart wrapper over `yt-dlp`:

- **Dynamic Configuration:** Injects browser cookies to bypass age restrictions on YouTube.
- **Adaptive Quality:** Maps user preference (Best/Good/Acceptable).
- **Security:** Uses a local copy of `yt-dlp` in restrictive environments (like Docker) to ensure execution permissions.

### 5.4. Search Engine (`YoutubeSearchService`)

The key piece to finding the right song:

- Uses `ytsearch1:` operator from yt-dlp.
- Supports user cookies to access "Premium" results or verified YouTube Music matches.
- Performs precise `Artist - Track` format search to minimize false positives.

### 5.5. Server-Sent Events (SSE)

Native implementation without heavy libraries like Socket.io:

- The backend maintains an array of open connections (`events.routes.ts`).
- `SseEventBus` decouples logic: any service can do `eventBus.emit('event')` without knowing about HTTP.
- It is unidirectional (Server -> Client), ideal for progress notifications.

### 5.6. Post-Processing (`TrackPostProcessingService`)

Where metadata magic happens:

- **ID3 Tags:** Not just Artist and Title. Injects Album, Year, Track Number, Disc, and Cover Art.
- **M3U Generator:** Dynamically regenerates playlist `.m3u8` file every time a new download completes.
- **File Organization:** Moves files to canonical structure `Artist/Album/Track.ext` expected by Jellyfin.

## 6. Data Model & Persistence

We use **Prisma** with **SQLite** for robust yet portable relational data management.

**Main Entities:**

- **Playlist:** Represents a Spotify list (album or playlist). Can be marked as `subscribed` for automatic updates.
- **Track:** The minimal unit. Contains Spotify metadata and local download state (`New` -> `Searching` -> `Downloading` -> `Completed` -> `Error`).
- **Setting:** Key-value storage for user configuration (e.g., audio format, download path).
- **DownloadHistory:** Immutable history of completed downloads for statistics.

## 7. Automation & Background Jobs

SpotiArr is not just an on-demand downloader, it is an autonomous system.

1.  **Playlist Synchronization (`Cron Job`):**
    - Every X minutes (configurable), the system checks all playlists marked as `subscribed`.
    - Compares with Spotify API and if new tracks are detected, automatically queues them.
2.  **Stuck Process Cleanup:**
    - A job watches for downloads taking too long in "Downloading" state (zombies) and marks them as error to allow retries, preventing eternal deadlocks.

## 8. Security & Validation

We implement a **fail-fast** strategy and strict data validation.

- **Zod Schemas:** All API inputs (`presentation/routes/schemas`) and environment variables (`environment.ts`) are validated with Zod. If data format is incorrect, the application rejects the request immediately before touching business logic.
- **Centralized Error Handling:** Global Middleware (`error-handler.ts`) capturing any exception, standardizing it to a safe JSON response (no stack traces in production) and preventing server crashes.
- **Personal Rate Limiting:** The download worker (`track-download.worker.ts`) implements its own pause mechanism based on user configuration (`YT_DOWNLOADS_PER_MINUTE`) to be "good citizens" with YouTube servers.

## 9. Download Lifecycle

The most critical process of the application works like this:

1.  **Request (Frontend -> API):**
    - User pastes a Spotify URL.
    - Frontend calls `POST /api/playlists`.

2.  **Ingestion (UseCase):**
    - `CreatePlaylistUseCase` fetches metadata from Spotify API.
    - Saves tracks to DB with `PENDING` state.
    - Queues download jobs in **BullMQ**.

3.  **Processing (Worker):**
    - A BullMQ worker picks up the job.
    - **Search:** `YoutubeSearchService` looks for best audio match on YouTube/YoutubeMusic.
    - **Download:** `YoutubeDownloadService` invokes `yt-dlp` to download audio.
    - **Post-Process:** `TrackPostProcessingService`:
      - Converts to MP3/M4A with **FFmpeg**.
      - Embeds cover art and ID3 tags.
      - Moves file to final folder: `Downloads / Artist / Album / Track.mp3`.
      - Generates `.m3u8` file for playlist.

4.  **Notification (EventBus):**
    - Backend emits Server-Sent Events (SSE).
    - Frontend receives event and updates progress bar in real-time without reload.

## 10. Infrastructure & Deployment

Everything is containerized with **Docker** to ensure reproducibility.

- **Redis:** Queue persistence.
- **Volumes:** Mapping local folders to persist downloads and database.
- **Traefik (Optional):** Reverse proxy configured for HTTPS handling (required for remote Spotify Auth).
