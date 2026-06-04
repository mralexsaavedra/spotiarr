import { describe, expect, it, vi } from "vitest";
import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import type {
  ArtworkBackfillCacheSourcePort,
  ArtworkBackfillCandidate,
  ArtworkBackfillCandidateSourcePort,
  ArtworkBackfillEmbeddedSourcePort,
  ArtworkBackfillExternalSourcePort,
  ArtworkBackfillFileSystemSourcePort,
} from "@/application/ports/artwork-backfill-sources.port";
import { ProcessArtworkBackfillBatchUseCase } from "./process-artwork-backfill-batch.use-case";

function artistCandidate(
  overrides: Partial<ArtworkBackfillCandidate> = {},
): ArtworkBackfillCandidate {
  return {
    type: "artist",
    cursorValue: "artist:A",
    artistName: "Artist A",
    artistSpotifyId: "artist-a",
    ...overrides,
  };
}

function albumCandidate(
  overrides: Partial<ArtworkBackfillCandidate> = {},
): ArtworkBackfillCandidate {
  return {
    type: "album",
    cursorValue: "album:A:One",
    artistName: "Artist A",
    albumName: "Album One",
    artistSpotifyId: "artist-a",
    albumSpotifyId: "album-one",
    ...overrides,
  };
}

function build() {
  const candidateSource: ArtworkBackfillCandidateSourcePort = {
    getArtistCandidates: vi.fn().mockResolvedValue([]),
    getAlbumCandidates: vi.fn().mockResolvedValue([]),
  };
  const fileSystemSource: ArtworkBackfillFileSystemSourcePort = {
    hasArtistArtwork: vi.fn().mockResolvedValue(false),
    hasAlbumArtwork: vi.fn().mockResolvedValue(false),
    findArtistAlbumArtwork: vi.fn().mockResolvedValue(null),
    writeArtistArtworkIfMissing: vi.fn().mockResolvedValue(false),
    writeAlbumArtworkIfMissing: vi.fn().mockResolvedValue(false),
    listAlbumTrackPaths: vi.fn().mockResolvedValue([]),
  };
  const cacheSource: ArtworkBackfillCacheSourcePort = {
    findArtistImageUrl: vi.fn().mockResolvedValue(null),
    findAlbumCoverUrl: vi.fn().mockResolvedValue(null),
  };
  const embeddedSource: ArtworkBackfillEmbeddedSourcePort = {
    extractFromTracks: vi.fn().mockResolvedValue(null),
  };
  const deezerSource: ArtworkBackfillExternalSourcePort = {
    findArtistImageUrl: vi.fn().mockResolvedValue(null),
    findAlbumCoverUrl: vi.fn().mockResolvedValue(null),
  };
  const spotifySource: ArtworkBackfillExternalSourcePort = {
    findArtistImageUrl: vi.fn().mockResolvedValue(null),
    findAlbumCoverUrl: vi.fn().mockResolvedValue(null),
  };
  const repository: ArtworkBackfillRepositoryPort = {
    createRun: vi.fn(),
    getById: vi.fn(),
    getActiveRun: vi.fn(),
    updateStatus: vi.fn(),
    updateCheckpoint: vi.fn(),
  } as unknown as ArtworkBackfillRepositoryPort;

  const useCase = new ProcessArtworkBackfillBatchUseCase(
    candidateSource,
    fileSystemSource,
    cacheSource,
    embeddedSource,
    [deezerSource, spotifySource],
    repository,
  );

  return {
    useCase,
    candidateSource,
    fileSystemSource,
    cacheSource,
    embeddedSource,
    deezerSource,
    spotifySource,
    repository,
  };
}

describe("ProcessArtworkBackfillBatchUseCase", () => {
  it("skips artist candidate when local artwork already exists", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getArtistCandidates).mockResolvedValue([artistCandidate()]);
    vi.mocked(ctx.fileSystemSource.hasArtistArtwork).mockResolvedValue(true);

    const result = await ctx.useCase.execute({
      runId: "run-1",
      phase: "artists",
      limit: 10,
    });

    expect(result.processed).toBe(1);
    expect(result.skippedExisting).toBe(1);
    expect(result.written).toBe(0);
    expect(ctx.cacheSource.findArtistImageUrl).not.toHaveBeenCalled();
    expect(ctx.repository.updateCheckpoint).toHaveBeenCalledOnce();
  });

  it("writes artist artwork from cache source before spotify fallback", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getArtistCandidates).mockResolvedValue([artistCandidate()]);
    vi.mocked(ctx.cacheSource.findArtistImageUrl).mockResolvedValue("https://img/artist.jpg");
    vi.mocked(ctx.fileSystemSource.writeArtistArtworkIfMissing).mockResolvedValue(true);

    const result = await ctx.useCase.execute({
      runId: "run-2",
      phase: "artists",
      limit: 10,
      allowExternalFallback: false,
    });

    expect(result.written).toBe(1);
    expect(ctx.fileSystemSource.writeArtistArtworkIfMissing).toHaveBeenCalledWith(
      "Artist A",
      "https://img/artist.jpg",
    );
    expect(ctx.deezerSource.findArtistImageUrl).not.toHaveBeenCalled();
    expect(ctx.spotifySource.findArtistImageUrl).not.toHaveBeenCalled();
  });

  it("checks album in local -> embedded -> cache order and updates checkpoint counters", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getAlbumCandidates).mockResolvedValue([
      albumCandidate({ cursorValue: "album:A:One" }),
      albumCandidate({
        artistName: "Artist B",
        albumName: "Album Two",
        artistSpotifyId: "artist-b",
        albumSpotifyId: "album-two",
        cursorValue: "album:B:Two",
      }),
    ]);
    vi.mocked(ctx.fileSystemSource.listAlbumTrackPaths).mockResolvedValue(["/music/track1.flac"]);
    vi.mocked(ctx.embeddedSource.extractFromTracks).mockResolvedValue(null);
    vi.mocked(ctx.cacheSource.findAlbumCoverUrl).mockResolvedValueOnce("https://img/album-one.jpg");
    vi.mocked(ctx.fileSystemSource.writeAlbumArtworkIfMissing).mockResolvedValueOnce(true);
    vi.mocked(ctx.cacheSource.findAlbumCoverUrl).mockResolvedValueOnce(null);

    const result = await ctx.useCase.execute({
      runId: "run-3",
      phase: "albums",
      limit: 20,
      allowExternalFallback: false,
    });

    expect(result.processed).toBe(2);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(1);
    expect(ctx.repository.updateCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-3",
        phase: "albums",
        cursorKind: "album",
        cursorValue: "album:B:Two",
        processed: 2,
        written: 1,
        failed: 1,
      }),
    );
    expect(ctx.deezerSource.findAlbumCoverUrl).not.toHaveBeenCalled();
    expect(ctx.spotifySource.findAlbumCoverUrl).not.toHaveBeenCalled();
  });

  it("ABF-2b: writes artist artwork from spotify fallback when deezer and local and cache miss", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getArtistCandidates).mockResolvedValue([artistCandidate()]);
    vi.mocked(ctx.cacheSource.findArtistImageUrl).mockResolvedValue(null);
    vi.mocked(ctx.deezerSource.findArtistImageUrl).mockResolvedValue(null);
    vi.mocked(ctx.spotifySource.findArtistImageUrl).mockResolvedValue(
      "https://img/spotify-artist.jpg",
    );
    vi.mocked(ctx.fileSystemSource.writeArtistArtworkIfMissing).mockResolvedValue(true);

    const result = await ctx.useCase.execute({
      runId: "run-4",
      phase: "artists",
      limit: 10,
      allowExternalFallback: true,
    });

    expect(result.externalCalls).toBe(1);
    expect(result.failed).toBe(0);
    expect(ctx.deezerSource.findArtistImageUrl).toHaveBeenCalledWith(artistCandidate());
    expect(ctx.spotifySource.findArtistImageUrl).toHaveBeenCalledWith(artistCandidate());
    expect(ctx.fileSystemSource.writeArtistArtworkIfMissing).toHaveBeenCalledWith(
      "Artist A",
      "https://img/spotify-artist.jpg",
    );
  });

  it("uses local album artwork as artist fallback before external sources", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getArtistCandidates).mockResolvedValue([artistCandidate()]);
    vi.mocked(ctx.cacheSource.findArtistImageUrl).mockResolvedValue(null);
    vi.mocked(ctx.fileSystemSource.findArtistAlbumArtwork).mockResolvedValue(
      "file:///music/Artist A/Album One/cover.jpg",
    );
    vi.mocked(ctx.fileSystemSource.writeArtistArtworkIfMissing).mockResolvedValue(true);

    const result = await ctx.useCase.execute({
      runId: "run-4b",
      phase: "artists",
      limit: 10,
      allowExternalFallback: true,
    });

    expect(result.written).toBe(1);
    expect(result.externalCalls).toBe(0);
    expect(ctx.deezerSource.findArtistImageUrl).not.toHaveBeenCalled();
    expect(ctx.spotifySource.findArtistImageUrl).not.toHaveBeenCalled();
    expect(ctx.fileSystemSource.writeArtistArtworkIfMissing).toHaveBeenCalledWith(
      "Artist A",
      "file:///music/Artist A/Album One/cover.jpg",
    );
  });

  it("writes album artwork from spotify fallback when local embedded deezer and cache miss", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getAlbumCandidates).mockResolvedValue([albumCandidate()]);
    vi.mocked(ctx.embeddedSource.extractFromTracks).mockResolvedValue(null);
    vi.mocked(ctx.cacheSource.findAlbumCoverUrl).mockResolvedValue(null);
    vi.mocked(ctx.deezerSource.findAlbumCoverUrl).mockResolvedValue(null);
    vi.mocked(ctx.spotifySource.findAlbumCoverUrl).mockResolvedValue(
      "https://img/spotify-cover.jpg",
    );
    vi.mocked(ctx.fileSystemSource.writeAlbumArtworkIfMissing).mockResolvedValue(true);

    const result = await ctx.useCase.execute({
      runId: "run-5",
      phase: "albums",
      limit: 10,
      allowExternalFallback: true,
    });

    expect(result.externalCalls).toBe(1);
    expect(result.failed).toBe(0);
    expect(ctx.fileSystemSource.writeAlbumArtworkIfMissing).toHaveBeenCalledWith(
      "Artist A",
      "Album One",
      "https://img/spotify-cover.jpg",
    );
  });

  it("ABF-2a: deezer resolves album cover — spotify source NOT called", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getAlbumCandidates).mockResolvedValue([albumCandidate()]);
    vi.mocked(ctx.embeddedSource.extractFromTracks).mockResolvedValue(null);
    vi.mocked(ctx.cacheSource.findAlbumCoverUrl).mockResolvedValue(null);
    vi.mocked(ctx.deezerSource.findAlbumCoverUrl).mockResolvedValue(
      "https://cdn.deezer.com/album.jpg",
    );
    vi.mocked(ctx.fileSystemSource.writeAlbumArtworkIfMissing).mockResolvedValue(true);

    const result = await ctx.useCase.execute({
      runId: "run-abf-2a",
      phase: "albums",
      limit: 10,
      allowExternalFallback: true,
    });

    expect(result.externalCalls).toBe(1);
    expect(ctx.spotifySource.findAlbumCoverUrl).not.toHaveBeenCalled();
    expect(ctx.fileSystemSource.writeAlbumArtworkIfMissing).toHaveBeenCalledWith(
      "Artist A",
      "Album One",
      "https://cdn.deezer.com/album.jpg",
    );
  });

  it("ABF-2a: deezer resolves artist image — spotify source NOT called", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getArtistCandidates).mockResolvedValue([artistCandidate()]);
    vi.mocked(ctx.cacheSource.findArtistImageUrl).mockResolvedValue(null);
    vi.mocked(ctx.deezerSource.findArtistImageUrl).mockResolvedValue(
      "https://cdn.deezer.com/artist.jpg",
    );
    vi.mocked(ctx.fileSystemSource.writeArtistArtworkIfMissing).mockResolvedValue(true);

    const result = await ctx.useCase.execute({
      runId: "run-abf-2a-artist",
      phase: "artists",
      limit: 10,
      allowExternalFallback: true,
    });

    expect(result.externalCalls).toBe(1);
    expect(ctx.spotifySource.findArtistImageUrl).not.toHaveBeenCalled();
    expect(ctx.fileSystemSource.writeArtistArtworkIfMissing).toHaveBeenCalledWith(
      "Artist A",
      "https://cdn.deezer.com/artist.jpg",
    );
  });

  it("ABF-2c: both external sources miss — candidate counted as failed, no crash", async () => {
    const ctx = build();
    vi.mocked(ctx.candidateSource.getAlbumCandidates).mockResolvedValue([albumCandidate()]);
    vi.mocked(ctx.embeddedSource.extractFromTracks).mockResolvedValue(null);
    vi.mocked(ctx.cacheSource.findAlbumCoverUrl).mockResolvedValue(null);
    vi.mocked(ctx.deezerSource.findAlbumCoverUrl).mockResolvedValue(null);
    vi.mocked(ctx.spotifySource.findAlbumCoverUrl).mockResolvedValue(null);

    const result = await ctx.useCase.execute({
      runId: "run-abf-2c",
      phase: "albums",
      limit: 10,
      allowExternalFallback: true,
    });

    expect(result.failed).toBe(1);
    expect(result.externalCalls).toBe(0);
  });
});
