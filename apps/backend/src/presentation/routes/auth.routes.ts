import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "@/container";
import { asyncHandler } from "../middleware/async-handler";

export function createAuthRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { authController } = container;

  router.get("/spotify/login", asyncHandler(authController.login));

  router.get("/spotify/callback", asyncHandler(authController.callback));

  router.get("/spotify/status", asyncHandler(authController.status));

  router.post("/spotify/logout", asyncHandler(authController.logout));

  return router;
}
