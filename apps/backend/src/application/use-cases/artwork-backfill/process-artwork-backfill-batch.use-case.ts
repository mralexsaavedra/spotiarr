import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import type {
  ArtworkBackfillCacheSourcePort,
  ArtworkBackfillCandidate,
  ArtworkBackfillCandidateSourcePort,
  ArtworkBackfillEmbeddedSourcePort,
  ArtworkBackfillFileSystemSourcePort,
  ArtworkBackfillSpotifySourcePort,
} from "@/application/ports/artwork-backfill-sources.port";
import type { ArtworkBackfillPhase } from "@/domain/artwork-backfill.types";

interface ProcessBatchInput {
  runId: string;
  phase: ArtworkBackfillPhase;
  limit: number;
  cursorValue?: string | null;
  allowExternalFallback?: boolean;
}

interface ProcessBatchResult {
  phase: ArtworkBackfillPhase;
  processed: number;
  skippedExisting: number;
  written: number;
  failed: number;
  externalCalls: number;
  cursorValue: string | null;
}

export class ProcessArtworkBackfillBatchUseCase {
  constructor(
    private readonly candidateSource: ArtworkBackfillCandidateSourcePort,
    private readonly fileSystemSource: ArtworkBackfillFileSystemSourcePort,
    private readonly cacheSource: ArtworkBackfillCacheSourcePort,
    private readonly embeddedSource: ArtworkBackfillEmbeddedSourcePort,
    private readonly spotifySource: ArtworkBackfillSpotifySourcePort,
    private readonly backfillRepository: ArtworkBackfillRepositoryPort,
  ) {}

  async execute(input: ProcessBatchInput): Promise<ProcessBatchResult> {
    const candidates =
      input.phase === "artists"
        ? await this.candidateSource.getArtistCandidates(input.limit, input.cursorValue)
        : await this.candidateSource.getAlbumCandidates(input.limit, input.cursorValue);

    const counters = {
      processed: 0,
      skippedExisting: 0,
      written: 0,
      failed: 0,
      externalCalls: 0,
    };
    let currentCursor = input.cursorValue ?? null;

    for (const candidate of candidates) {
      currentCursor = candidate.cursorValue;
      counters.processed += 1;

      const resolved = await this.resolveCandidate(candidate, Boolean(input.allowExternalFallback));

      if (resolved === "skipped_existing") {
        counters.skippedExisting += 1;
        continue;
      }

      if (resolved === "written") {
        counters.written += 1;
        continue;
      }

      if (resolved === "external") {
        counters.externalCalls += 1;
        continue;
      }

      counters.failed += 1;
    }

    await this.backfillRepository.updateCheckpoint({
      runId: input.runId,
      phase: input.phase,
      cursorKind: input.phase === "artists" ? "artist" : "album",
      cursorValue: currentCursor,
      totalCandidates: candidates.length,
      processed: counters.processed,
      skippedExisting: counters.skippedExisting,
      written: counters.written,
      failed: counters.failed,
      externalCalls: counters.externalCalls,
    });

    return {
      phase: input.phase,
      cursorValue: currentCursor,
      ...counters,
    };
  }

  private async resolveCandidate(
    candidate: ArtworkBackfillCandidate,
    allowExternalFallback: boolean,
  ): Promise<"skipped_existing" | "written" | "failed" | "external"> {
    if (candidate.type === "artist") {
      const hasLocal = await this.fileSystemSource.hasArtistArtwork(candidate.artistName);
      if (hasLocal) return "skipped_existing";

      const cacheImage = await this.cacheSource.findArtistImageUrl(candidate);
      if (cacheImage) {
        const written = await this.fileSystemSource.writeArtistArtworkIfMissing(
          candidate.artistName,
          cacheImage,
        );
        if (written) return "written";
      }

      const localAlbumArtwork = await this.fileSystemSource.findArtistAlbumArtwork(
        candidate.artistName,
      );
      if (localAlbumArtwork) {
        const written = await this.fileSystemSource.writeArtistArtworkIfMissing(
          candidate.artistName,
          localAlbumArtwork,
        );
        if (written) return "written";
      }

      if (allowExternalFallback) {
        const spotifyImage = await this.spotifySource.findArtistImageUrl(candidate);
        if (!spotifyImage) return "failed";

        const written = await this.fileSystemSource.writeArtistArtworkIfMissing(
          candidate.artistName,
          spotifyImage,
        );
        return written ? "external" : "failed";
      }

      return "failed";
    }

    if (!candidate.albumName) {
      return "failed";
    }

    const hasAlbumLocal = await this.fileSystemSource.hasAlbumArtwork(
      candidate.artistName,
      candidate.albumName,
    );
    if (hasAlbumLocal) return "skipped_existing";

    const trackPaths = await this.fileSystemSource.listAlbumTrackPaths(
      candidate.artistName,
      candidate.albumName,
    );
    const embeddedPath = await this.embeddedSource.extractFromTracks(trackPaths);
    if (embeddedPath) {
      const writtenEmbedded = await this.fileSystemSource.writeAlbumArtworkIfMissing(
        candidate.artistName,
        candidate.albumName,
        embeddedPath,
      );
      if (writtenEmbedded) return "written";
    }

    const cacheCover = await this.cacheSource.findAlbumCoverUrl(candidate);
    if (cacheCover) {
      const writtenCache = await this.fileSystemSource.writeAlbumArtworkIfMissing(
        candidate.artistName,
        candidate.albumName,
        cacheCover,
      );
      if (writtenCache) return "written";
    }

    if (allowExternalFallback) {
      const spotifyCover = await this.spotifySource.findAlbumCoverUrl(candidate);
      if (!spotifyCover) return "failed";

      const writtenSpotify = await this.fileSystemSource.writeAlbumArtworkIfMissing(
        candidate.artistName,
        candidate.albumName,
        spotifyCover,
      );
      return writtenSpotify ? "external" : "failed";
    }

    return "failed";
  }
}
