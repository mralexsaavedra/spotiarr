import { ArtistRelease, NormalizedTrack } from "@spotiarr/shared";
import { Request, Response } from "express";
import { AppError } from "@/domain/errors/app-error";
import { FeedRepository } from "@/infrastructure/database/feed.repository";
import { SpotifyAlbumClient } from "@/infrastructure/external/spotify-album.client";
import { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";

interface ArtistDetailResponse {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
  followers: number | null;
  genres: string[];
  albums: ArtistRelease[];
  isFollowed: boolean;
}

const ACTIVE_DETAIL_REQUEST_TTL_MS = 30_000;
const MAX_ACTIVE_DETAIL_REQUESTS = 200;

const activeDetailRequests = new Map<string, Promise<ArtistDetailResponse>>();
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
    private readonly feedRepository: FeedRepository,
    private readonly spotifyAlbumClient: SpotifyAlbumClient,
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

    const requestPromise = (async (): Promise<ArtistDetailResponse> => {
      const cachedArtist = await this.feedRepository.getArtistBySpotifyId(id);
      const isFollowed = cachedArtist !== null;
      const effectiveLimit = isFollowed ? limit : Math.min(limit, 5);

      const cachedAlbums = await this.feedRepository.getArtistAlbums(id, effectiveLimit, 0);

      const [details, albums] = await Promise.all([
        cachedArtist
          ? Promise.resolve({
              name: cachedArtist.name,
              image: cachedArtist.image,
              spotifyUrl: cachedArtist.spotifyUrl,
              followers: null,
              genres: [],
            })
          : this.spotifyArtistClient.getArtistDetails(id),
        cachedAlbums.length > 0
          ? Promise.resolve(cachedAlbums)
          : this.spotifyArtistClient
              .getArtistAlbums(id, effectiveLimit)
              .then(async (spotifyAlbums) => {
                await this.feedRepository.upsertArtistAlbums(spotifyAlbums);
                return spotifyAlbums;
              }),
      ]);

      return {
        id,
        name: details.name,
        image: details.image,
        spotifyUrl: details.spotifyUrl,
        followers: details.followers,
        genres: details.genres,
        albums,
        isFollowed,
      };
    })();

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

    const cachedCount = await this.feedRepository.getArtistAlbumCount(id);

    if (cachedCount > offset) {
      const cachedAlbums = await this.feedRepository.getArtistAlbums(id, limit, offset);
      return res.json(cachedAlbums);
    }

    const albums = await this.spotifyArtistClient.getArtistAlbumsPaginated(id, limit, offset);
    await this.feedRepository.upsertArtistAlbums(albums);

    return res.json(albums);
  };

  getAlbumTracks = async (req: Request, res: Response) => {
    const { id, albumId } = req.params;

    if (!id || !albumId) {
      return res.status(400).json({ error: "missing_params" });
    }

    try {
      const tracks: NormalizedTrack[] = await this.spotifyAlbumClient.getAlbumTracks(albumId);
      return res.json(tracks);
    } catch (error) {
      if (error instanceof AppError && error.errorCode === "spotify_rate_limited") {
        return res.status(429).json({ error: "spotify_rate_limited" });
      }
      if (error instanceof AppError && error.errorCode === "playlist_not_found") {
        return res.status(404).json({ error: "playlist_not_found" });
      }
      return res.status(500).json({ error: "internal_server_error" });
    }
  };
}
