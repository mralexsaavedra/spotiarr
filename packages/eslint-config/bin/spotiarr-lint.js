#!/usr/bin/env node
/* eslint-env node */

import { ESLint } from "eslint";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function main() {
  const argv = process.argv.slice(2);

  const hasPathArg = argv.some((arg) => !arg.startsWith("-"));
  const argsWithDefault = hasPathArg ? argv : [".", ...argv];

  const paths = [];
  const otherArgs = [];
  let fix = false;

  for (const arg of argsWithDefault) {
    if (arg === "--fix") {
      fix = true;
    } else if (arg.startsWith("-")) {
      otherArgs.push(arg);
    } else {
      paths.push(arg);
    }
  }

  const eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: path.resolve(__dirname, "../eslint.config.js"),
    fix,
  });

  const filesToLint = paths.length > 0 ? paths : ["."];
  const results = await eslint.lintFiles(filesToLint);

  if (fix) {
    await ESLint.outputFixes(results);
  }

  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  if (resultText) {
    console.log(resultText);
  }

  const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
  const warningCount = results.reduce((sum, r) => sum + r.warningCount, 0);

  const maxWarningsIndex = otherArgs.findIndex((arg) => arg === "--max-warnings");
  let maxWarnings;
  if (maxWarningsIndex !== -1 && otherArgs[maxWarningsIndex + 1]) {
    const parsed = Number.parseInt(otherArgs[maxWarningsIndex + 1], 10);
    if (!Number.isNaN(parsed)) {
      maxWarnings = parsed;
    }
  }

  if (errorCount > 0 || (typeof maxWarnings === "number" && warningCount > maxWarnings)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
