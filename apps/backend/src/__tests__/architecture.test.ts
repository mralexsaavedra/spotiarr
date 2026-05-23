import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(__dirname, "..");

function walkTsFiles(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];

  for (const entry of entries) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkTsFiles(full));
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
  it("R1: domain currently has outward dependencies", () => {
    const domainFiles = walkTsFiles(join(SRC_ROOT, "domain"));
    const violations = findMatches(
      domainFiles,
      /from\s+"@\/(application|presentation|infrastructure)/,
    );
    expect(violations.length).toBeGreaterThan(0);
  });

  it("R2: application currently imports infrastructure directly", () => {
    const appFiles = [
      ...walkTsFiles(join(SRC_ROOT, "application", "use-cases")),
      ...walkTsFiles(join(SRC_ROOT, "application", "services")),
    ];
    const violations = findMatches(appFiles, /from\s+"@\/infrastructure/);
    expect(violations.length).toBeGreaterThan(0);
  });

  it("R3: presentation controllers currently import infra/prisma", () => {
    const controllerFiles = walkTsFiles(join(SRC_ROOT, "presentation", "controllers"));
    const violations = findMatches(
      controllerFiles,
      /from\s+"@\/infrastructure|from\s+"@prisma\/client|\bprisma\b/,
    );
    expect(violations.length).toBeGreaterThan(0);
  });

  it("R4: process.env currently leaks outside environment.ts", () => {
    const srcFiles = walkTsFiles(SRC_ROOT);
    const matches = srcFiles
      .filter((file) => readFileSync(file, "utf8").includes("process.env"))
      .map((file) => relative(SRC_ROOT, file));

    const disallowed = matches.filter(
      (path) =>
        !path.includes("infrastructure/setup/environment.ts") && !path.includes("container.ts"),
    );
    expect(disallowed.length).toBeGreaterThan(0);
  });
});
