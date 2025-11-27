# Contributing to SpotiArr

Thank you for considering contributing to SpotiArr! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- **Node.js**: v24 LTS or higher (use nvm: `nvm use`)
- **pnpm**: v9.0.0 or higher (use corepack: `corepack enable` or install globally: `npm install -g pnpm`)
- **Python**: 3.11 or 3.12 (required for native module compilation)
- **Redis**: Required for queue management
- **FFmpeg**: Required for audio processing
- **yt-dlp**: Required for downloading from YouTube

### Initial Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/spotiarr.git
cd spotiarr
```

2. Install dependencies:

```bash
pnpm install
```

3. If you encounter issues with `better-sqlite3` compilation:

```bash
# Ensure Python 3.11 or 3.12 is installed
pnpm rebuild better-sqlite3
# If still failing:
pnpm rebuild better-sqlite3 --config.ignore-scripts=false
```

4. Create and configure `.env` file:

```bash
# Copy to project root
cp .env.example .env

# Edit .env:
# 1. Add your Spotify credentials (REQUIRED)
# 2. Change REDIS_HOST=redis to REDIS_HOST=localhost (REQUIRED for local dev)

# A symlink is automatically used by the backend to read this file
```

5. Install system dependencies:

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

### Running the Development Environment

Start both backend and frontend concurrently:

```bash
pnpm dev
```

Or run them separately:

```bash
# Terminal 1 - Backend (http://localhost:3000)
pnpm start:be

# Terminal 2 - Frontend (http://localhost:5173)
pnpm start:fe
```

## Project Structure

```
spotiarr/
├── src/
│   ├── backend/          # Express backend API
│   │   ├── src/
│   │   │   ├── routes/   # API Routes
│   │   │   ├── services/ # Business Logic
│   │   │   └── entities/ # Database Entities
│   │   └── package.json
│   └── frontend/         # React 18 + Vite frontend
│       ├── src/
│       │   └── app/
│       │       ├── components/
│       │       ├── models/
│       │       └── services/
│       └── package.json
└── package.json          # Root workspace
```

## Development Workflow

### 1. Create a Branch

Always create a feature branch from `main`:

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### 2. Make Changes

- Write clean, readable code
- Follow existing code style and patterns
- Add comments for complex logic
- Update tests as needed

### 3. Test Your Changes

Run linting:

```bash
pnpm lint
```

Format code:

```bash
pnpm format
```

Test the application manually:

```bash
pnpm dev
```

**Note**: Pre-commit hooks will automatically run linting and formatting on staged files before each commit.

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add playlist import feature"
```

Commit message format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Create a Pull Request on GitHub with:

- Clear title describing the change
- Detailed description of what and why
- Screenshots/videos if UI changes
- Reference to any related issues

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
- Use TanStack Query for server state and Zustand for UI state
- Co-locate types and hooks with components when it improves readability

### Express Services

- Use manual instantiation in constructors (no dependency injection container)
- Keep routes thin, logic in services
- Use DTOs for request/response validation
- Handle errors with proper HTTP status codes
- Use `console` for logging (wrapped in service helpers)
- Use **Server-Sent Events (SSE)** via the `/api/events` endpoint for pushing
  server-side updates to the frontend instead of WebSockets.

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Linting passes (`pnpm lint`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Pre-commit hooks pass successfully
- [ ] No console.log or debug code left in
- [ ] Documentation updated if needed
- [ ] Commits are clean and well-described

### PR Description Should Include

- Summary of changes
- Motivation and context
- How to verify the changes
- Screenshots/videos for UI changes
- Breaking changes (if any)
- Related issue numbers

### Review Process

- Maintainers will review your PR
- Address feedback and comments
- Keep discussions constructive
- Be patient - reviews take time

## Getting Help

- Check existing issues and documentation
- Ask questions in GitHub Discussions
- Join community channels (if available)

For a deeper technical overview of SpotiArr (architecture, queues, SSE,
frontend data flow), see
[`docs/technical-overview.md`](docs/technical-overview.md).

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a positive environment

Thank you for contributing to SpotiArr! 🎵
