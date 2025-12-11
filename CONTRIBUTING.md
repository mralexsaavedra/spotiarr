# Contributing to SpotiArr

Thank you for considering contributing to SpotiArr! This document explains how to get a dev setup running, contribute code, and open high-quality pull requests.

## Quick Start (2 minutes)

> Already have Node, pnpm, Redis, FFmpeg, and yt-dlp installed? Follow this checklist and you are ready to hack:

1. `git clone https://github.com/mralexsaavedra/spotiarr.git && cd spotiarr`
2. `corepack enable`
3. `pnpm install`
4. `cp .env.example .env` → add Spotify credentials + set `REDIS_HOST=localhost`
5. Ensure Redis is running locally (service, Docker, or Brew)
6. `pnpm dev` (runs backend + frontend together)

Need more detail? Keep reading 👇

## Development Setup

### Prerequisites

**Core tools**

- Node.js v24 LTS or higher (`nvm use` recommended)
- pnpm v10.0.0 or higher (`corepack enable` recommended)
- Python 3.11 or 3.12 (native addons)

**Media + queue services**

- Redis (queues)
- FFmpeg (audio processing)
- yt-dlp (YouTube downloads)

> Tip: install the core tools once with nvm + corepack; everything else can come from Brew/Apt/Docker.

### Initial Setup (detailed)

1. **Fork & clone**

```bash
git clone https://github.com/YOUR_USERNAME/spotiarr.git
cd spotiarr
```

2. **Install deps**

```bash
corepack enable
pnpm install
```

3. **Create `.env`**

```bash
# Copy to project root
cp .env.example .env

# Edit .env:
# 1. Add your Spotify credentials (REQUIRED)
# 2. (Optional) Adjust advanced settings if needed

# A symlink is automatically used by the backend to read this file
```

5. **Setup Database**

   Configure the local development database:

   ```bash
   # 1. Create backend env file
   cp src/backend/.env.example src/backend/.env

   # 2. Run migrations (creates src/backend/prisma/dev.db)
   pnpm --filter backend run prisma:migrate:deploy
   ```

6. **Install services**

```bash
# macOS (Homebrew)
brew install redis ffmpeg yt-dlp
brew services start redis

# Linux (Ubuntu/Debian)
sudo apt install redis-server ffmpeg
pip install yt-dlp
sudo systemctl start redis

# OR use Docker for Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### Having trouble?

- Check existing issues or open a new one
- Ask in GitHub Discussions
- Mention the exact step that failed (command + output)

### Running the Development Environment

| Command         | What it does                             | Ports       |
| --------------- | ---------------------------------------- | ----------- |
| `pnpm dev`      | Backend + frontend concurrently          | 3000 / 5173 |
| `pnpm start:be` | Backend only (API + SSE)                 | 3000        |
| `pnpm start:fe` | Frontend only (Vite dev server with HMR) | 5173        |

### Environment Variables

**User-facing variables**: Please refer to the [README](../README.md#environment-variables) for the authoritative list of required and optional variables.

**Development & System Variables** (Auto-configured):

| Variable        | Default (dev) | Default (prod)                   | Description                                                     |
| --------------- | ------------- | -------------------------------- | --------------------------------------------------------------- |
| `NODE_ENV`      | `development` | `production` (set in Dockerfile) | Optimization flags (do not change manually)                     |
| `REDIS_HOST`    | `localhost`   | `redis` (Docker service name)    | Redis hostname                                                  |
| `REDIS_PORT`    | `6379`        | `6379`                           | Redis port                                                      |
| `DOWNLOADS_DIR` | -             | `/path/to/downloads`             | Host directory for Docker volume mapping (Ignored in local dev) |

**How URLs are constructed:**

- **Development:** `http://localhost:5173` (Vite dev server)
- **Production:** `http://YOUR_SERVER_IP:3000` (Backend API)

## Project Structure

```
spotiarr/
├── src/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── application/   # Use cases & business logic
│   │   │   ├── domain/        # Entities & core types
│   │   │   ├── infrastructure/# External services (DB, Redis, Spotify)
│   │   │   ├── presentation/  # HTTP controllers & routes
│   │   │   ├── constants/
│   │   │   ├── types/
│   │   │   ├── app.ts         # Express app setup
│   │   │   ├── container.ts   # Dependency injection
│   │   │   └── index.ts       # Entry point
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── atoms/
│       │   │   ├── molecules/
│       │   │   ├── organisms/
│       │   │   └── layouts/
│       │   ├── hooks/
│       │   ├── routes/
│       │   ├── services/      # API clients
│       │   ├── store/         # Zustand stores
│       │   ├── styles/
│       │   ├── types/
│       │   ├── utils/
│       │   └── views/         # Page components
│       └── package.json
└── package.json
```

## Architecture

### Frontend (Atomic Design)

The frontend is built with React and follows **Atomic Design** principles to ensure component reusability and maintainability.

1. **Atomic Design (`src/components`)**:
   - **Atoms**: The smallest building blocks (e.g., `Button`, `Input`, `Icon`). These are highly reusable and contain no business logic.
   - **Molecules**: Combinations of atoms (e.g., `SearchBar` = Input + Button). They handle local UI state.
   - **Organisms**: Complex sections of the interface (e.g., `Header`, `TrackList`). They may interact with global state or services.
   - **Layouts**: Structuring wrappers (e.g., `MainLayout`, `AuthLayout`).

2. **State Management**:
   - **Server State (TanStack Query)**: Used for all data fetching, caching, and synchronization with the backend. See `src/hooks` and `src/services`.
   - **UI State (Zustand)**: Used for global client-only state (e.g., theme, sidebar toggle, audio player state). See `src/store`.

3. **Routing & Views**:
   - **Views (`src/views`)**: Top-level page components. They should primarily orchestrate Layouts and Organisms.
   - **Routes (`src/routes`)**: Defines the application's navigation structure using React Router.

4. **Styling**:
   - **Tailwind CSS**: The primary styling engine.
   - **CLSX / Tailwind Merge**: Used for conditional class names and conflict resolution.

### Backend (Clean Architecture / DDD)

The backend follows a **layered architecture** with strict dependency rules:

1. **Domain (`src/domain`)**:
   - The core. Contains business rules and entities.
   - **Must NOT depend** on any other layer.
   - Contains: Entities, Value Objects, Repository Interfaces, Domain Services.
   - Domain Services orchestrate business operations without knowing implementation details.

2. **Application (`src/application`)**:
   - Application business rules (Use Cases and Application Services).
   - Coordinates data flow between Presentation and Domain.
   - **Depends only on** Domain.
   - Contains: Use Cases (single responsibility actions), Application Services (orchestrators).

3. **Infrastructure (`src/infrastructure`)**:
   - Frameworks and tools (Database, External APIs, File System, Queues).
   - Implements interfaces defined in Domain/Application.
   - **Depends on** Domain and Application.
   - Contains:
     - `database/` - Repository implementations (Prisma)
     - `external/` - External service clients (Spotify API, YouTube)
       - HTTP clients with authentication & rate limiting
       - Service segregation by responsibility (catalog vs user data)
       - Token management
     - `messaging/` - Queue implementations (BullMQ)
     - `services/` - Technical services (file system, metadata)

4. **Presentation (`src/presentation`)**:
   - Interface adapters (HTTP Controllers, Routes, Middleware, SSE).
   - Receives inputs and converts them to Use Case requirements.
   - **Depends on** Application.
   - Contains: Routes, Middleware (auth, error handling), SSE endpoints.

**Key architectural principles:**

- **Dependency Rule:** Source code dependencies can only point **inwards** (Presentation → Application → Domain ← Infrastructure).
- **Dependency Injection:** Use the DI container. Services are instantiated once and injected where needed.
- **Error Handling:** Use structured error classes with typed error codes (defined in shared package).
- **Service Segregation:** Services are split by responsibility for better maintainability.
- **Rate Limiting:** Automatic retry with exponential backoff for external API rate limits.
- **Settings:** User-configurable options stored in database, not environment variables.
- **SSE:** Server-Sent Events for real-time updates (download progress, queue status).

## Development Workflow

1. **Create a branch**
   - `git checkout -b feature/my-feature`
   - Prefix by type (`feature/`, `fix/`, `docs/`, `refactor/`)
2. **Build the change**
   - Follow existing patterns (Atomic Design for components, hooks per query/mutation, etc.)
   - Keep components small; use hooks for side-effects/business logic
3. **Test locally**
   - `pnpm lint`
   - `pnpm format`
   - `pnpm dev` (manual QA). Pre-commit hooks run lint + format automatically.
4. **Commit**
   - `git add . && git commit -m "feat: short summary"`
   - Conventional prefixes (`feat`, `fix`, `docs`, `style`, `refactor`, `chore`)
5. **Open a PR**
   - `git push origin feature/my-feature`
   - Fill template: summary, motivation, verification steps, screenshots (if UI), linked issues

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow existing code formatting (Prettier/ESLint)
- Use meaningful variable and function names
- Prefer `const` over `let`, avoid `var`
- Use async/await over callbacks
- Add JSDoc comments for public APIs

### Frontend Components (React)

- One component per file (prefer `tsx`)
- Use functional components and hooks (no class components)
- Use `useEffect`/`useMemo`/`useCallback` thoughtfully and keep components small

- Co-locate types and hooks with components when it improves readability

## Pull Request Checklist

| ✅ Verify before submitting    | 📝 Include in PR description   |
| ------------------------------ | ------------------------------ |
| Code matches style guides      | Summary of changes             |
| `pnpm lint` passes             | Motivation / context           |
| `pnpm format` applied          | Verification steps (commands)  |
| Pre-commit hooks succeed       | Screenshots/videos for UI work |
| No stray `console.log`         | Breaking changes (if any)      |
| Docs/tests updated when needed | Related issue numbers          |

**Review process**

- Maintainers review and may request tweaks
- Keep feedback constructive and actionable
- Iterations are normal—thanks for your patience!

## Getting Help

- Search issues/Discussions first—your question might already be answered
- Open a new issue with repro steps or error logs if it’s new

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a positive environment

Thank you for contributing to SpotiArr! 🎵
