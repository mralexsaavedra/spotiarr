import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { artistController } = container;

router.get("/:id", asyncHandler(artistController.getArtistDetail));

router.get("/:id/albums", asyncHandler(artistController.getArtistAlbums));

router.get("/:id/albums/:albumId/tracks", asyncHandler(artistController.getAlbumTracks));

export default router;
