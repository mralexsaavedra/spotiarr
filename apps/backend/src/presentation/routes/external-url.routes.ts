import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { externalUrlController } = container;

router.get("/", asyncHandler(externalUrlController.resolve));

export default router;
