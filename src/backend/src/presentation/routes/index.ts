import { Router, type Router as ExpressRouter } from "express";
import artistRoutes from "./artist.routes";
import authRoutes from "./auth.routes";
import eventsRoutes from "./events.routes";
import feedRoutes from "./feed.routes";
import healthRoutes from "./health.routes";
import historyRoutes from "./history.routes";
import playlistRoutes from "./playlist.routes";
import settingsRoutes from "./settings.routes";
import trackRoutes from "./track.routes";

const router: ExpressRouter = Router();

// Health check (no auth required)
router.use("/health", healthRoutes);

// API Routes
router.use("/playlist", playlistRoutes);
router.use("/track", trackRoutes);
router.use("/history", historyRoutes);
router.use("/settings", settingsRoutes);
router.use("/events", eventsRoutes);
router.use("/feed", feedRoutes);
router.use("/artist", artistRoutes);
router.use("/auth", authRoutes);

export default router;
