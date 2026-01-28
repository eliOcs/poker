import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import lit from "eslint-plugin-lit";
import playwright from "eslint-plugin-playwright";

export default [
  js.configs.recommended,
  prettierConfig,
  {
    ignores: ["node_modules/**"],
  },
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
    rules: {
      complexity: ["error", 10],
      "max-lines": [
        "error",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["src/frontend/**/*.js"],
    ...lit.configs["flat/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        process: "readonly",
      },
    },
  },
  {
    files: ["test/frontend/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
        process: "readonly",
      },
    },
  },
  {
    // Playwright e2e and ui-catalog tests
    files: ["test/e2e/**/*.js", "test/ui-catalog/*.test.js"],
    ...playwright.configs["flat/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
