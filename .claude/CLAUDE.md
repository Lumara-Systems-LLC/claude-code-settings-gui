# Claude Code Settings GUI — Project Context

A visual dashboard for managing the user's `~/.claude/` configuration directory — rules, skills, agents, hooks, commands, workflows, templates, prompts, output styles, MCP servers, plugins, projects, plans, and audit/usage data. Ships as an npm CLI (`claude-code-settings-gui`) that boots a local Next.js app.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19
- **State**: TanStack Query (server state); React `useState` for local UI
- **Styling**: Tailwind 4 + ShadCN UI primitives + Lucide icons
- **Editors**: Monaco (markdown + code) via `@monaco-editor/react`
- **Charts**: Recharts (used only on `/insights/hooks`)
- **Validation**: Zod
- **Testing**: Vitest + Testing Library + jsdom
- **Frontmatter parsing**: `gray-matter`
- **Demo mode**: `NEXT_PUBLIC_DEMO_MODE=true` swaps file-system reads for fixtures in `src/lib/demo-data.ts`

## Information architecture

The sidebar has 6 flat top-level items. Each lands on its first tab; the section's `layout.tsx` renders a tab strip across the top.

```
/                              Overview (dashboard)
/config/[file]                 CLAUDE.md, settings.json, settings.local.json, README, host, system-architecture
/artifacts/[kind]              rules, skills, agents, hooks, commands, output-styles, workflows, templates, prompts
/integrations/[tab]            mcp-servers, plugins, projects, git
/data/[tab]                    files, plans (+ [filename] detail), storage, backups
/insights/[tab]                usage-stats, commands-index, hooks (metrics), history, audit
/api/[resource]                file-system-backed CRUD (read/write under CLAUDE_DIR)
```

Top-level nav config lives in `src/lib/nav.ts`. Command palette mirror in `src/components/search/command-palette.tsx`. G-jump keyboard shortcuts in `src/lib/keyboard-shortcuts.ts`. Keep all three in sync when adding/moving routes.

## Layout pattern (important)

Each route group has its own `layout.tsx` that provides `<MainLayout>` AND a tab strip:

```tsx
"use client";   // REQUIRED — passes Lucide icon refs to <SectionTabs>
import { MainLayout } from "@/components/layout";
import { SectionTabs } from "@/components/layout/section-tabs";
// ...
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

**Pages MUST NOT wrap themselves in `<MainLayout>`** — the layout provides it. A page is just its inner content (loading/error/main returns are bare divs/alerts).

`/artifacts/*` is the exception: it uses a kind-specific `<ArtifactTabs>` (hardcoded tabs, no icon-prop boundary issue) so its layout is a pure Server Component.

## Where things live

- **Pages**: `src/app/(<section>)/<section>/<tab>/page.tsx`
- **API routes**: `src/app/api/<resource>/route.ts`
- **Path constants**: `src/lib/constants.ts` `PATHS` object (resolves to `~/.claude/...` or `$CLAUDE_CONFIG_DIR/...`)
- **Shared layouts**: `src/components/layout/` — main-layout, sidebar, header, section-tabs, artifact-tabs
- **UI primitives**: `src/components/ui/` (ShadCN — `npx shadcn add <comp>` to add more)
- **Dashboard widgets**: `src/components/dashboard/` — stats-card, health-strip, quick-launcher, activity-feed, storage-breakdown, etc.
- **Editors**: `src/components/editors/` (Monaco)
- **Onboarding**: `src/components/onboarding/` (tour, welcome dialog, starter packs)
- **Audit log helpers**: `src/lib/audit-log.ts` — wrap all file-write mutations with audit entries
- **Demo data**: `src/lib/demo-data.ts`
- **Types**: `src/types/`
- **Zod schemas**: `src/schemas/`

## Conventions

- **Server state** → TanStack Query (`useQuery` / `useMutation`). Invalidate the right query keys after mutations (look at neighboring code).
- **No prop drilling for icons across the RSC boundary**: if a layout (Server Component by default) needs to pass Lucide icons into a Client Component, mark the layout `"use client"`. Lucide icons are `forwardRef` objects and aren't serializable.
- **Detail-page deletes** redirect via `router.push("/<section>/<tab>")` then invalidate the list query.
- **Create-markdown dialogs** take a `routePrefix` prop — set it to the new path (e.g., `"/artifacts/commands"`) when adding a new artifact kind.
- **File mutations** always go through `/api/<resource>` (PUT/DELETE). The route handlers in `src/app/api/` enforce backups via `createBackup()` in `src/lib/file-utils.ts`.
- **No AI attribution** in commits, PRs, branches, or code comments.

## Commands

```bash
npm run dev          # Start dev server on :3000 (or next free port)
npm run build        # Production build
npm run start        # Run production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest run (one-shot)
npm run test:watch   # Vitest watch
npm run test:ui      # Vitest UI
```

## Gotchas

- **Stale `.next/types/` vs `.next/dev/types/`**: both are globbed by `tsconfig.json#include`. If a production build runs, `.next/types/` is written and its `LayoutRoutes`/`AppRoutes` snapshot becomes stale during dev. Symptom: `tsc --noEmit` reports `Type 'Route' does not satisfy the constraint '"/"'` errors in `.next/dev/types/validator.ts`. Fix: `rm -rf .next/types` (the dev variant under `.next/dev/types/` is regenerated each request).
- **Dev server already on :3000?** Next picks the next free port (3001, 3002, …). The bin entrypoint (`bin/cli.js`) tries the configured port and increments if taken.
- **`MainLayout` is a Client Component** (keyboard shortcuts, command palette state). Any layout that renders it is effectively client; don't fight it by adding server-only logic in section layouts.
- **`data-tour-step` attributes** in dashboard widgets and elsewhere are referenced by the onboarding tour in `src/components/onboarding/`. Preserve attribute names when refactoring widgets.
- **`CLAUDE_CONFIG_DIR` env var** overrides `~/.claude` resolution — set it for tests to point at a sandbox directory. See `src/lib/constants.ts#resolveClaudeDir`.
- **Demo mode** (`NEXT_PUBLIC_DEMO_MODE=true`) returns fixtures instead of touching the filesystem and rejects mutations with 403. The dashboard banner suppresses the "no config" prompt in demo mode.
- **Markdown vs shell-script editors**: hooks use `CodeEditor` (`language="shell"`), everything else uses `MarkdownEditor`. Don't swap them.

## Adding a new artifact kind

1. Add a tab entry in `src/components/layout/artifact-tabs.tsx#ARTIFACT_TABS`.
2. Create `src/app/(artifacts)/artifacts/<kind>/page.tsx` (list) and `[name]/page.tsx` (detail), modeled after `commands/` (simplest example).
3. Add a route in `src/app/api/<kind>/route.ts` for GET/PUT/DELETE backed by `~/.claude/<kind>/`.
4. Add an entry in `src/components/search/command-palette.tsx#pageGroups#Artifacts` and `typeRoutes` if it should appear in fuzzy search.
5. Add a g-jump in `src/lib/keyboard-shortcuts.ts` if it deserves one.
6. Update the stats endpoint at `src/app/api/stats/route.ts` if you want a count on the dashboard.
