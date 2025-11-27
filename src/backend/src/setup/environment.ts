export enum EnvironmentEnum {
  SPOTIFY_CLIENT_ID = "SPOTIFY_CLIENT_ID",
  SPOTIFY_CLIENT_SECRET = "SPOTIFY_CLIENT_SECRET",
  SPOTIFY_REDIRECT_URI = "SPOTIFY_REDIRECT_URI",
  REDIS_HOST = "REDIS_HOST",
  REDIS_PORT = "REDIS_PORT",
  DOWNLOADS_PATH = "DOWNLOADS_PATH",
}

interface EnvVariable {
  key: EnvironmentEnum;
  description: string;
  required: boolean;
}

const ENV_VARIABLES: EnvVariable[] = [
  {
    key: EnvironmentEnum.SPOTIFY_CLIENT_ID,
    description: "Spotify API Client ID",
    required: true,
  },
  {
    key: EnvironmentEnum.SPOTIFY_CLIENT_SECRET,
    description: "Spotify API Client Secret",
    required: true,
  },
  {
    key: EnvironmentEnum.SPOTIFY_REDIRECT_URI,
    description: "Spotify OAuth redirect URI (must match your Spotify app configuration)",
    required: true,
  },
  {
    key: EnvironmentEnum.REDIS_HOST,
    description: "Redis host address",
    required: true,
  },
  {
    key: EnvironmentEnum.REDIS_PORT,
    description: "Redis port number",
    required: true,
  },
  {
    key: EnvironmentEnum.DOWNLOADS_PATH,
    description: "Downloads directory path",
    required: true,
  },
];

export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const { key, description, required } of ENV_VARIABLES) {
    if (required && !process.env[key]) {
      missing.push(`  - ${key}: ${description}`);
    }
  }

  if (missing.length > 0) {
    console.error("\n❌ Environment validation failed!\n");
    console.error("Missing required environment variables:\n");
    console.error(missing.join("\n"));
    console.error("\nPlease check your .env file and ensure all required variables are set.");
    console.error("See .env.example for reference.\n");
    process.exit(1);
  }

  console.log("✅ Environment variables validated successfully");
}
