# Changelog

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Information architecture overhaul.** Sidebar collapsed from 28 items across 5 collapsible groups to 6 flat top-level sections: Overview · Config · Artifacts · Integrations · Data · Insights. Each section's destination page renders a tab strip across the top — sub-items are one click away.
- **Route consolidation.** Every page moved under a route group matching its section:
  - `/claude-md`, `/settings-json`, `/settings-local`, `/readme`, `/host`, `/system-architecture` → `/config/*`
  - `/rules`, `/skills`, `/agents`, `/hooks`, `/commands`, `/output-styles`, `/workflows`, `/templates`, `/prompts` (and their detail pages) → `/artifacts/*`
  - `/mcp-servers`, `/plugins`, `/projects`, `/git` → `/integrations/*`
  - `/files`, `/plans` (+ detail), `/storage`, `/backups` → `/data/*`
  - `/usage-stats`, `/commands-index`, `/hooks/metrics`, `/history`, `/audit` → `/insights/*`
  - Old route group directories (`(management)`, `(settings)`, `(system)`) removed entirely; old top-level dirs (`audit/`, `backups/`, `files/`, etc.) removed entirely. **No backwards-compat redirects** — old URLs 404. Cmd+K, sidebar, g-jumps, and dashboard widgets all updated.
- **Dashboard rebuilt.** Replaced the thin stats-only dashboard with a hybrid layout: health strip (system / git / hook health), stats strip, quick launcher tiles, activity feed (recent audit entries), and storage breakdown.

### Added

- Shared `SectionTabs` component (`src/components/layout/section-tabs.tsx`) — generic tab strip used by Config / Integrations / Data / Insights layouts; `ArtifactTabs` continues to power `/artifacts/*`.
- `src/lib/nav.ts` — top-level nav config consumed by both desktop and mobile sidebars; `isTopLevelActive()` highlights the active section based on `pathname`.
- `.claude/` project config for contributors: `CLAUDE.md` with codebase context, conventions, and gotchas; `settings.json` with a modest dev-command allowlist.

### Fixed

- Duplicate-key React warning on `/insights/commands-index` — switched key from `${type}-${name}` to `${type}-${path}` so collisions (e.g., two hooks named `bash` from different events) no longer fire.

## [1.0.0] - 2026-05-18

First major release. Comprehensive visual manager for `~/.claude/`.

### Added

#### Open-source foundation
- Configurable Claude config directory via `CLAUDE_CONFIG_DIR` env var or `--config-dir` CLI flag (default: `~/.claude`)
- Sensitive file masking (`.env`, `.credentials.json`, `*.key`, `*.pem`, anything matching `*secret*`/`*token*`/`*password*`) with single-use reveal tokens and auto re-hide
- Dockerfile + docker-compose.yml for one-command containerized runs
- `bin/cli.js` launcher with `--config-dir`, `--port`, `--demo`, `--help` flags
- First-run detection: config status banner on dashboard with one-click "Initialize" + starter packs
- Vitest test suite with 17 tests covering file utils + reveal-token lifecycle

#### Settings editors
- **CLAUDE.md** editor with live Markdown preview
- **settings.json** full coverage: General (model, statusLine, thinking/teams toggles, attribution), Permissions (allow/deny/ask/additionalDirectories), MCP Servers, Hooks, Plugins, Raw JSON
- **settings.local.json** editor for machine-specific overrides
- **README.md**, **SYSTEM_ARCHITECTURE.md**, **HOST.md** as first-class editable docs

#### Management sections
- Rules, Skills, Agents, Hooks (existing — kept)
- New: Commands, Output Styles, Workflows
- Templates with built-in gallery, custom templates, URL import, starter packs
- Prompts with full CRUD

#### System sections
- MCP Servers with Installed / Registry / Auth status tabs
- Files browser with sensitive-reveal flow
- Plans browser (read-only, search, bulk delete by age)
- Storage analyzer with pie/bar charts, cleanup, backup/restore
- **Backups** browser — list all `.backup.{ts}` files, one-click restore, bulk delete
- Plugins management (toggle enabled/disabled)
- Projects deep-dive (list, view memory.json, bulk-delete by age)
- Git status / stage / commit

#### Insights
- **Usage Stats** dashboard (recharts): 30-day activity line chart, tokens by model, top hooks by execution count + avg duration, hook success rate
- **Slash Commands Index** read-only catalog with search and type filters
- Hook Metrics (existing — kept)
- **History** search across `history.jsonl`, filterable by project
- **Audit Log** of every write/delete made through the GUI

#### UX
- Command palette (`⌘K`) indexes every section
- g-style jump shortcuts (`g d / s / r / a / h / c / j / l / o / w / t / p / n / m / f / u / b / i / v / x / g`) for vim-like navigation
- `?` opens shortcut help dialog
- Improved Markdown preview: GitHub-flavored Markdown (tables, task lists, strikethrough), syntax highlighting (highlight.js), inline copy-code buttons, anchor links on headings
- Dark mode throughout
- Live file watcher (SSE) auto-invalidates queries when files change on disk

### Changed

- Path resolution: every API route now imports `PATHS` / `CLAUDE_DIR` from `@/lib/constants` (was: 20+ files duplicating `join(homedir(), ".claude", ...)`)
- `HOOK_METRICS` path corrected from `hooks/hook-metrics.jsonl` to `hook-metrics.jsonl` at config root
- Sidebar reorganized into Dashboard / Settings / Management / System / Insights groups (30+ items)

### Fixed

- Git status parsing: leading-space column of porcelain output was being stripped by `.trim()`, mangling the first filename and misclassifying its staged status. Use `.trimEnd()` instead.
- Pre-existing lint errors in `tour-step.tsx`, `use-file-watcher.ts`, `use-onboarding.ts`, `file-watcher.tsx` — access-before-declared and setState-in-effect patterns
- `bin/cli.js`: launches process group cleanly, propagates SIGINT/SIGTERM

### Security

- All file I/O goes through `validatePath()` enforcing paths stay within `CLAUDE_DIR`
- Atomic writes via temp-file + rename
- Auto-backup before every write (browseable + restorable at `/data/backups`)
- Sensitive files never served without an explicit acknowledged-reveal token
- Demo mode disables all writes and reveal endpoints
