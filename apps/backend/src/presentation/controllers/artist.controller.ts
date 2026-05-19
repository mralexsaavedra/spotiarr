import type { ArtistDetail, NormalizedTrack } from "@spotiarr/shared";
import { Request, Response } from "express";
import { GetAlbumTracksUseCase } from "@/application/use-cases/artists/get-album-tracks.use-case";
import { GetArtistAlbumsUseCase } from "@/application/use-cases/artists/get-artist-albums.use-case";
import { GetArtistDetailUseCase } from "@/application/use-cases/artists/get-artist-detail.use-case";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyAlbumClient } from "@/infrastructure/external/spotify-album.client";
import { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";

const ACTIVE_DETAIL_REQUEST_TTL_MS = 30_000;
const MAX_ACTIVE_DETAIL_REQUESTS = 200;

const activeDetailRequests = new Map<string, Promise<ArtistDetail>>();
const activeDetailRequestTimestamps = new Map<string, number>();

function pruneActiveDetailRequests(): void {
  const now = Date.now();

  for (const [key, startedAt] of activeDetailRequestTimestamps.entries()) {
    if (now - startedAt > ACTIVE_DETAIL_REQUEST_TTL_MS) {
      activeDetailRequestTimestamps.delete(key);
      activeDetailRequests.delete(key);
    }
  }

  while (activeDetailRequests.size >= MAX_ACTIVE_DETAIL_REQUESTS) {
    const firstKey = activeDetailRequests.keys().next().value as string | undefined;
    if (!firstKey) {
      break;
    }

    activeDetailRequests.delete(firstKey);
    activeDetailRequestTimestamps.delete(firstKey);
  }
}

export class ArtistController {
  constructor(
    private readonly spotifyArtistClient: SpotifyArtistClient,
    private readonly spotifyAlbumClient: SpotifyAlbumClient,
    private readonly getArtistDetailUseCase: GetArtistDetailUseCase,
    private readonly getArtistAlbumsUseCase: GetArtistAlbumsUseCase,
    private readonly getAlbumTracksUseCase: GetAlbumTracksUseCase,
  ) {}

  getArtistDetail = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "missing_artist_id" });
    }

    const token = req.headers.authorization || "anonymous";
    const requestKey = `detail:${id}:${token}`;

    const activeRequest = activeDetailRequests.get(requestKey);
    if (activeRequest) {
      const response = await activeRequest;
      return res.json(response);
    }

    const limitRaw = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 25;

    pruneActiveDetailRequests();

    const requestPromise = this.getArtistDetailUseCase.execute(id, limit);

    activeDetailRequests.set(requestKey, requestPromise);
    activeDetailRequestTimestamps.set(requestKey, Date.now());

    try {
      const response = await requestPromise;
      return res.json(response);
    } finally {
      activeDetailRequests.delete(requestKey);
      activeDetailRequestTimestamps.delete(requestKey);
    }
  };

  getArtistAlbums = async (req: Request, res: Response) => {
    const { id } = req.params;
    const limitRaw = parseInt(req.query.limit as string, 10);
    const offsetRaw = parseInt(req.query.offset as string, 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 25;
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

    if (!id) {
      return res.status(400).json({ error: "missing_artist_id" });
    }

    const albums = await this.getArtistAlbumsUseCase.execute(id, limit, offset);
    return res.json(albums);
  };

  getAlbumTracks = async (req: Request, res: Response) => {
    const { id, albumId } = req.params;

    if (!id || !albumId) {
      return res.status(400).json({ error: "missing_params" });
    }

    try {
      const tracks: NormalizedTrack[] = await this.getAlbumTracksUseCase.execute(id, albumId);
      return res.json(tracks);
    } catch (error) {
      if (error instanceof AppError && error.errorCode === "spotify_rate_limited") {
        return res.status(429).json({ error: "spotify_rate_limited" });
      }
      if (error instanceof AppError && error.errorCode === "album_not_found") {
        return res.status(404).json({ error: "album_not_found" });
      }
      return res.status(500).json({ error: "internal_server_error" });
    }
  };
}
