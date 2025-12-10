/// <reference types="vite/client" />

/**
 * Interface representing the environment variables accessible via `import.meta.env`.
 * By default, Vite exposes variables prefixed with `VITE_`.
 */
interface ImportMetaEnv {
  /**
   * API URL for the backend.
   * Example: http://localhost:3000
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global constants defined in vite.config.ts
declare const __APP_VERSION__: string;
