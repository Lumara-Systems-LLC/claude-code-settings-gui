import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // CLI entrypoint is intentionally CommonJS for `npx` compatibility.
    "bin/**",
    // Vitest config + tests live alongside src but use Vitest globals.
    "tests/**",
  ]),
  {
    rules: {
      // The "setState in effect" rule fires on the canonical "sync server
      // data into local form state" pattern used across every editor page.
      // It's a stylistic warning, not a correctness bug, and refactoring
      // every form to derive state during render would obscure intent.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
