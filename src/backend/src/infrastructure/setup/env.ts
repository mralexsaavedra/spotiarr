import { config } from "dotenv";
import { resolve } from "path";

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
