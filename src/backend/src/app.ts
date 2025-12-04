import { ApiRoutes } from "@spotiarr/shared";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import path from "path";
import { errorHandler } from "./presentation/middleware/error-handler";
import routes from "./presentation/routes";

export const app: Express = express();

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
