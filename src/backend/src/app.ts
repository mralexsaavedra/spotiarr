import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import path from "path";
import { errorHandler } from "./presentation/middleware/error-handler";
import routes from "./presentation/routes";

export const app: Express = express();

// Security middleware
const cspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
cspDirectives["img-src"] = ["'self'", "data:", "https:"];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
  }),
);
app.use(cors());

// Compression middleware (should be early in the chain)
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api", routes);

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
