import type { NextFunction, Request, Response } from "express";
import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "@/container";
import { asyncHandler } from "../middleware/async-handler";

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000;

export function createUnlockRateLimit(
  getMax: () => number,
): (req: Request, res: Response, next: NextFunction) => void {
  const map = new Map<string, RateLimitEntry>();

  function prune(now: number): void {
    for (const [key, entry] of map) {
      if (now - entry.windowStart >= WINDOW_MS) map.delete(key);
    }
  }

  return function unlockRateLimit(req: Request, res: Response, next: NextFunction): void {
    const max = getMax();
    const ip = req.ip ?? "unknown";
    const now = Date.now();

    prune(now);

    const entry = map.get(ip);

    if (!entry || now - entry.windowStart >= WINDOW_MS) {
      map.set(ip, { count: 1, windowStart: now });
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
  };
}

export function createAuthRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { authController, unlockRateLimit: maxUnlockRequests } = container;

  const unlockRateLimit = createUnlockRateLimit(() => maxUnlockRequests);

  router.get("/spotify/login", asyncHandler(authController.login));

  router.get("/spotify/callback", asyncHandler(authController.callback));

  router.get("/spotify/status", asyncHandler(authController.status));

  router.post("/spotify/logout", asyncHandler(authController.logout));

  router.post("/unlock", unlockRateLimit, authController.unlock);

  router.get("/session", authController.session);

  return router;
}
