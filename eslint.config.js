import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

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
  },
  {
    files: ["src/frontend/**/*.js"],
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
];
