/**
 * Demo data for Vercel deployment where ~/.claude doesn't exist.
 * Enable by setting NEXT_PUBLIC_DEMO_MODE=true
 */

export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_STATS = {
  rules: 8,
  skills: 12,
  agents: 5,
  hooks: 6,
  storage: {
    total: "124 MB",
    breakdown: [
      { name: "projects", size: "68 MB", bytes: 71303168 },
      { name: "skills", size: "2.4 MB", bytes: 2516582 },
      { name: "hooks", size: "156 KB", bytes: 159744 },
      { name: "rules", size: "48 KB", bytes: 49152 },
      { name: "agents", size: "32 KB", bytes: 32768 },
    ],
  },
};

export const DEMO_SKILLS = [
  {
    name: "commit",
    path: "~/.claude/skills/commit/SKILL.md",
    frontmatter: {
      name: "commit",
      description:
        "Git commit assistant that generates branch names and commit messages from staged changes.",
    },
    content: `# Commit Skill

Generate meaningful commit messages from staged changes.

## Usage

Run \`/commit\` after staging your changes.

## Features

- Analyzes staged diff
- Generates conventional commit messages
- Suggests branch names for new features
- Follows project commit conventions
`,
  },
  {
    name: "debug",
    path: "~/.claude/skills/debug/SKILL.md",
    frontmatter: {
      name: "debug",
      description:
        "Systematic debugging workflow for identifying and fixing issues.",
    },
    content: `# Debug Skill

Systematic approach to finding and fixing bugs.

## Methodology

1. **Reproduce** - Confirm the bug exists
2. **Isolate** - Narrow down the cause
3. **Hypothesize** - Form theories about the root cause
4. **Verify** - Test your fix
`,
  },
  {
    name: "test-gen",
    path: "~/.claude/skills/test-gen/SKILL.md",
    frontmatter: {
      name: "test-gen",
      description: "Generate comprehensive tests for existing code.",
    },
    content: `# Test Generation Skill

Automatically generate tests for your code.

## Supported Frameworks

- Jest / Vitest
- pytest
- Go testing
- Playwright (E2E)
`,
  },
  {
    name: "review-pr",
    path: "~/.claude/skills/review-pr/SKILL.md",
    frontmatter: {
      name: "review-pr",
      description:
        "Review pull requests with security, performance, and code quality analysis.",
    },
    content: `# PR Review Skill

Thorough code review for pull requests.

## Checks

- Security vulnerabilities
- Performance issues
- Code quality
- Test coverage
- Documentation
`,
  },
];

export const DEMO_RULES = [
  {
    name: "core",
    path: "~/.claude/rules/core.md",
    type: "core" as const,
    frontmatter: {},
    content: `# Core Development Principles

Universal rules that apply to all projects.

## Code Quality

- Optimize for clarity and maintainability
- Prefer explicit behavior over magic
- Single Responsibility Principle
`,
  },
  {
    name: "security",
    path: "~/.claude/rules/security.md",
    type: "core" as const,
    frontmatter: {},
    content: `# Security Rules

## Input Validation

- Sanitize all user input
- Validate at system boundaries
- Never trust client-side validation
`,
  },
  {
    name: "typescript",
    path: "~/.claude/rules/typescript.md",
    type: "path-specific" as const,
    pattern: "**/*.{ts,tsx}",
    frontmatter: {},
    content: `# TypeScript Rules

Applies to: \`**/*.{ts,tsx}\`

## Strict Mode

- Enable strict: true
- No any types without justification
- Prefer interfaces over type aliases
`,
  },
];

export const DEMO_AGENTS = [
  {
    name: "code-reviewer",
    path: "~/.claude/agents/code-reviewer.md",
    frontmatter: {
      name: "Code Reviewer",
      description: "Reviews code for quality, security, and best practices",
      model: "sonnet",
    },
    content: `# Code Reviewer Agent

Specialized agent for thorough code reviews.

## Focus Areas

- Security vulnerabilities
- Performance issues
- Code style consistency
- Test coverage
`,
  },
  {
    name: "architect",
    path: "~/.claude/agents/architect.md",
    frontmatter: {
      name: "System Architect",
      description: "Designs system architecture and makes technical decisions",
      model: "opus",
    },
    content: `# Architect Agent

High-level system design and architecture decisions.

## Responsibilities

- System design
- Technology selection
- Scalability planning
- Integration patterns
`,
  },
];

export const DEMO_HOOKS = [
  {
    name: "build-test-gate",
    path: "~/.claude/hooks/build-test-gate.sh",
    event: "PreToolUse",
    description: "Runs build and tests before committing",
  },
  {
    name: "startup",
    path: "~/.claude/hooks/startup.sh",
    event: "SessionStart",
    description: "Loads project context on session start",
  },
];

export const DEMO_HOOK_METRICS = {
  hooks: [
    {
      name: "build-test-gate",
      totalExecutions: 142,
      successCount: 138,
      failureCount: 4,
      avgDurationMs: 2340,
      lastExecuted: new Date().toISOString(),
    },
    {
      name: "startup",
      totalExecutions: 89,
      successCount: 89,
      failureCount: 0,
      avgDurationMs: 156,
      lastExecuted: new Date().toISOString(),
    },
  ],
};

export const DEMO_SETTINGS = {
  permissions: {
    allow: [
      "Bash(npm run:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Read(*.md)",
      "mcp__dbhub__*",
    ],
    deny: ["Bash(rm -rf:*)"],
  },
  mcpServers: {
    dbhub: {
      command: "npx",
      args: ["-y", "@anthropics/dbhub", "postgres://localhost/mydb"],
    },
    filesystem: {
      command: "npx",
      args: ["-y", "@anthropics/mcp-filesystem", "/home/user/projects"],
    },
  },
  hooks: {
    SessionStart: [
      {
        matcher: ".*",
        hooks: [
          {
            type: "command",
            command: "~/.claude/hooks/startup.sh",
          },
        ],
      },
    ],
  },
};

export const DEMO_CLAUDE_MD = `# AI Agent Operating Rules

Universal development rules for all AI agents.

## Quick Reference

| Rule File | Applies To |
|-----------|------------|
| core.md | All projects |
| security.md | Auth, input validation |
| testing.md | Test patterns |
| git.md | Commits, PRs |

## ABSOLUTE RULE

**NEVER edit \`.env\`** - Use \`.env.agent\` for AI changes only.

## Stack Skills

| Skill | Description |
|-------|-------------|
| \`/commit\` | Generate commit messages |
| \`/debug\` | Systematic debugging |
| \`/test-gen\` | Generate tests |
`;

export const DEMO_GIT_STATUS = {
  branch: "main",
  isClean: false,
  modified: ["CLAUDE.md", "settings.json"],
  staged: ["skills/commit/SKILL.md"],
  untracked: ["docs/new-feature.md"],
};

export const DEMO_STORAGE = {
  totalSize: "124 MB",
  totalBytes: 130023424,
  directories: [
    {
      name: "projects",
      path: "~/.claude/projects",
      size: "68 MB",
      bytes: 71303168,
      isPermanent: true,
    },
    {
      name: "skills",
      path: "~/.claude/skills",
      size: "2.4 MB",
      bytes: 2516582,
      isPermanent: true,
    },
    {
      name: "memory",
      path: "~/.claude/memory",
      size: "45 MB",
      bytes: 47185920,
      isPermanent: false,
    },
  ],
  ephemeralDirectories: [
    {
      name: "memory",
      path: "~/.claude/memory",
      size: "45 MB",
      bytes: 47185920,
    },
  ],
  cleanableSpace: "45 MB",
};
