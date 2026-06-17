import type { LibraryScanResult } from "@spotiarr/shared";
import { describe, expect, it, vi } from "vitest";
import type { ScanLibraryUseCase } from "../use-cases/library/scan-library.use-case";
import { LibraryService } from "./library.service";

const MOCK_RESULT: LibraryScanResult = {
  totalArtists: 3,
  totalAlbums: 10,
  totalTracks: 42,
  totalSize: 1024,
  lastScannedAt: 1704067200000,
  scanDuration: 500,
  artists: [
    {
      name: "Artist A",
      path: "/music/artist-a",
      albumCount: 2,
      trackCount: 8,
      totalSize: 512,
      image: "https://img/a.jpg",
      albums: [],
    },
    {
      name: "Artist B",
      path: "/music/artist-b",
      albumCount: 8,
      trackCount: 34,
      totalSize: 512,
      image: undefined,
      albums: [],
    },
  ],
};

function makeUseCase(result: LibraryScanResult = MOCK_RESULT): ScanLibraryUseCase {
  return { execute: vi.fn().mockResolvedValue(result) } as unknown as ScanLibraryUseCase;
}

describe("LibraryService.getLibrary", () => {
  it("calls the use case and returns its result on the first call", async () => {
    const uc = makeUseCase();
    const svc = new LibraryService(uc);
    const result = await svc.getLibrary();
    expect(result).toEqual(MOCK_RESULT);
    expect(uc.execute).toHaveBeenCalledOnce();
  });

  it("returns the cached result without calling the use case again", async () => {
    const uc = makeUseCase();
    const svc = new LibraryService(uc);
    await svc.getLibrary();
    const second = await svc.getLibrary();
    expect(second).toEqual(MOCK_RESULT);
    expect(uc.execute).toHaveBeenCalledOnce();
  });

  it("bypasses the cache when forceRefresh=true", async () => {
    const uc = makeUseCase();
    const svc = new LibraryService(uc);
    await svc.getLibrary();
    await svc.getLibrary(true);
    expect(uc.execute).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent calls — use case executes only once", async () => {
    const uc = makeUseCase();
    const svc = new LibraryService(uc);
    const [r1, r2] = await Promise.all([svc.getLibrary(), svc.getLibrary()]);
    expect(r1).toEqual(MOCK_RESULT);
    expect(r2).toEqual(MOCK_RESULT);
    expect(uc.execute).toHaveBeenCalledOnce();
  });

  it("clears scanPromise after the use case resolves (allows a subsequent fresh call)", async () => {
    const uc = makeUseCase();
    const svc = new LibraryService(uc);
    await svc.getLibrary(true);
    await svc.getLibrary(true);
    expect(uc.execute).toHaveBeenCalledTimes(2);
  });

  it("propagates use case rejection", async () => {
    const uc = {
      execute: vi.fn().mockRejectedValue(new Error("scan failed")),
    } as unknown as ScanLibraryUseCase;
    const svc = new LibraryService(uc);
    await expect(svc.getLibrary()).rejects.toThrow("scan failed");
  });

  it("clears scanPromise even when use case rejects (allows retry)", async () => {
    const uc = {
      execute: vi
        .fn()
        .mockRejectedValueOnce(new Error("first failure"))
        .mockResolvedValueOnce(MOCK_RESULT),
    } as unknown as ScanLibraryUseCase;
    const svc = new LibraryService(uc);
    await expect(svc.getLibrary()).rejects.toThrow("first failure");
    const result = await svc.getLibrary();
    expect(result).toEqual(MOCK_RESULT);
  });
});

describe("LibraryService.getStats", () => {
  it("returns stat fields extracted from the library result", async () => {
    const svc = new LibraryService(makeUseCase());
    const stats = await svc.getStats();
    const expected = {
      totalArtists: MOCK_RESULT.totalArtists,
      totalAlbums: MOCK_RESULT.totalAlbums,
      totalTracks: MOCK_RESULT.totalTracks,
      totalSize: MOCK_RESULT.totalSize,
      lastScannedAt: MOCK_RESULT.lastScannedAt,
    };
    expect(stats).toEqual(expected);
  });

  it("propagates use case rejection", async () => {
    const uc = {
      execute: vi.fn().mockRejectedValue(new Error("stats error")),
    } as unknown as ScanLibraryUseCase;
    const svc = new LibraryService(uc);
    await expect(svc.getStats()).rejects.toThrow("stats error");
  });
});

describe("LibraryService.getArtists", () => {
  it("maps artist fields from the library result", async () => {
    const svc = new LibraryService(makeUseCase());
    const artists = await svc.getArtists();
    expect(artists).toEqual([
      {
        name: "Artist A",
        path: "/music/artist-a",
        albumCount: 2,
        trackCount: 8,
        totalSize: 512,
        image: "https://img/a.jpg",
      },
      {
        name: "Artist B",
        path: "/music/artist-b",
        albumCount: 8,
        trackCount: 34,
        totalSize: 512,
        image: undefined,
      },
    ]);
  });

  it("returns an empty array when the library has no artists", async () => {
    const emptyResult = { ...MOCK_RESULT, artists: [] };
    const svc = new LibraryService(makeUseCase(emptyResult));
    expect(await svc.getArtists()).toEqual([]);
  });
});

describe("LibraryService.getArtist", () => {
  it("returns the matching artist when found", async () => {
    const svc = new LibraryService(makeUseCase());
    const artist = await svc.getArtist("Artist A");
    expect(artist?.name).toBe("Artist A");
  });

  it("returns null when no artist matches the given name", async () => {
    const svc = new LibraryService(makeUseCase());
    expect(await svc.getArtist("Unknown")).toBeNull();
  });
});

describe("LibraryService.scan", () => {
  it("triggers a force-refresh and returns the scan result", async () => {
    const uc = makeUseCase();
    const svc = new LibraryService(uc);
    // Warm the cache first
    await svc.getLibrary();
    const result = await svc.scan();
    expect(result).toEqual(MOCK_RESULT);
    // scan() must bypass the cache
    expect(uc.execute).toHaveBeenCalledTimes(2);
  });
});

describe("LibraryService.clearCache", () => {
  it("removes the cached result so the next getLibrary call hits the use case again", async () => {
    const uc = makeUseCase();
    const svc = new LibraryService(uc);
    await svc.getLibrary(); // populates cache
    svc.clearCache();
    await svc.getLibrary(); // must call use case again
    expect(uc.execute).toHaveBeenCalledTimes(2);
  });
});
