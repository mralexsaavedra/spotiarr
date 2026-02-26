import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { feedController } = container;

router.get("/releases", asyncHandler(feedController.getRecentReleases));

router.get("/artists", asyncHandler(feedController.getArtists));

export default router;
