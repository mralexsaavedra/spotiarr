import type { NextFunction, Request, Response } from "express";
import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "@/container";
import { asyncHandler } from "../middleware/async-handler";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;

function pruneRateLimitMap(now: number): void {
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart >= WINDOW_MS) rateLimitMap.delete(key);
  }
}

export function createAuthRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { authController, unlockRateLimit: maxUnlockRequests } = container;

  function unlockRateLimit(req: Request, res: Response, next: NextFunction): void {
    const max = maxUnlockRequests;
    const ip = req.ip ?? "unknown";
    const now = Date.now();

    pruneRateLimitMap(now);

    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      rateLimitMap.set(ip, { count: 1, windowStart: now });
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ error: "rate_limiter_overflow" });
      return;
    }

    entry.count += 1;
    next();
  }

  router.get("/spotify/login", asyncHandler(authController.login));

  router.get("/spotify/callback", asyncHandler(authController.callback));

  router.get("/spotify/status", asyncHandler(authController.status));

  router.post("/spotify/logout", asyncHandler(authController.logout));

  router.post("/unlock", unlockRateLimit, authController.unlock);

  router.get("/session", authController.session);

  return router;
}
