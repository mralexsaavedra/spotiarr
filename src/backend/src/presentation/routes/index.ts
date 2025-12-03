import { ApiRoutes } from "@spotiarr/shared";
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
router.use(ApiRoutes.HEALTH, healthRoutes);

// API Routes
router.use(ApiRoutes.PLAYLIST, playlistRoutes);
router.use(ApiRoutes.TRACK, trackRoutes);
router.use(ApiRoutes.HISTORY, historyRoutes);
router.use(ApiRoutes.SETTINGS, settingsRoutes);
router.use(ApiRoutes.EVENTS, eventsRoutes);
router.use(ApiRoutes.FEED, feedRoutes);
router.use(ApiRoutes.ARTIST, artistRoutes);
router.use(ApiRoutes.AUTH, authRoutes);

export default router;
