import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
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
    const databaseFiles = walkSrcExcludingTests(join(SRC_ROOT, "infrastructure", "database"));
    const externalFiles = walkSrcExcludingTests(join(SRC_ROOT, "infrastructure", "external"));

    const databaseViolations = findMatches(
      databaseFiles,
      /from\s+"@\/infrastructure\/external/,
    ).map((file) => `database->external: ${relative(SRC_ROOT, file)}`);
    const externalViolations = findMatches(
      externalFiles,
      /from\s+"@\/infrastructure\/database/,
    ).map((file) => `external->database: ${relative(SRC_ROOT, file)}`);

    expect([...databaseViolations, ...externalViolations]).toEqual([]);
  });
});
