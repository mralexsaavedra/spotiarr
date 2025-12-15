import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { z, ZodError, ZodIssue } from "zod";
import { AppError } from "@/domain/errors/app-error";

// -----------------------------------------------------------------------------
// Environment Loading
// -----------------------------------------------------------------------------

// Monorepo root directory
const rootDir = resolve(__dirname, "../../../../../");
const currentEnv = process.env.NODE_ENV || "development";

// Cascade loading: Specific overrides first.
// dotenv does NOT overwrite existing keys, so the first file loaded wins.
config({ path: resolve(rootDir, `.env.${currentEnv}.local`) });
config({ path: resolve(rootDir, `.env.${currentEnv}`) });
config({ path: resolve(rootDir, ".env") });

console.log(`[Env] Loaded environment for: ${currentEnv}`);

// -----------------------------------------------------------------------------
// Schema Validation & Auto-configuration
// -----------------------------------------------------------------------------

const envSchema = z
  .object({
    // Spotify
    SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
    SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is required"),
    SPOTIFY_REDIRECT_URI: z.string().url("SPOTIFY_REDIRECT_URI must be a valid URL"),

    // Redis
    REDIS_HOST: z.string().min(1).default("localhost"),
    REDIS_PORT: z
      .string()
      .regex(/^\d+$/, "REDIS_PORT must be a number")
      .default("6379")
      .transform(Number),

    // Auto-configured fields (optional in input, guaranteed in output)
    DOWNLOADS: z.string().optional(),
    DATABASE_URL: z.string().optional(),

    // System
    NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  })
  .transform((data) => {
    // Derived configurations
    const DOWNLOADS = resolveDownloadsPath(data.DOWNLOADS, data.NODE_ENV);
    const DATABASE_URL = resolveDatabaseUrl(data.DATABASE_URL);

    return { ...data, DOWNLOADS, DATABASE_URL };
  });

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env;

// -----------------------------------------------------------------------------
// Helper Functions (Auto-configuration Logic)
// -----------------------------------------------------------------------------

function resolveDownloadsPath(providedPath: string | undefined, nodeEnv: string): string {
  if (providedPath) return providedPath;

  const defaultPath = nodeEnv === "production" ? "/downloads" : resolve(rootDir, "downloads");

  if (!existsSync(defaultPath)) {
    mkdirSync(defaultPath, { recursive: true });
  }

  return defaultPath;
}

function resolveDatabaseUrl(providedUrl: string | undefined): string {
  if (providedUrl) return providedUrl;

  const dbPath = resolve(rootDir, "apps/backend/prisma/dev.db");
  const dbDir = dirname(dbPath);

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const databaseUrl = `file:${dbPath}`;
  // CRITICAL: Prisma Client relies on process.env.DATABASE_URL internally
  process.env.DATABASE_URL = databaseUrl;

  return databaseUrl;
}

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
