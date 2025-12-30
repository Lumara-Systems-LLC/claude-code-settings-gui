# Contributing to Claude Code Settings GUI

Thanks for your interest in contributing! This project aims to make Claude Code configuration easier for everyone.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/Lumara-Systems-LLC/claude-code-settings-gui.git
cd claude-code-settings-gui

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (management)/       # Skills, rules, agents, hooks pages
│   ├── (settings)/         # CLAUDE.md, settings.json editors
│   ├── (system)/           # Git, storage, projects pages
│   └── api/                # API routes
├── components/             # React components
│   ├── ui/                 # ShadCN UI primitives
│   ├── layout/             # Layout components
│   └── editors/            # Editor components
├── lib/                    # Utilities and helpers
├── schemas/                # Zod validation schemas
└── types/                  # TypeScript types
```

## Development Guidelines

### Code Style

- TypeScript strict mode is enabled
- Use functional components with hooks
- Prefer named exports
- Use Zod for runtime validation

### Commits

Use conventional commit messages:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `chore:` - Maintenance

### Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `npm run lint` to check for issues
4. Submit a PR with a clear description

## Reporting Issues

Found a bug or have a feature request? [Open an issue](https://github.com/Lumara-Systems-LLC/claude-code-settings-gui/issues/new).

Please include:
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots if applicable

## Questions?

Open a discussion or issue - we're happy to help!
