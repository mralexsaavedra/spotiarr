import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

export function createSearchRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { searchController } = container;

  router.get("/", asyncHandler(searchController.searchCatalog));

  return router;
}
