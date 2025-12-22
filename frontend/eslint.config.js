import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "src-tauri", "*.config.ts", "*.config.js"] },
  // Main configuration block
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,  // Use recommended instead of strict
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          // Allow hooks and context exports (standard React patterns)
          allowExportNames: [".*Context$", "^use[A-Z].*"],
        },
      ],

      // === TYPE SAFETY (Errors) ===
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // === DISABLED (too noisy for now) ===
      // These can be re-enabled gradually if desired
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/unbound-method": "off",  // Noisy in test files

      // === WARNINGS (nice to have) ===
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/require-await": "warn",

      // React/JSX Best Practices
      "react-hooks/exhaustive-deps": "error",

      // General Best Practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  // === FILE-SPECIFIC OVERRIDES ===
  // These must come after main config to inherit plugin definitions

  // Logger utility - console is intentional
  {
    files: ["**/utils/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  // Virtualized components - TanStack Virtual library compatibility
  {
    files: ["**/*Virtualized*.tsx"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
  // Test utilities - not production code
  {
    files: ["**/test/**"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // Context provider files - export hooks and context by design
  // Also includes barrel files that re-export compound components
  {
    files: ["**/*Context.tsx", "**/router.tsx", "**/input/ChatInput.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // Files with legitimate external state sync patterns (store/props → local state)
  // These are valid patterns where external state drives local state updates
  {
    files: [
      "**/use-chat-settings.ts",
      "**/use-chat-conversation-manager.ts",
      "**/use-dashboard-animations.ts",
      "**/GitHubPage.tsx",
      "**/GitHubRepoSelector.tsx",
      "**/PageTransition.tsx",
      "**/use-page-transition.ts",
      "**/ThinkingStepCard.tsx",
      "**/RichTextEditor.tsx",
      "**/use-design-tokens.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // VoiceSettings uses intentional dependency exclusion for initialization
  {
    files: ["**/VoiceSettings.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
