/**
 * Starter Packs - Pre-configured Claude Code setups for quick onboarding
 */

export interface StarterPackFile {
  path: string; // Relative to ~/.claude
  content: string;
  executable?: boolean;
}

export interface StarterPack {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  files: StarterPackFile[];
  settingsJson?: object; // Merged into settings.json
}

// Minimal CLAUDE.md for all packs
const MINIMAL_CLAUDE_MD = `# Claude Code Configuration

This is your Claude Code configuration directory.

## Quick Reference

- \`rules/\` - Development guidelines Claude follows
- \`skills/\` - Reusable workflows (invoke with /skill-name)
- \`settings.json\` - Permissions, MCP servers, hooks

## Getting Started

Edit this file to add project-wide instructions that Claude will follow.
`;

// Core development rules
const CORE_RULES = `# Core Development Principles

Universal rules that apply to all projects.

## Code Quality

- Optimize for **clarity, maintainability, and correctness** over cleverness
- Prefer **explicit behavior** over hidden or magic abstractions
- Break complex logic into **small, single-purpose functions**
- Apply the **Single Responsibility Principle** consistently

## Error Handling

- Errors must be explicit, logged with context, and user-friendly
- Provide likely causes and ranked solutions
- Use structured logging with levels

## Environment Files

- Never commit secrets to version control
- Document required variables in \`.env.example\`
- Warn if patterns resemble API keys or tokens
`;

// Git rules
const GIT_RULES = `# Git Standards

## Commit Messages

Use conventional commits format:

| Prefix | Usage |
|--------|-------|
| \`feat:\` | New feature |
| \`fix:\` | Bug fix |
| \`docs:\` | Documentation only |
| \`refactor:\` | Code change that neither fixes a bug nor adds a feature |
| \`test:\` | Adding or correcting tests |
| \`chore:\` | Maintenance tasks |

## Branch Naming

- \`feature/\` - New features
- \`fix/\` - Bug fixes
- \`hotfix/\` - Urgent production fixes

Example: \`feature/user-authentication\`, \`fix/login-validation\`
`;

// Security rules
const SECURITY_RULES = `# Security Rules

## Input Validation

- Sanitize all user input
- Validate at **system boundaries** (API, forms, external data)
- Never trust client-side validation alone

## Authentication & Authorization

- Enforce authentication & authorization explicitly
- Use industry-standard patterns (JWT, OAuth 2.0, session tokens)
- Never store sensitive data in localStorage

## Data Protection

- HTTPS for all external traffic
- Never log sensitive fields (passwords, tokens, PII)
- Hash passwords with bcrypt/argon2 (never MD5/SHA1)
`;

// Commit skill
const COMMIT_SKILL = `---
name: commit
description: Git commit assistant that generates branch names and commit messages from staged changes.
allowed-tools: Bash(git:*)
---

# Git Commit Assistant

Generate branch names and commit messages based on staged changes.

## Workflow

1. Run \`git status\` and \`git diff --cached\`
2. Analyze the staged changes
3. Generate conventional commit message

## Output Format

### Branch name
- Format: \`<type>/<short-slug>\`
- type: feat|fix|refactor|chore|docs|test

### Commit message
- Subject: \`<type>(<scope>): <imperative summary>\`
- Keep subject line ≤ 72 characters
- Body: 2-5 bullet points explaining key changes
`;

// Debug skill
const DEBUG_SKILL = `---
name: debug
description: Systematic debugging workflow for identifying and fixing issues.
---

# Debugging Workflow

## Methodology

1. **Reproduce** - Confirm the issue exists and is reproducible
2. **Isolate** - Narrow down where the bug occurs
3. **Hypothesize** - Form theories about the cause
4. **Verify** - Test hypotheses systematically
5. **Fix** - Implement and verify the solution

## Steps

1. Ask for error messages, stack traces, reproduction steps
2. Search codebase for relevant code
3. Add logging/debugging to trace execution
4. Form and test hypotheses
5. Implement minimal fix
6. Verify fix and check for regressions
`;

// Test generation skill
const TEST_GEN_SKILL = `---
name: test-gen
description: Generate comprehensive tests for existing code.
---

# Test Generator

Generate tests for the specified code.

## Output

- Unit tests for happy path
- Edge case tests
- Error handling tests
- Integration tests if applicable

## Principles

- Test behavior, not implementation
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
`;

// Review PR skill
const REVIEW_PR_SKILL = `---
name: review-pr
description: Review pull requests for security, performance, and code quality.
---

# PR Review Checklist

## Security
- [ ] No secrets or credentials in code
- [ ] Input validation present
- [ ] SQL injection prevention
- [ ] XSS prevention

## Performance
- [ ] No N+1 queries
- [ ] Appropriate caching
- [ ] No unnecessary re-renders

## Code Quality
- [ ] Clear naming
- [ ] Error handling
- [ ] Tests included
- [ ] Documentation updated
`;

// Minimal settings
const MINIMAL_SETTINGS = {
  permissions: {
    allow: [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Read(*.md)",
    ],
    deny: [
      "Read(.env)",
      "Read(.env.*)",
    ],
  },
};

// Developer settings
const DEVELOPER_SETTINGS = {
  permissions: {
    allow: [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npm install:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Read(*.md)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(grep:*)",
    ],
    deny: [
      "Read(.env)",
      "Read(.env.*)",
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
    ],
  },
};

// Full stack settings
const FULLSTACK_SETTINGS = {
  permissions: {
    allow: [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npm install:*)",
      "Bash(go build:*)",
      "Bash(go test:*)",
      "Bash(python3:*)",
      "Bash(pytest:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Read(*.md)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(grep:*)",
      "Bash(docker compose:*)",
      "Bash(curl:*)",
    ],
    deny: [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/.credentials*)",
      "Read(**/secrets/**)",
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(git reset --hard:*)",
    ],
  },
  mcpServers: {
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}",
      },
    },
  },
};

export const STARTER_PACKS: StarterPack[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Basic setup with just CLAUDE.md and essential permissions. Perfect for getting started.",
    icon: "Leaf",
    tags: ["beginner", "simple"],
    files: [
      { path: "CLAUDE.md", content: MINIMAL_CLAUDE_MD },
    ],
    settingsJson: MINIMAL_SETTINGS,
  },
  {
    id: "developer",
    name: "Developer",
    description: "Common development setup with git rules, commit helper, and testing skills.",
    icon: "Code",
    tags: ["development", "git", "testing"],
    files: [
      { path: "CLAUDE.md", content: MINIMAL_CLAUDE_MD },
      { path: "rules/core.md", content: CORE_RULES },
      { path: "rules/git.md", content: GIT_RULES },
      { path: "skills/commit/SKILL.md", content: COMMIT_SKILL },
      { path: "skills/debug/SKILL.md", content: DEBUG_SKILL },
    ],
    settingsJson: DEVELOPER_SETTINGS,
  },
  {
    id: "full-stack",
    name: "Full Stack",
    description: "Complete setup for professional development with security rules, multiple skills, and MCP servers.",
    icon: "Layers",
    tags: ["professional", "security", "full-stack"],
    files: [
      { path: "CLAUDE.md", content: MINIMAL_CLAUDE_MD },
      { path: "rules/core.md", content: CORE_RULES },
      { path: "rules/git.md", content: GIT_RULES },
      { path: "rules/security.md", content: SECURITY_RULES },
      { path: "skills/commit/SKILL.md", content: COMMIT_SKILL },
      { path: "skills/debug/SKILL.md", content: DEBUG_SKILL },
      { path: "skills/test-gen/SKILL.md", content: TEST_GEN_SKILL },
      { path: "skills/review-pr/SKILL.md", content: REVIEW_PR_SKILL },
    ],
    settingsJson: FULLSTACK_SETTINGS,
  },
];

export function getStarterPack(id: string): StarterPack | undefined {
  return STARTER_PACKS.find((p) => p.id === id);
}
