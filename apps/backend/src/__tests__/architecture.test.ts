import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");

// Architecture invariant applies to production source only.
// Integration tests are allowed to wire infrastructure for end-to-end behavior checks.
function walkSrcExcludingTests(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "__tests__") {
        continue;
      }
      files.push(...walkSrcExcludingTests(full));
      continue;
    }

    if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }

  return files;
}

function findMatches(files: string[], re: RegExp): string[] {
  return files.filter((file) => re.test(readFileSync(file, "utf8")));
}

function findCrossLayerViolations(
  sourceFiles: string[],
  sourceLabel: string,
  forbiddenAliasPrefix: string,
  forbiddenDir: string,
): string[] {
  const forbiddenRoot = resolve(forbiddenDir);
  const importSpecifierRe = /from\s+"([^"]+)"/g;
  const violations: string[] = [];

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf8");
    const matches = content.matchAll(importSpecifierRe);

    for (const match of matches) {
      const specifier = match[1];
      if (!specifier) {
        continue;
      }

      if (specifier.startsWith(forbiddenAliasPrefix)) {
        violations.push(`${sourceLabel}: ${relative(SRC_ROOT, file)} -> ${specifier}`);
        continue;
      }

      if (!specifier.startsWith(".")) {
        continue;
      }

      const resolvedImport = resolve(dirname(file), specifier);
      if (resolvedImport === forbiddenRoot || resolvedImport.startsWith(`${forbiddenRoot}${sep}`)) {
        violations.push(`${sourceLabel}: ${relative(SRC_ROOT, file)} -> ${specifier}`);
      }
    }
  }

  return violations;
}

describe("architecture boundaries (baseline before cleanup)", () => {
  it("R1: domain has zero outward dependencies", () => {
    const domainFiles = walkSrcExcludingTests(join(SRC_ROOT, "domain"));
    const violations = findMatches(
      domainFiles,
      /from\s+"@\/(application|presentation|infrastructure)/,
    );
    expect(violations.length).toBe(0);
  });

  it("R2: application has zero direct infrastructure imports", () => {
    const appFiles = [
      ...walkSrcExcludingTests(join(SRC_ROOT, "application", "use-cases")),
      ...walkSrcExcludingTests(join(SRC_ROOT, "application", "services")),
    ];
    const violations = findMatches(appFiles, /from\s+"@\/infrastructure/);
    expect(violations.length).toBe(0);
  });

  it("R3: presentation has zero infra/prisma imports (production files only)", () => {
    const presentationFiles = walkSrcExcludingTests(join(SRC_ROOT, "presentation"));
    const violations = findMatches(
      presentationFiles,
      /from\s+"@\/infrastructure|from\s+"@prisma\/client|\bprisma\b/,
    );
    expect(violations.length).toBe(0);
  });

  it("R4: process.env reads only in allow-listed locations", () => {
    const srcFiles = walkSrcExcludingTests(SRC_ROOT);
    const offenders: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, "utf8");
      if (!content.match(/process\.env/)) {
        continue;
      }

      const rel = relative(SRC_ROOT, file);
      if (rel === "infrastructure/setup/environment.ts") {
        continue;
      }

      // logger.ts reads process.env at init (not via getEnv()) to avoid the
      // bootstrap ordering trap — see design ADR-2.
      if (rel === "infrastructure/logging/logger.ts") {
        continue;
      }

      if (rel === "container.ts" && /process\.env\.DOWNLOADS/.test(content)) {
        const lines = content.split("\n").filter((line) => /process\.env/.test(line));
        const bad = lines.filter((line) => !/process\.env\.DOWNLOADS/.test(line));
        if (bad.length > 0) {
          offenders.push(`${rel}: ${bad.join(" | ")}`);
        }
        continue;
      }

      offenders.push(rel);
    }

    expect(offenders).toEqual([]);
  });

  it("R5: infrastructure/database and infrastructure/external stay decoupled", () => {
    const databaseDir = join(SRC_ROOT, "infrastructure", "database");
    const externalDir = join(SRC_ROOT, "infrastructure", "external");
    const databaseFiles = walkSrcExcludingTests(databaseDir);
    const externalFiles = walkSrcExcludingTests(externalDir);

    // R5 guards both alias imports and relative imports between sibling infra layers.
    const databaseViolations = findCrossLayerViolations(
      databaseFiles,
      "database->external",
      "@/infrastructure/external",
      externalDir,
    );
    const externalViolations = findCrossLayerViolations(
      externalFiles,
      "external->database",
      "@/infrastructure/database",
      databaseDir,
    );

    expect([...databaseViolations, ...externalViolations]).toEqual([]);
  });
});
