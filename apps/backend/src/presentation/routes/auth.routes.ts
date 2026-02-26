import { Router, type Router as ExpressRouter } from "express";
import { container } from "@/container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { authController } = container;

router.get("/spotify/login", asyncHandler(authController.login));

router.get("/spotify/callback", asyncHandler(authController.callback));

router.get("/spotify/status", asyncHandler(authController.status));

router.post("/spotify/logout", asyncHandler(authController.logout));

export default router;
