import { ApiRoutes } from "@spotiarr/shared";
import cors from "cors";
import express, { type Express } from "express";
import fs from "fs";
import helmet from "helmet";
import path from "path";
import { errorHandler } from "./presentation/middleware/error-handler";
import routes from "./presentation/routes";

export const app: Express = express();

// Security middleware
const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
delete cspDirectives["upgrade-insecure-requests"];
cspDirectives["img-src"] = ["'self'", "data:", "https:"];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
    // Disable HSTS and upgrade-insecure-requests for local/http environments
    hsts: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false,
  }),
);
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use(ApiRoutes.BASE, routes);

// Serve static files (frontend)
const frontendPath = path.resolve(__dirname, "../../frontend/dist");
console.log("📂 Frontend Path:", frontendPath);

if (fs.existsSync(frontendPath)) {
  console.log("📂 Frontend files found:", fs.readdirSync(frontendPath));
} else {
  console.error("❌ Frontend path does not exist:", frontendPath);
}

app.use(express.static(frontendPath));

// Catch-all for SPA routing (must come before error handler)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Global error handler (must be last)
app.use(errorHandler);
