import { z, ZodError, ZodIssue } from "zod";

const envSchema = z
  .object({
    // Spotify
    SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
    SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is required"),
    SPOTIFY_REDIRECT_URI: z.string().url("SPOTIFY_REDIRECT_URI must be a valid URL").optional(),
    SPOTIFY_USER_ACCESS_TOKEN: z.string().optional(),

    // App
    BASE_URL: z.string().url().optional().default("http://127.0.0.1:3000"),

    // Redis
    REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),
    REDIS_PORT: z.string().regex(/^\d+$/, "REDIS_PORT must be a number").transform(Number),

    // Downloads
    DOWNLOADS_PATH: z.string().min(1, "DOWNLOADS_PATH is required"),

    // Optional
    PORT: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .optional()
      .default("3000" as unknown as number),
    NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
    DATABASE_URL: z.string().optional(),
  })
  .transform((data) => {
    if (!data.SPOTIFY_REDIRECT_URI) {
      // Remove trailing slash if present
      const baseUrl = data.BASE_URL.replace(/\/$/, "");
      data.SPOTIFY_REDIRECT_URI = `${baseUrl}/api/auth/spotify/callback`;
    }
    return data as typeof data & { SPOTIFY_REDIRECT_URI: string };
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
    throw new Error("Environment variables not validated. Call validateEnvironment() first.");
  }
  return validatedEnv;
}
