import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// Monorepo root directory
const rootDir = resolve(__dirname, "../../../../../");
const env = process.env.NODE_ENV || "development";

// Cascade loading: Specific overrides first.
// dotenv does NOT overwrite existing keys, so the first file loaded wins.

// 1. .env.development.local (Local overrides, git-ignored)
config({ path: resolve(rootDir, `.env.${env}.local`) });

// 2. .env.development (Shared dev config)
config({ path: resolve(rootDir, `.env.${env}`) });

// 3. .env (Shared base config)
config({ path: resolve(rootDir, ".env") });

console.log(`[Env] Loaded environment for: ${env}`);

// Auto-configure DATABASE_URL if missing (Magic 🪄)
if (!process.env.DATABASE_URL) {
  // Use standard Prisma location for local dev: src/backend/prisma/dev.db
  const dbPath = resolve(rootDir, "src/backend/prisma/dev.db");

  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  process.env.DATABASE_URL = `file:${dbPath}`;
}
