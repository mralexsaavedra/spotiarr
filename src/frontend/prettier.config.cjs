const baseConfig = require("@spotiarr/prettier-config");

/** @type {import("prettier").Config} */
module.exports = {
  ...baseConfig,
  plugins: ["@trivago/prettier-plugin-sort-imports", ...(baseConfig.plugins || [])],
  importOrder: ["<THIRD_PARTY_MODULES>", "^@/(.*)$", "^[./]"],
  importOrderParserPlugins: ["typescript", "jsx", "classProperties", "decorators-legacy"],
};
