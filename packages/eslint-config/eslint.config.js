// @ts-check
import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const config = [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["dist", "node_modules"],
    languageOptions: {
      parserOptions: {
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  prettierConfig,
];

export default config;
