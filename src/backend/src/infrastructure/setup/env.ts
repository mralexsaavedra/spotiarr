import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const devPath = resolve(__dirname, "../../../../../.env");
const prodPath = resolve(__dirname, "../../../../.env");

const envPath = existsSync(devPath) ? devPath : prodPath;

config({ path: envPath });
