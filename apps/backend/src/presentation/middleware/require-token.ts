import type { NextFunction, Request, Response } from "express";
import { verifyCookie } from "./cookie";

const COOKIE_NAME = "spotiarr_session";

const ALLOWLISTED: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/auth/unlock" },
  { method: "GET", path: "/health" },
  { method: "GET", path: "/auth/spotify/callback" },
];

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    const key = part.slice(0, eqIndex).trim();
    const val = part.slice(eqIndex + 1).trim();
    result[key] = val;
  }
  return result;
}

export function createRequireTokenMiddleware(getToken: () => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = getToken();

    if (!token) {
      next();
      return;
    }

    const isAllowlisted = ALLOWLISTED.some(
      (entry) => entry.method === req.method && req.path === entry.path,
    );

    if (isAllowlisted) {
      next();
      return;
    }

    const cookieHeader = req.headers.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    const cookieValue = cookies[COOKIE_NAME];

    if (!cookieValue) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const payload = verifyCookie(cookieValue, token);

    if (!payload) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    next();
  };
}
