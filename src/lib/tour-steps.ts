export interface TourStep {
  id: string;
  target: string; // CSS selector or data-tour-step value
  title: string;
  content: string;
  tip?: string; // Optional pro tip for the step
  icon?: string; // Lucide icon name
  position?: "top" | "bottom" | "left" | "right";
}

export const dashboardTourSteps: TourStep[] = [
  {
    id: "welcome",
    target: "[data-tour-step='stats']",
    title: "Welcome to Claude Code Settings",
    content:
      "This dashboard gives you an overview of your Claude Code configuration. Let's take a quick tour of the main features.",
    tip: "You can restart this tour anytime from the help menu in the header.",
    icon: "Sparkles",
    position: "bottom",
  },
  {
    id: "rules",
    target: "[data-tour-step='rules']",
    title: "Rules",
    content:
      "Rules are development guidelines that Claude follows. Core rules apply globally, while path-specific rules auto-load for matching files.",
    tip: "Create language-specific rules (e.g., typescript.md) that activate only when working with matching files.",
    icon: "ScrollText",
    position: "bottom",
  },
  {
    id: "skills",
    target: "[data-tour-step='skills']",
    title: "Skills",
    content:
      "Skills are reusable workflows you can invoke with /skill-name in your conversation. Create skills for common tasks like testing or code review.",
    tip: "Try /commit for smart commit messages or /review-pr for code reviews!",
    icon: "Zap",
    position: "bottom",
  },
  {
    id: "agents",
    target: "[data-tour-step='agents']",
    title: "Agents",
    content:
      "Agents are specialized AI roles with domain expertise. Use them for complex tasks like database work or security audits.",
    tip: "Agents can have their own system prompts and tool permissions for focused tasks.",
    icon: "Bot",
    position: "bottom",
  },
  {
    id: "hooks",
    target: "[data-tour-step='hooks']",
    title: "Hooks",
    content:
      "Hooks are scripts that run automatically in response to Claude Code events. Use them for validation, logging, or automation.",
    tip: "Use PreToolCall hooks to validate or modify tool inputs before execution.",
    icon: "Webhook",
    position: "bottom",
  },
  {
    id: "quick-actions",
    target: "[data-tour-step='quick-actions']",
    title: "Quick Actions",
    content:
      "Access your most important configuration files directly from here. Edit CLAUDE.md for global instructions, or settings.json for permissions.",
    tip: "CLAUDE.md instructions are loaded into every conversation with Claude.",
    icon: "Rocket",
    position: "right",
  },
  {
    id: "storage",
    target: "[data-tour-step='storage-overview']",
    title: "Storage Overview",
    content:
      "Monitor your Claude Code storage usage here. Run cleanup periodically to free up space from old conversation history.",
    tip: "Safe cleanup removes only completed sessions while preserving recent work.",
    icon: "HardDrive",
    position: "left",
  },
  {
    id: "config-files",
    target: "[data-tour-step='config-files']",
    title: "Configuration Files",
    content:
      "These are your main configuration files. CLAUDE.md contains your global instructions, settings.json manages permissions and integrations.",
    tip: "That's the tour! Explore the sidebar to dive deeper into each section.",
    icon: "FileCode",
    position: "top",
  },
];
