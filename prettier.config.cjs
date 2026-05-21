/** @type {import("prettier").Config} */
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: "always",
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: ["<THIRD_PARTY_MODULES>", "^@/(.*)$", "^[./]"],
  importOrderParserPlugins: ["typescript", "decorators-legacy", "classProperties"],
  overrides: [
    {
      files: "apps/frontend/**/*.{ts,tsx,css,json}",
      options: {
        plugins: ["@trivago/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],
        importOrderParserPlugins: ["typescript", "jsx", "classProperties", "decorators-legacy"],
      },
    },
  ],
};
