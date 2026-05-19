# ADR-001: Documentation File Auto-Generation Prompt

**Status:** Proposed  
**Date:** 2026-05-18  
**Authors:** Claude Code Settings GUI Team

---

## Context

Claude Code's `~/.claude` directory supports two optional but highly recommended documentation files:

| File | Purpose |
|------|---------|
| `HOST.md` | Machine-specific documentation (hardware specs, networking details, local services, SSH configuration) |
| `SYSTEM_ARCHITECTURE.md` | Technical documentation of the user's Claude Code system (toolchain, conventions, project structure, CI/CD) |

These files give Claude Code deeper context about the user's environment and improve the quality of its responses. However, new users often don't know these files exist or how to start writing them.

Currently, when a user navigates to the Host or System Architecture settings pages and the files don't exist, they see an error alert. This is reactive and doesn't guide the user toward creating these valuable documents.

## Decision

Introduce an **opt-in documentation file generation prompt** that:

1. **Detects** missing `HOST.md` and/or `SYSTEM_ARCHITECTURE.md` on dashboard load (via the existing `/api/config-status` endpoint extended with doc-file checks).
2. **Presents** a non-intrusive banner (below the config-status banner) offering to generate starter templates for any missing documentation files.
3. **Generates** sensible default content using system information (OS, hostname, CPU info for HOST.md; Claude Code directory structure for SYSTEM_ARCHITECTURE.md).
4. **Remembers** the user's choice — if they dismiss the prompt, it won't show again (tracked via `localStorage` using the existing onboarding state pattern).

### Implementation details

- **API:** Extend `GET /api/config-status` to include a `missingDocs` array (`hostMd`, `systemArchitecture`). Add a new `POST /api/docs-generate` endpoint that accepts `{ files: ["hostMd", "systemArchitecture"] }` and generates the files.
- **Component:** A new `DocsGenerationBanner` client component rendered in the dashboard, conditionally shown when `missingDocs` is non-empty. Uses a `Dialog` for the generation step so the user can review what will be created.
- **State:** Persist dismissal state in the existing `useOnboarding` hook under a new `docsPromptDismissed` flag.

### Template content

**HOST.md** template includes auto-detected:
- OS (from `process.platform`, `process.version`)
- Hostname (from `os.hostname()`)
- CPU model and cores
- Memory (total)
- Network interfaces (names and IPs, redacting private info as needed)
- Placeholders for user-specific sections (local services, SSH, DNS)

**SYSTEM_ARCHITECTURE.md** template includes:
- Claude Code directory overview
- Key files and their purposes
- Convention sections (coding, commit, testing)
- Placeholders for user's project structure and toolchain

### Non-goals

- This does **not** automatically generate the files on first run without user consent.
- This does **not** overwrite existing files.
- This does **not** collect or transmit any system information outside the local process.

## Consequences

### Positive
- New users are guided toward creating documentation files that improve Claude Code's context.
- Auto-detected system info reduces the manual effort of starting `HOST.md`.
- The opt-in approach respects user agency.

### Negative
- Adds a small amount of additional UI surface on the dashboard (one banner, dismissible).
- System info collection (OS, CPU, hostname) happens server-side but stays local — users should be informed of this.

### Trade-offs considered
- **Alternative 1:** Auto-generate on first boot. Rejected — too opinionated, users may not want these files.
- **Alternative 2:** Only prompt from the individual settings pages. Rejected — users may never visit those pages.
- **Alternative 3:** Bundle into the welcome dialog. Rejected — welcome dialog already has 3 CTAs; adding more would be overwhelming.
