import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

export function createSettingsRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { settingsController } = container;

  // GET /api/settings - Get all settings
  router.get("/", asyncHandler(settingsController.getSettings));

  // GET /api/settings/metadata - Get settings metadata
  router.get("/metadata", asyncHandler(settingsController.getMetadata));

  // GET /api/settings/formats - Get supported audio formats
  router.get("/formats", asyncHandler(settingsController.getFormats));

  // PUT /api/settings - Update multiple settings at once
  router.put("/", asyncHandler(settingsController.updateSettings));

  return router;
}
