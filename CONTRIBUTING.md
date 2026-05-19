# Contributing to Claude Code Settings GUI

Thanks for your interest in contributing! This project aims to make Claude Code configuration easier for everyone.

## Quick Start

```bash
git clone https://github.com/Lumara-Systems-LLC/claude-code-settings-gui.git
cd claude-code-settings-gui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard shows a banner if it can't find a Claude config directory — click "Initialize" to seed a minimal one for testing.

## Project structure

The sidebar has 6 top-level sections. Each is a Next.js App Router route group with a shared `layout.tsx` that renders `<MainLayout>` plus a tab strip across the top.

```
src/
├── app/
│   ├── page.tsx                       # Overview (dashboard)
│   ├── (config)/config/               # CLAUDE.md, settings.json, settings.local.json, README, host, system-architecture
│   ├── (artifacts)/artifacts/         # rules, skills, agents, hooks, commands, output-styles, workflows, templates, prompts (+ [name|filename] detail pages)
│   ├── (integrations)/integrations/   # mcp-servers, plugins, projects, git
│   ├── (data)/data/                   # files, plans (+ [filename] detail), storage, backups
│   ├── (insights)/insights/           # usage-stats, commands-index, hooks (metrics), history, audit
│   └── api/                           # All server routes — /api/<resource>/route.ts
├── components/
│   ├── ui/                            # ShadCN primitives
│   ├── layout/                        # main-layout, sidebar, mobile-sidebar, header, section-tabs, artifact-tabs
│   ├── dashboard/                     # stats-card, health-strip, quick-launcher, activity-feed, storage-breakdown, …
│   ├── editors/                       # Monaco wrappers (Markdown / Code)
│   ├── search/                        # Command palette
│   └── onboarding/                    # Welcome, tour, starter packs
├── hooks/                             # React hooks
├── lib/                               # constants (PATHS), nav, keyboard-shortcuts, file-utils, audit-log, reveal-tokens, demo-data, …
├── schemas/                           # Zod schemas
└── types/                             # TypeScript types
tests/                                 # Vitest tests
bin/cli.js                             # npm bin entrypoint
```

### Section layout pattern

Every section layout looks like this (`"use client"` is required — Lucide icon refs can't cross the RSC boundary):

```tsx
"use client";
import { MainLayout } from "@/components/layout";
import { SectionTabs } from "@/components/layout/section-tabs";
// ...
const SECTION_TABS = [{ href: "/<section>/<tab>", title: "...", icon: SomeIcon }, ...];

export default function SectionLayout({ children }) {
  return (
    <MainLayout>
      <div className="space-y-6">
        <SectionTabs tabs={SECTION_TABS} />
        {children}
      </div>
    </MainLayout>
  );
}
```

**Pages MUST NOT wrap themselves in `<MainLayout>`** — the section layout provides it. Page components return their inner content directly (loading skeleton, error alert, or main body).

The `/artifacts/*` section uses a hardcoded `<ArtifactTabs>` instead of the generic `<SectionTabs>` (its tabs config is inside the component, so its layout stays a pure Server Component).

## How to add a new artifact kind

Most artifacts follow the same pattern. Copy `artifacts/commands/` end-to-end (it's the simplest full example) and adapt:

1. **Add the source path** in `src/lib/constants.ts` to `PATHS` if it's a new dir.
2. **API route** at `src/app/api/<kind>/route.ts`:
   - GET `?filename=X` → return one file
   - GET (no params) → list all files
   - PUT → update (uses `createBackup` + atomic write — both already in `file-utils.ts`)
   - POST → create new
   - DELETE → delete (requires `confirmed: true` in body)
   - Always gate with `IS_DEMO_MODE` for writes
   - Use `PATHS.YOUR_DIR`, never hardcoded `~/.claude`
3. **List page** at `src/app/(artifacts)/artifacts/<kind>/page.tsx`:
   - TanStack Query `useQuery({ queryKey: ["<kind>"] })`
   - Use `<CreateMarkdownFileDialog>` for the "New X" button — set `routePrefix="/artifacts/<kind>"`
   - Loading skeleton + error Alert + empty state — return them directly, no `<MainLayout>` wrapper
4. **Detail page** at `src/app/(artifacts)/artifacts/<kind>/[filename]/page.tsx`:
   - `useQuery` for the file, `useMutation` for save/delete
   - Use `<MarkdownEditor>` (or `<CodeEditor language="shell" />` for hooks) — Cmd+S, preview, dark mode handled for you
   - Back arrow points to `/artifacts/<kind>`; delete dialog redirects via `router.push("/artifacts/<kind>")`
5. **Tab entry** — add to `ARTIFACT_TABS` in `src/components/layout/artifact-tabs.tsx`.
6. **Command palette** — add to the `Artifacts` group in `pageGroups` AND to `typeRoutes` (if the fuzzy search API returns this type) in `src/components/search/command-palette.tsx`.
7. **Keyboard shortcut** — add a letter to `G_JUMP_SHORTCUTS` in `src/lib/keyboard-shortcuts.ts` if it deserves one.
8. **Stats endpoint** — update `src/app/api/stats/route.ts` if you want a count surfaced on the dashboard.

For non-artifact sections (Config, Integrations, Data, Insights), the recipe is the same minus step 5 — instead, add the new tab to that section's `layout.tsx` `*_TABS` array.

## Patterns to follow

- **File I/O**: only via `readFile` / `writeFile` / `deleteFile` from `@/lib/file-utils`. They enforce `validatePath`, atomic writes via temp file + rename, and emit audit log entries.
- **Path constants**: import `PATHS` and `CLAUDE_DIR` from `@/lib/constants`. Never write `join(homedir(), ".claude", ...)`.
- **Sensitive files**: use `isSensitive(path)` from `@/lib/file-utils` to decide whether to mask. The reveal-token flow is in `@/lib/reveal-tokens` and `/api/files/reveal-token`.
- **Demo mode**: every API route should short-circuit writes when `IS_DEMO_MODE`. Reads should return demo data from `@/lib/demo-data` or local stubs.
- **Validation**: schemas in `src/schemas/`. Use `formatValidationErrors(error)` to render Zod errors to users.

## Code style

- TypeScript strict mode is on.
- Functional components only.
- Prefer `type` aliases over `interface` (unless extending).
- No `any` — use `unknown` and narrow.
- ShadCN components from `@/components/ui`. New primitives via `npx shadcn@latest add`.
- Tailwind utilities only — no CSS-in-JS.

## Commits

Conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code change that's neither feat nor fix
- `test:` — adding/updating tests
- `chore:` — maintenance

## Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:ui       # vitest UI
npm run typecheck     # tsc --noEmit
```

Test files live in `tests/`. The Vitest config aliases `@` to `src/` so imports work the same way.

When adding a new section, smoke-tests are appreciated for:
- The API route's happy path (mock the filesystem with a `tmpdir`)
- Any new schema validation rules

## PR checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes (pre-existing warnings are okay; new ones aren't)
- [ ] `npm run build` succeeds
- [ ] If the section is user-visible: screenshot in the PR description

## Reporting issues

[Open an issue](https://github.com/Lumara-Systems-LLC/claude-code-settings-gui/issues/new). Include:
- Steps to reproduce
- Expected vs actual behavior
- Output of `npm run dev` if the server complains
- Your OS, Node version

For sensitive bugs (anything that could leak secrets), email instead of filing publicly.

## Questions?

Open a discussion or issue — happy to help.
