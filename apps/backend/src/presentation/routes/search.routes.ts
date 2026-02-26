import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { searchController } = container;

router.get("/", asyncHandler(searchController.searchCatalog));

export default router;
