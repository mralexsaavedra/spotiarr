import { ApiRoutes } from "@spotiarr/shared";
import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { createAiRoutes } from "./ai.routes";
import { createArtistRoutes } from "./artist.routes";
import { createAuthRoutes } from "./auth.routes";
import { createEventsRoutes } from "./events.routes";
import { createExternalUrlRoutes } from "./external-url.routes";
import { createFeedRoutes } from "./feed.routes";
import { createHealthRoutes } from "./health.routes";
import { createHistoryRoutes } from "./history.routes";
import { createLibraryRoutes } from "./library.routes";
import { createPlaylistRoutes } from "./playlist.routes";
import { createSearchRoutes } from "./search.routes";
import { createSettingsRoutes } from "./settings.routes";
import { createTrackRoutes } from "./track.routes";

export function createRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();

  router.use(ApiRoutes.HEALTH, createHealthRoutes(container));
  router.use(ApiRoutes.PLAYLIST, createPlaylistRoutes(container));
  router.use(ApiRoutes.TRACK, createTrackRoutes(container));
  router.use(ApiRoutes.HISTORY, createHistoryRoutes(container));
  router.use(ApiRoutes.SETTINGS, createSettingsRoutes(container));
  router.use(ApiRoutes.EVENTS, createEventsRoutes(container));
  router.use(ApiRoutes.FEED, createFeedRoutes(container));
  router.use(ApiRoutes.ARTIST, createArtistRoutes(container));
  router.use(ApiRoutes.AUTH, createAuthRoutes(container));
  router.use(ApiRoutes.LIBRARY, createLibraryRoutes(container));
  router.use(ApiRoutes.SEARCH, createSearchRoutes(container));
  router.use(ApiRoutes.EXTERNAL_URL, createExternalUrlRoutes(container));
  router.use(ApiRoutes.AI, createAiRoutes(container));

  return router;
}
