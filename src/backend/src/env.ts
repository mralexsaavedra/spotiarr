import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Determine .env path based on execution context
// Dev: src/backend/src/env.ts -> ../../../.env
// Prod: dist/backend/env.js -> ../../.env

const devPath = resolve(__dirname, "../../../.env");
const prodPath = resolve(__dirname, "../../.env");

const envPath = existsSync(devPath) ? devPath : prodPath;

config({ path: envPath });
