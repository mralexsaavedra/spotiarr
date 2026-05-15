import type { MaterializeAlbumSpotifyUrlResponse } from "@spotiarr/shared";
import { AppError } from "@/domain/errors/app-error";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { SpotifySearchClient } from "@/infrastructure/external/spotify-search.client";

export interface MaterializeAlbumSpotifyUrlInput {
  artistId: string;
  albumId: string;
  artistName: string;
  albumName: string;
}

export class MaterializeAlbumSpotifyUrlUseCase {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly spotifySearchClient: SpotifySearchClient,
  ) {}

  async execute(
    input: MaterializeAlbumSpotifyUrlInput,
  ): Promise<MaterializeAlbumSpotifyUrlResponse> {
    const cachedAlbum = await this.feedRepository.getArtistAlbumWithArtist(
      input.artistId,
      input.albumId,
    );

    if (cachedAlbum?.spotifyUrl) {
      return { spotifyUrl: cachedAlbum.spotifyUrl };
    }

    const cachedRelease = await this.feedRepository.getArtistReleaseWithArtist(
      input.artistId,
      input.albumId,
    );

    if (cachedRelease?.spotifyUrl) {
      await this.feedRepository.upsertArtistAlbumSpotifyUrl({
        artistId: input.artistId,
        albumId: input.albumId,
        albumName: cachedRelease.albumName,
        albumType: cachedRelease.albumType,
        releaseDate: cachedRelease.releaseDate,
        coverUrl: cachedRelease.coverUrl,
        spotifyUrl: cachedRelease.spotifyUrl,
      });

      return { spotifyUrl: cachedRelease.spotifyUrl };
    }

    const materialized = await this.spotifySearchClient.searchAlbumByName(
      input.artistName,
      input.albumName,
    );

    if (!materialized?.spotifyUrl) {
      throw new AppError(
        404,
        "spotify_album_url_not_found",
        `Spotify album URL not found for ${input.artistName} - ${input.albumName}`,
      );
    }

    await this.feedRepository.upsertArtistAlbumSpotifyUrl({
      artistId: input.artistId,
      albumId: input.albumId,
      albumName: input.albumName,
      albumType: materialized.albumType,
      releaseDate: materialized.releaseDate,
      coverUrl: materialized.coverUrl,
      spotifyUrl: materialized.spotifyUrl,
      totalTracks: materialized.totalTracks,
    });
    await this.feedRepository.updateArtistReleaseSpotifyUrl(
      input.artistId,
      input.albumId,
      materialized.spotifyUrl,
    );

    return { spotifyUrl: materialized.spotifyUrl };
  }
}
