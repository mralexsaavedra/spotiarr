import { z, ZodError, ZodIssue } from "zod";

const envSchema = z
  .object({
    // Spotify
    SPOTIFY_CLIENT_ID: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
    SPOTIFY_CLIENT_SECRET: z.string().min(1, "SPOTIFY_CLIENT_SECRET is required"),
    SPOTIFY_REDIRECT_URI: z.string().url("SPOTIFY_REDIRECT_URI must be a valid URL").optional(),
    SPOTIFY_USER_ACCESS_TOKEN: z.string().optional(),

    // App
    PUBLIC_HOST: z.string().min(1, "PUBLIC_HOST is required").default("localhost"),

    // Redis (auto-configured based on environment)
    REDIS_HOST: z.string().min(1).default("localhost"),
    REDIS_PORT: z
      .string()
      .regex(/^\d+$/, "REDIS_PORT must be a number")
      .default("6379")
      .transform(Number),

    // Downloads (auto-configured based on environment)
    DOWNLOADS_PATH: z.string().min(1).default("./downloads"),

    // Optional
    NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
    DATABASE_URL: z.string().optional(),
  })
  .transform((data) => {
    // Construct BASE_URL from environment and host
    // Development: http://localhost:5173 (Vite dev server)
    // Production: http://localhost:3000 (local build) or https://IP:3000 (Docker with certs)
    const isDevelopment = data.NODE_ENV === "development";
    const isLocalhost = data.PUBLIC_HOST === "localhost" || data.PUBLIC_HOST === "127.0.0.1";

    const protocol = isDevelopment || isLocalhost ? "http" : "https";
    const port = isDevelopment ? "5173" : "3000";
    const BASE_URL = `${protocol}://${data.PUBLIC_HOST}:${port}`;

    if (!data.SPOTIFY_REDIRECT_URI) {
      data.SPOTIFY_REDIRECT_URI = `${BASE_URL}/api/auth/spotify/callback`;
    }

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
    throw new Error("Environment variables not validated. Call validateEnvironment() first.");
  }
  return validatedEnv;
}
