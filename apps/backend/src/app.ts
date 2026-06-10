import { ApiRoutes } from "@spotiarr/shared";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import path from "path";
import type { Container } from "./container";
import { getEnv } from "./infrastructure/setup/environment";
import { errorHandler } from "./presentation/middleware/error-handler";
import { createRequireTokenMiddleware } from "./presentation/middleware/require-token";
import { createRoutes } from "./presentation/routes";

export function createApp(container: Container): Express {
  const app: Express = express();

  app.set("trust proxy", getEnv().SPOTIARR_TRUST_PROXY ?? false);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": ["'self'", "data:", "https:"],
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "https:", "'unsafe-inline'"],
          "upgrade-insecure-requests": null,
        },
      },
      hsts: false,
      crossOriginOpenerPolicy: false,
      originAgentCluster: false,
    }),
  );
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    ApiRoutes.BASE,
    createRequireTokenMiddleware(() => getEnv().SPOTIARR_TOKEN),
  );

  // API Routes
  app.use(ApiRoutes.BASE, createRoutes(container));

  // Serve static files (frontend)
  const frontendPath = path.resolve(__dirname, "../../frontend/dist");
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

  return app;
}
