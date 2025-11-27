const baseConfig = require("@spotiarr/prettier-config");

/** @type {import("prettier").Config} */
module.exports = {
  ...baseConfig,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: ["<THIRD_PARTY_MODULES>", "^@/(.*)$", "^[./]"],
  importOrderParserPlugins: ["typescript", "decorators-legacy", "classProperties"],
};
