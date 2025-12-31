/**
 * Centralized help content for the ClaudeCodeSettingsGUI
 * Organized by feature area for easy maintenance
 */

export const helpContent = {
  // Settings.json Editor
  settings: {
    allowPatterns: {
      title: "Allow Patterns",
      description:
        "Patterns that grant Claude permission to run specific commands without asking. Use wildcards (*) for flexibility.",
      examples: [
        "Bash(npm run:*) - Allow all npm run commands",
        "Bash(git status:*) - Allow git status",
        "Read(*.md) - Allow reading markdown files",
        "Edit(src/**) - Allow editing files in src/",
      ],
    },
    denyPatterns: {
      title: "Deny Patterns",
      description:
        "Patterns that block Claude from running certain commands. Deny rules take precedence over allow rules.",
      examples: [
        "Bash(rm -rf:*) - Block dangerous delete commands",
        "Edit(.env*) - Prevent editing environment files",
      ],
    },
    mcpServers: {
      title: "MCP Servers",
      description:
        "Model Context Protocol servers extend Claude's capabilities with external tools and data sources.",
      fields: {
        command: "The shell command to start the MCP server",
        args: "Command-line arguments passed to the server",
        url: "WebSocket URL for remote MCP servers",
        env: "Environment variables passed to the server process",
      },
    },
    hooks: {
      title: "Hooks",
      description:
        "Shell commands or prompts that run automatically in response to Claude Code events.",
      eventTypes: {
        PreToolCall: "Runs before a tool is executed",
        PostToolCall: "Runs after a tool completes",
        Notification: "Runs when Claude sends a notification",
        Stop: "Runs when Claude stops or completes a task",
        SubagentStop: "Runs when a subagent completes",
      },
    },
  },

  // Storage page
  storage: {
    ephemeralData: {
      title: "Ephemeral Data",
      description:
        "Temporary files that can be safely deleted. Includes conversation history, caches, and temporary state that Claude Code regenerates as needed.",
    },
    cleanableSpace: {
      title: "Cleanable Space",
      description:
        "The amount of disk space that can be recovered by running cleanup. Only affects files older than the selected threshold.",
    },
    cleanupModes: {
      normal: {
        title: "Normal Cleanup",
        description:
          "Removes ephemeral data older than 30 days. Safe for regular use - keeps recent conversation context.",
      },
      aggressive: {
        title: "Aggressive Cleanup",
        description:
          "Removes ephemeral data older than 7 days. Frees more space but removes more recent history.",
      },
    },
    dryRun: {
      title: "Dry Run",
      description:
        "Preview what would be deleted without actually removing any files. Recommended before running cleanup.",
    },
  },

  // Creation dialogs
  creation: {
    skill: {
      name: {
        title: "Skill Name",
        description:
          "A unique identifier for your skill. Use lowercase letters, numbers, and hyphens only.",
        example: "api-design, test-gen, deploy-prod",
      },
      description: {
        title: "Skill Description",
        description:
          "Briefly describe what this skill does. This appears in the skill list and helps users find it.",
      },
      structure: {
        title: "Skill Structure",
        description:
          "Skills are stored in ~/.claude/skills/{name}/SKILL.md. The SKILL.md file contains the prompt that Claude follows when the skill is invoked.",
      },
    },
    rule: {
      name: {
        title: "Rule Name",
        description:
          "A descriptive name for your rule. Use lowercase letters and hyphens.",
        example: "typescript, security, testing",
      },
      pathPattern: {
        title: "Path Pattern",
        description:
          "Optional glob pattern to auto-load this rule for matching files. Leave empty for a core rule.",
        example: "**/*.ts, src/components/**/*.tsx",
      },
      structure: {
        title: "Rule Structure",
        description:
          "Rules are stored in ~/.claude/rules/{name}.md. Path-specific rules include a path pattern in their frontmatter.",
      },
    },
    agent: {
      name: {
        title: "Agent Name",
        description:
          "A unique identifier for your agent. Use lowercase letters and hyphens.",
        example: "db-specialist, security-auditor",
      },
      model: {
        title: "Model Selection",
        description:
          "Choose the AI model for this agent. Opus is most capable, Sonnet is balanced, Haiku is fastest and cheapest.",
      },
      structure: {
        title: "Agent Structure",
        description:
          "Agents are stored in ~/.claude/agents/{name}/AGENT.md. The AGENT.md file defines the agent's role and capabilities.",
      },
    },
    hook: {
      name: {
        title: "Hook Name",
        description:
          "A descriptive name for your hook. Use lowercase letters and hyphens.",
        example: "pre-commit-lint, post-test-notify",
      },
      event: {
        title: "Hook Event",
        description:
          "The Claude Code event that triggers this hook. Common events include PreToolCall, PostToolCall, and Stop.",
      },
      matcher: {
        title: "Matcher Pattern",
        description:
          "Optional pattern to filter which tool calls trigger this hook. Only applies to PreToolCall and PostToolCall events.",
        example: "Bash, Edit, Write",
      },
      structure: {
        title: "Hook Structure",
        description:
          "Hooks are shell scripts stored in ~/.claude/hooks/{name}.sh. They receive event data via environment variables.",
      },
    },
  },

  // Dashboard
  dashboard: {
    rules: {
      title: "Rules",
      description:
        "Development guidelines that Claude follows. Core rules apply globally, path-specific rules auto-load for matching files.",
      usage: "Create rules to enforce coding standards, security practices, or project conventions.",
    },
    skills: {
      title: "Skills",
      description:
        "Reusable workflows that Claude can execute. Invoke with /skill-name in your conversation.",
      usage: "Create skills for common tasks like generating tests, reviewing code, or setting up projects.",
    },
    agents: {
      title: "Agents",
      description:
        "Specialized AI roles with specific expertise. Agents can be assigned to handle complex, domain-specific tasks.",
      usage: "Create agents for database work, security audits, frontend reviews, or infrastructure tasks.",
    },
    hooks: {
      title: "Hooks",
      description:
        "Automated scripts that run in response to Claude Code events. Use for validation, logging, or notifications.",
      usage: "Create hooks to enforce pre-commit checks, log activity, or trigger CI/CD pipelines.",
    },
    storage: {
      title: "Storage Overview",
      description:
        "Disk space used by Claude Code data. Includes conversation history, caches, and configuration files.",
      usage: "Monitor storage usage and run cleanup periodically to free space.",
    },
  },

  // General
  general: {
    claudeMd: {
      title: "CLAUDE.md",
      description:
        "Your global instructions file. Claude reads this at the start of every conversation to understand your preferences and project context.",
    },
    settingsJson: {
      title: "settings.json",
      description:
        "Configuration file for permissions, MCP servers, and hooks. Controls what Claude can do and how it integrates with external tools.",
    },
  },
} as const

export type HelpContentKey = keyof typeof helpContent
