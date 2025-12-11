import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { z, ZodError, ZodIssue } from "zod";
import { AppError } from "@/domain/errors/app-error";

// -----------------------------------------------------------------------------
// Environment Loading & Auto-configuration
// -----------------------------------------------------------------------------

// Monorepo root directory
const rootDir = resolve(__dirname, "../../../../../");
const currentEnv = process.env.NODE_ENV || "development";

// Cascade loading: Specific overrides first.
// dotenv does NOT overwrite existing keys, so the first file loaded wins.

// 1. .env.development.local (Local overrides, git-ignored)
config({ path: resolve(rootDir, `.env.${currentEnv}.local`) });

// 2. .env.development (Shared dev config)
config({ path: resolve(rootDir, `.env.${currentEnv}`) });

// 3. .env (Shared base config)
config({ path: resolve(rootDir, ".env") });

console.log(`[Env] Loaded environment for: ${currentEnv}`);

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

// Auto-configure DOWNLOADS path
if (!process.env.DOWNLOADS) {
  if (process.env.NODE_ENV === "production") {
    process.env.DOWNLOADS = "/downloads";
  } else {
    process.env.DOWNLOADS = resolve(rootDir, "downloads");
  }

  // Ensure directory exists
  if (!existsSync(process.env.DOWNLOADS)) {
    mkdirSync(process.env.DOWNLOADS, { recursive: true });
  }
}

// -----------------------------------------------------------------------------
// Schema Validation
// -----------------------------------------------------------------------------

const envSchema = z
  .object({
    // Spotify
    SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
    SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is required"),
    SPOTIFY_REDIRECT_URI: z.string().url("SPOTIFY_REDIRECT_URI must be a valid URL"),

    // Redis (auto-configured based on environment)
    REDIS_HOST: z.string().min(1).default("localhost"),
    REDIS_PORT: z
      .string()
      .regex(/^\d+$/, "REDIS_PORT must be a number")
      .default("6379")
      .transform(Number),

    // Downloads (auto-configured based on environment)
    DOWNLOADS: z.string().min(1),

    // Optional
    NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  })
  .transform((data) => {
    // Extract Base URL from the Redirect URI for logs/cors
    const uriObj = new URL(data.SPOTIFY_REDIRECT_URI);
    const BASE_URL = uriObj.origin;

    return { ...data, BASE_URL, SPOTIFY_REDIRECT_URI: data.SPOTIFY_REDIRECT_URI };
  });

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

export function validateEnvironment(): void {
  try {
    validatedEnv = envSchema.parse(process.env);
    console.log("✅ Environment variables validated successfully");
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("\n❌ Environment validation failed!\n");
      console.error("Missing or invalid environment variables:\n");

      error.issues.forEach((err: ZodIssue) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });

      console.error("\nPlease check your .env file and ensure all required variables are set.");
      console.error("See .env.example for reference.\n");
    }
    process.exit(1);
  }
}

export function getEnv(): Env {
  if (!validatedEnv) {
    throw new AppError(
      500,
      "internal_server_error",
      "Environment variables not validated. Call validateEnvironment() first.",
    );
  }
  return validatedEnv;
}
