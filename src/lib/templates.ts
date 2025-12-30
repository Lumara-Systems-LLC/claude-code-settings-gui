import type { Template, TemplateCategory } from "@/types/template";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: "skill", name: "Skills", description: "Workflow automations", icon: "Wand2" },
  { id: "rule", name: "Rules", description: "Development guidelines", icon: "FileText" },
  { id: "agent", name: "Agents", description: "Specialized roles", icon: "Bot" },
  { id: "hook", name: "Hooks", description: "Event triggers", icon: "Webhook" },
  { id: "mcp-server", name: "MCP Servers", description: "Tool integrations", icon: "Server" },
  { id: "permission", name: "Permissions", description: "Access patterns", icon: "Shield" },
];

export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: "skill-commit",
    name: "Git Commit Helper",
    description: "Generate conventional commit messages from staged changes",
    category: "skill",
    tags: ["git", "workflow"],
    filename: "commit",
    content: `# Commit Helper\n\nGenerate branch names and commit messages from staged changes.\n\n## Workflow\n\n1. Check git status for staged changes\n2. Analyze the diff\n3. Generate conventional commit message`,
  },
  {
    id: "skill-test-gen",
    name: "Test Generator",
    description: "Generate comprehensive tests for existing code",
    category: "skill",
    tags: ["testing", "automation"],
    filename: "test-gen",
    content: `# Test Generator\n\nGenerate comprehensive tests for existing code.\n\n## Output\n\n- Unit tests for happy path\n- Edge case tests\n- Error handling tests`,
  },
  {
    id: "rule-typescript",
    name: "TypeScript Standards",
    description: "TypeScript coding standards and best practices",
    category: "rule",
    tags: ["typescript", "code-style"],
    filename: "typescript.md",
    content: `# TypeScript Standards\n\n## Type Safety\n\n- Enable strict mode\n- Avoid \`any\` - use \`unknown\`\n- Prefer interfaces for objects\n- Use type guards for narrowing`,
  },
  {
    id: "rule-security",
    name: "Security Guidelines",
    description: "Security best practices for all projects",
    category: "rule",
    tags: ["security", "owasp"],
    filename: "security.md",
    content: `# Security Guidelines\n\n## Input Validation\n\n- Sanitize all user input\n- Validate at system boundaries\n- Never trust client-side validation`,
  },
  {
    id: "agent-code-reviewer",
    name: "Code Reviewer",
    description: "Specialized agent for thorough code reviews",
    category: "agent",
    tags: ["review", "quality"],
    filename: "code-reviewer",
    content: `name: code-reviewer\nmodel: sonnet\ndescription: Thorough code review specialist\n\nFocus on security, performance, maintainability, and test coverage.`,
  },
  {
    id: "hook-pre-commit-lint",
    name: "Pre-commit Lint",
    description: "Run linter before commits",
    category: "hook",
    tags: ["git", "lint"],
    content: `{\n  "hooks": {\n    "PreToolUse": [{\n      "matcher": "Bash(git commit:*)",\n      "hooks": [{ "type": "command", "command": "npm run lint" }]\n    }]\n  }\n}`,
  },
  {
    id: "mcp-github",
    name: "GitHub Server",
    description: "GitHub API integration through MCP",
    category: "mcp-server",
    tags: ["github", "api"],
    content: `{\n  "mcpServers": {\n    "github": {\n      "command": "npx",\n      "args": ["-y", "@anthropic/mcp-server-github"],\n      "env": { "GITHUB_TOKEN": "your-token" }\n    }\n  }\n}`,
  },
  {
    id: "permission-npm-scripts",
    name: "NPM Scripts",
    description: "Allow common npm script commands",
    category: "permission",
    tags: ["npm", "scripts"],
    content: `{\n  "permissions": {\n    "allow": [\n      "Bash(npm run:*)",\n      "Bash(npm test:*)",\n      "Bash(npm install:*)"\n    ]\n  }\n}`,
  },
  {
    id: "permission-protect-env",
    name: "Protect Environment Files",
    description: "Prevent reading or modifying .env files",
    category: "permission",
    tags: ["security", "env"],
    content: `{\n  "permissions": {\n    "deny": [\n      "Read(.env)",\n      "Read(.env.*)",\n      "Edit(.env)",\n      "Write(.env)"\n    ]\n  }\n}`,
  },
];

export function getTemplatesByCategory(category: string): Template[] {
  return BUILT_IN_TEMPLATES.filter((t) => t.category === category);
}

export function searchTemplates(query: string): Template[] {
  const q = query.toLowerCase();
  return BUILT_IN_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q))
  );
}
