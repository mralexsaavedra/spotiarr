import type { ITrack } from "@spotiarr/shared";
import { isDeezerUrl } from "@spotiarr/shared";
import * as path from "path";
import type { ArtworkAssetsPort } from "@/application/ports/artwork-assets.port";
import type { FileSystemTrackPathPort } from "@/application/ports/file-system.port";
import type { SpotifyService } from "@/application/services/spotify.service";
import { PlaylistRepository } from "@/domain/repositories/playlist.repository";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface ResolvedArtwork {
  tagCoverBuffer: Buffer | null;
  folderCoverBuffer: Buffer | null;
  artistImageBuffer: Buffer | null;
}

export class ArtworkService {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly spotifyService: SpotifyService,
    private readonly pathService: FileSystemTrackPathPort,
    private readonly artworkAssets: ArtworkAssetsPort,
  ) {}

  async resolveTrackArtwork(track: ITrack): Promise<ResolvedArtwork> {
    let playlistCoverBuffer: Buffer | null = null;
    let trackCoverBuffer: Buffer | null = null;
    let artistImageBuffer: Buffer | null = null;
    let isPlaylistType = false;

    const playlist = track.playlistId
      ? await this.playlistRepository.findOne(track.playlistId)
      : null;
    isPlaylistType = playlist?.type === "playlist";

    if (playlist?.coverUrl) {
      playlistCoverBuffer = await this.artworkAssets.downloadImage(playlist.coverUrl);
    }

    // Prefer the explicit track URL; keep spotifyUrl only as a legacy fallback for older rows.
    const urlToResolve = track.trackUrl || track.spotifyUrl;
    if (urlToResolve) {
      if (isDeezerUrl(urlToResolve)) {
        // Deezer-origin track: use the pre-fetched albumCoverUrl from the DB row directly.
        // Never call spotifyService.getCoverImage for a Deezer URL — it would return empty
        // and mask the real cover that Deezer already provided at catalog ingestion time.
        if (track.albumCoverUrl) {
          try {
            trackCoverBuffer = await this.artworkAssets.downloadImage(track.albumCoverUrl);
          } catch (error) {
            console.warn(
              `Failed to download Deezer album cover for ${track.name}: ${toErrorMessage(error)}`,
            );
          }
        }
        // If albumCoverUrl is absent, fall through — trackCoverBuffer stays null and
        // playlistCoverBuffer is used as the fallback below.
      } else {
        try {
          const resolvedTrackCoverUrl = await this.spotifyService.getCoverImage(urlToResolve);
          if (resolvedTrackCoverUrl) {
            trackCoverBuffer = await this.artworkAssets.downloadImage(resolvedTrackCoverUrl);
          }
        } catch (error) {
          console.warn(`Failed to resolve track cover for ${track.name}: ${toErrorMessage(error)}`);
        }
      }
    }

    if (playlist && playlist.type !== "playlist" && playlist.artistImageUrl) {
      artistImageBuffer = await this.artworkAssets.downloadImage(playlist.artistImageUrl);
    }

    const tagCoverBuffer = trackCoverBuffer || playlistCoverBuffer;
    const folderCoverBuffer = isPlaylistType
      ? playlistCoverBuffer || trackCoverBuffer
      : trackCoverBuffer || playlistCoverBuffer;

    return {
      tagCoverBuffer,
      folderCoverBuffer,
      artistImageBuffer,
    };
  }

  async saveAlbumCover(directory: string, artwork: ResolvedArtwork): Promise<void> {
    if (!artwork.folderCoverBuffer) {
      return;
    }

    await this.artworkAssets.writeFileIfMissing(
      path.join(directory, "cover.jpg"),
      artwork.folderCoverBuffer,
    );
  }

  async saveArtistImageIfNeeded(track: ITrack, artwork: ResolvedArtwork): Promise<void> {
    if (!track.playlistId || !artwork.artistImageBuffer) {
      return;
    }

    try {
      const artistFolderPath = this.pathService.getArtistFolderPath(
        track.albumArtist || track.artist,
      );
      await this.artworkAssets.writeFileIfMissing(
        path.join(artistFolderPath, "folder.jpg"),
        artwork.artistImageBuffer,
      );
    } catch (error) {
      console.warn(`Failed to save artist image for ${track.name}: ${toErrorMessage(error)}`);
    }
  }

  clearCache(): void {
    if ("clearCache" in this.artworkAssets && typeof this.artworkAssets.clearCache === "function") {
      this.artworkAssets.clearCache();
    }
  }
}
