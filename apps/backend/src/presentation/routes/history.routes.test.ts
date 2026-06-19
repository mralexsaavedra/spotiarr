import express, { type Express } from "express";
import http from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryUseCases } from "@/application/use-cases/history/history.use-cases";
import type { Container } from "@/container";
import { HistoryController } from "../controllers/history.controller";
import { errorHandler } from "../middleware/error-handler";
import { createHistoryRoutes } from "./history.routes";

const servers: http.Server[] = [];

function makeUseCases(overrides: Partial<HistoryUseCases> = {}): HistoryUseCases {
  return {
    getRecentDownloads: vi.fn().mockResolvedValue([]),
    getRecentTracks: vi.fn().mockResolvedValue([]),
    recordPlay: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as HistoryUseCases;
}

function buildApp(useCases: HistoryUseCases): Express {
  const controller = new HistoryController(useCases);
  const container = { historyController: controller } as unknown as Container;
  const app = express();
  app.use(express.json());
  app.use("/history", createHistoryRoutes(container));
  app.use(errorHandler);
  return app;
}

async function startServer(app: Express): Promise<string> {
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  servers.push(server);
  const address = server.address();
  if (address && typeof address === "object") {
    return `http://127.0.0.1:${address.port}`;
  }
  throw new Error("Unable to resolve server address");
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (s) =>
        new Promise<void>((resolve) => {
          s.close(() => resolve());
        }),
    ),
  );
});

const validBody = {
  trackId: "track-uuid-1",
  trackUrl: "https://open.spotify.com/track/abc",
  trackName: "Test Song",
  artist: "Test Artist",
  album: "Test Album",
  albumCoverUrl: null,
  durationMs: 180_000,
  playedAt: 1_700_000_000_000,
};

describe("POST /history/plays", () => {
  let useCases: HistoryUseCases;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    useCases = makeUseCases();
    baseUrl = await startServer(buildApp(useCases));
  });

  it("returns 201 on valid body", async () => {
    const res = await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    expect(res.status).toBe(201);
    expect(useCases.recordPlay).toHaveBeenCalledOnce();
  });

  it("returns 400 when trackName is missing", async () => {
    const { trackName: _, ...bodyWithoutTrackName } = validBody;

    const res = await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyWithoutTrackName),
    });

    expect(res.status).toBe(400);
    expect(useCases.recordPlay).not.toHaveBeenCalled();
  });

  it("returns 400 when artist is missing", async () => {
    const { artist: _, ...bodyWithoutArtist } = validBody;

    const res = await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyWithoutArtist),
    });

    expect(res.status).toBe(400);
    expect(useCases.recordPlay).not.toHaveBeenCalled();
  });

  it("returns 400 when playedAt is missing", async () => {
    const { playedAt: _, ...bodyWithoutPlayedAt } = validBody;

    const res = await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyWithoutPlayedAt),
    });

    expect(res.status).toBe(400);
    expect(useCases.recordPlay).not.toHaveBeenCalled();
  });

  it("returns 400 when body is empty", async () => {
    const res = await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(useCases.recordPlay).not.toHaveBeenCalled();
  });

  it("passes the parsed body fields to the use case", async () => {
    await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    expect(useCases.recordPlay).toHaveBeenCalledWith(
      expect.objectContaining({
        trackName: "Test Song",
        artist: "Test Artist",
        playedAt: 1_700_000_000_000,
      }),
    );
  });

  it("accepts playedAt=0 (epoch timestamp)", async () => {
    const res = await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, playedAt: 0 }),
    });

    expect(res.status).toBe(201);
    expect(useCases.recordPlay).toHaveBeenCalledOnce();
  });

  it("accepts durationMs=0 (unknown duration)", async () => {
    const res = await fetch(`${baseUrl}/history/plays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validBody, durationMs: 0 }),
    });

    expect(res.status).toBe(201);
    expect(useCases.recordPlay).toHaveBeenCalledOnce();
  });
});
