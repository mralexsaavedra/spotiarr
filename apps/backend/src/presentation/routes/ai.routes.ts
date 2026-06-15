import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { generateAiPlaylistSchema, listModelsSchema } from "./schemas/ai.schema";

export function createAiRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { aiChatController } = container;

  router.post(
    "/chat/generate",
    validate(generateAiPlaylistSchema),
    asyncHandler(aiChatController.generate),
  );

  router.post("/models", validate(listModelsSchema), asyncHandler(aiChatController.listModels));

  return router;
}
