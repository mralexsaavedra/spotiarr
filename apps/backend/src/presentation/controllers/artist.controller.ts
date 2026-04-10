import { ArtistRelease } from "@spotiarr/shared";
import { Request, Response } from "express";
import { FeedRepository } from "@/infrastructure/database/feed.repository";
import { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";

interface ArtistDetailResponse {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
  followers: number | null;
  genres: string[];
  albums: ArtistRelease[];
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

    const limit = parseInt(req.query.limit as string) || 12;

    pruneActiveDetailRequests();

    const requestPromise = (async (): Promise<ArtistDetailResponse> => {
      const cachedArtist = await this.feedRepository.getArtistBySpotifyId(id);

      const cachedAlbums = await this.feedRepository.getArtistAlbums(id, limit, 0);

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
          : this.spotifyArtistClient.getArtistAlbums(id, limit).then(async (spotifyAlbums) => {
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
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

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
}
