import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { trackController } = container;

router.get("/playlist/:id", asyncHandler(trackController.getAllByPlaylist));

router.delete("/:id", asyncHandler(trackController.remove));

router.get("/retry/:id", asyncHandler(trackController.retry));

export default router;
