# Contributing to SpotiArr

Thank you for considering contributing to SpotiArr! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- **Node.js**: v23.10.0 or higher (use nvm: `nvm use`)
- **pnpm**: v9.0.0 or higher (`npm install -g pnpm`)
- **Python**: 3.11 or 3.12 (required for native module compilation)
- **Redis**: Required for queue management
- **FFmpeg**: Required for audio processing

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
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
PYTHON=$(which python3.11) npm run build-release
cd ../../../../../
```

4. Create a `.env` file in `src/backend` with your configuration:
```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
REDIS_HOST=localhost
REDIS_PORT=6379
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

# Terminal 2 - Frontend (http://localhost:4200)
pnpm start:fe
```

## Project Structure

```
spotiarr/
├── src/
│   ├── backend/          # NestJS backend API
│   │   ├── src/
│   │   │   ├── playlist/ # Playlist management
│   │   │   ├── track/    # Track download & search
│   │   │   └── shared/   # Shared services (Spotify, YouTube)
│   │   └── package.json
│   └── frontend/         # Angular frontend
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

Run tests:
```bash
pnpm test
```

Test the application manually:
```bash
pnpm dev
```

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
- `test:` - Adding or updating tests
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

### Angular Components

- One component per file
- Use OnPush change detection when possible
- Unsubscribe from observables in `ngOnDestroy`
- Use Angular services for business logic
- Follow Angular style guide conventions

### NestJS Services

- Use dependency injection
- Keep controllers thin, logic in services
- Use DTOs for request/response validation
- Handle errors with proper HTTP status codes
- Use decorators appropriately

## Testing

- Write unit tests for new features
- Maintain or improve code coverage
- Test edge cases and error handling
- Use meaningful test descriptions

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] No console.log or debug code left in
- [ ] Documentation updated if needed
- [ ] Commits are clean and well-described

### PR Description Should Include

- Summary of changes
- Motivation and context
- How to test the changes
- Screenshots/videos for UI changes
- Breaking changes (if any)
- Related issue numbers

### Review Process

- Maintainers will review your PR
- Address feedback and comments
- Keep discussions constructive
- Be patient - reviews take time

## Docker Development

Build Docker image:
```bash
pnpm docker:build
```

Run Docker container:
```bash
pnpm docker:run
```

## Getting Help

- Check existing issues and documentation
- Ask questions in GitHub Discussions
- Join community channels (if available)

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a positive environment

Thank you for contributing to SpotiArr! 🎵
