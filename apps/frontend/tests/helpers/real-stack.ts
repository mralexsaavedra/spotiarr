import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.PLAYWRIGHT_REAL_PORT ?? "3000", 10);
const ROOT_DIR = fileURLToPath(new URL("../../../../", import.meta.url));
const BACKEND_DIR = path.join(ROOT_DIR, "apps/backend");
const requireBackendHarness = createRequire(import.meta.url);

const SEEDED_SETTINGS = [
  { key: "UI_LANGUAGE", value: "en" },
  { key: "FORMAT", value: "m4a" },
  { key: "spotify_user_access_token", value: "e2e-access-token" },
  { key: "spotify_user_refresh_token", value: "e2e-refresh-token" },
] as const;

const SEEDED_LIBRARY_ARTISTS = [
  {
    name: "Tycho",
    imageFileName: "folder.png",
    albums: [
      {
        name: "Epoch",
        imageFileName: "cover.png",
        tracks: [
          {
            fileName: "01 - A Walk.mp3",
            name: "A Walk",
          },
        ],
      },
    ],
  },
] as const;

const SEEDED_PLAYLISTS = [
  {
    id: "real-history-playlist",
    name: "Managed Archive Mix",
    type: "playlist",
    spotifyUrl: "https://open.spotify.com/playlist/managed-archive-mix",
    owner: "Spotiarr",
    ownerUrl: "https://open.spotify.com/user/spotiarr",
    coverUrl: null,
    subscribed: true,
    createdAt: 1_700_000_000_000,
  },
] as const;

const SEEDED_TRACKS = [
  {
    id: "real-history-track-1",
    playlistId: "real-history-playlist",
    name: "A Walk",
    artist: "Tycho",
    album: "Epoch",
    status: "Completed",
    spotifyUrl: "https://open.spotify.com/track/real-history-track-1",
    trackUrl: "https://open.spotify.com/track/real-history-track-1",
    durationMs: 214_000,
    completedAt: 1_700_000_000_500,
    createdAt: 1_700_000_000_000,
    playlistIndex: 0,
  },
] as const;

const SEEDED_DOWNLOAD_HISTORY = [
  {
    id: "real-history-entry-1",
    playlistId: "real-history-playlist",
    trackId: "real-history-track-1",
    playlistName: "Managed Archive Mix",
    playlistSpotifyUrl: "https://open.spotify.com/playlist/managed-archive-mix",
    trackName: "A Walk",
    artist: "Tycho",
    album: "Epoch",
    trackUrl: "https://open.spotify.com/track/real-history-track-1",
    completedAt: 1_700_000_001_000,
    createdAt: 1_700_000_001_000,
  },
] as const;

const SILENT_AUDIO_BUFFER = Buffer.from("ID3");
const PNG_PIXEL_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p6k9S4AAAAASUVORK5CYII=",
  "base64",
);

interface RealStackContext {
  tempDir: string;
  downloadsDir: string;
  databasePath: string;
  databaseUrl: string;
}

interface PlaywrightRealStackServerHandle {
  shutdown: () => Promise<void>;
}

interface PlaywrightRealStackServerModule {
  startPlaywrightRealStackServer: (options: {
    host: string;
    port: number;
  }) => Promise<PlaywrightRealStackServerHandle>;
}

interface SeedPlaylistInput {
  id: string;
  name: string;
  type: string;
  spotifyUrl: string;
  owner: string;
  ownerUrl: string;
  coverUrl: string | null;
  subscribed: boolean;
  createdAt: number;
}

interface SeedTrackInput {
  id: string;
  playlistId: string;
  name: string;
  artist: string;
  album: string;
  status: string;
  spotifyUrl: string;
  trackUrl: string;
  durationMs: number;
  completedAt: number;
  createdAt: number;
  playlistIndex: number;
}

interface SeedDownloadHistoryInput {
  id: string;
  playlistId: string;
  trackId: string;
  playlistName: string;
  playlistSpotifyUrl: string;
  trackName: string;
  artist: string;
  album: string;
  trackUrl: string;
  completedAt: number;
  createdAt: number;
}

interface SeedLibraryTrackInput {
  fileName: string;
  name: string;
}

interface SeedLibraryAlbumInput {
  name: string;
  imageFileName?: string;
  tracks: SeedLibraryTrackInput[];
}

interface SeedLibraryArtistInput {
  name: string;
  imageFileName?: string;
  albums: SeedLibraryAlbumInput[];
}

function createContext(): RealStackContext {
  const tempDir = mkdtempSync(path.join(tmpdir(), "spotiarr-e2e-real-"));
  const downloadsDir = path.join(tempDir, "downloads");
  const databasePath = path.join(tempDir, "real-stack.db");

  mkdirSync(downloadsDir, { recursive: true });

  return {
    tempDir,
    downloadsDir,
    databasePath,
    databaseUrl: `file:${databasePath}`,
  };
}

function applyEnvironment(context: RealStackContext): void {
  if (!Number.isInteger(PORT) || PORT <= 0) {
    throw new Error(`Invalid PLAYWRIGHT_REAL_PORT: ${process.env.PLAYWRIGHT_REAL_PORT ?? ""}`);
  }

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = context.databaseUrl;
  process.env.DOWNLOADS = context.downloadsDir;
  process.env.REDIS_HOST = HOST;
  process.env.REDIS_PORT = "6379";
  process.env.SPOTIFY_CLIENT_ID = "e2e-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = "e2e-client-secret";
  process.env.SPOTIFY_REDIRECT_URI = `http://${HOST}:${PORT}/api/auth/spotify/callback`;
  process.env.PLAYWRIGHT_REAL_PORT = String(PORT);
  process.env.PLAYWRIGHT_REAL_BASE_URL = `http://${HOST}:${PORT}`;
}

function runBackendMigrations(): void {
  execFileSync("pnpm", ["--filter", "backend", "run", "prisma:migrate:deploy"], {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: "inherit",
  });
}

export function seedLibraryData(
  downloadsDir: string,
  artists: SeedLibraryArtistInput[] = [...SEEDED_LIBRARY_ARTISTS],
): void {
  for (const artist of artists) {
    const artistDir = path.join(downloadsDir, artist.name);
    mkdirSync(artistDir, { recursive: true });

    if (artist.imageFileName) {
      writeFileSync(path.join(artistDir, artist.imageFileName), PNG_PIXEL_BUFFER);
    }

    for (const album of artist.albums) {
      const albumDir = path.join(artistDir, album.name);
      mkdirSync(albumDir, { recursive: true });

      if (album.imageFileName) {
        writeFileSync(path.join(albumDir, album.imageFileName), PNG_PIXEL_BUFFER);
      }

      for (const track of album.tracks) {
        writeFileSync(path.join(albumDir, track.fileName), SILENT_AUDIO_BUFFER);
      }
    }
  }
}

async function seedPlaylists(
  prisma: PrismaClient,
  playlists: readonly SeedPlaylistInput[],
): Promise<void> {
  for (const playlist of playlists) {
    await prisma.playlist.create({
      data: {
        id: playlist.id,
        name: playlist.name,
        type: playlist.type,
        spotifyUrl: playlist.spotifyUrl,
        owner: playlist.owner,
        ownerUrl: playlist.ownerUrl,
        coverUrl: playlist.coverUrl,
        subscribed: playlist.subscribed,
        createdAt: BigInt(playlist.createdAt),
      },
    });
  }
}

async function seedTracks(prisma: PrismaClient, tracks: readonly SeedTrackInput[]): Promise<void> {
  for (const track of tracks) {
    await prisma.track.create({
      data: {
        id: track.id,
        playlistId: track.playlistId,
        name: track.name,
        artist: track.artist,
        album: track.album,
        status: track.status,
        spotifyUrl: track.spotifyUrl,
        trackUrl: track.trackUrl,
        durationMs: track.durationMs,
        completedAt: BigInt(track.completedAt),
        createdAt: BigInt(track.createdAt),
        playlistIndex: track.playlistIndex,
      },
    });
  }
}

async function seedDownloadHistory(
  prisma: PrismaClient,
  entries: readonly SeedDownloadHistoryInput[],
): Promise<void> {
  for (const entry of entries) {
    await prisma.downloadHistory.create({
      data: {
        id: entry.id,
        playlistId: entry.playlistId,
        trackId: entry.trackId,
        playlistName: entry.playlistName,
        playlistSpotifyUrl: entry.playlistSpotifyUrl,
        trackName: entry.trackName,
        artist: entry.artist,
        album: entry.album,
        trackUrl: entry.trackUrl,
        completedAt: BigInt(entry.completedAt),
        createdAt: BigInt(entry.createdAt),
      },
    });
  }
}

async function seedDatabase(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    await prisma.downloadHistory.deleteMany();
    await prisma.track.deleteMany();
    await prisma.playlist.deleteMany();
    await prisma.setting.deleteMany();

    await prisma.setting.createMany({
      data: SEEDED_SETTINGS.map((setting) => ({
        key: setting.key,
        value: setting.value,
        updatedAt: BigInt(0),
      })),
    });

    await seedPlaylists(prisma, SEEDED_PLAYLISTS);
    await seedTracks(prisma, SEEDED_TRACKS);
    await seedDownloadHistory(prisma, SEEDED_DOWNLOAD_HISTORY);
  } finally {
    await prisma.$disconnect();
  }
}

async function startServer(): Promise<PlaywrightRealStackServerHandle> {
  const harnessPath = path.join(BACKEND_DIR, "dist/testing/playwright-real-stack-server.js");
  const harness = requireBackendHarness(harnessPath) as PlaywrightRealStackServerModule;

  return harness.startPlaywrightRealStackServer({ host: HOST, port: PORT });
}

async function main(): Promise<void> {
  const context = createContext();
  applyEnvironment(context);
  seedLibraryData(context.downloadsDir);
  runBackendMigrations();
  await seedDatabase(context.databaseUrl);

  const { shutdown: shutdownServer } = await startServer();
  let shuttingDown = false;

  const shutdown = async (exitCode = 0): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await shutdownServer();
    rmSync(context.tempDir, { recursive: true, force: true });
    process.exit(exitCode);
  };

  process.on("SIGINT", () => {
    void shutdown(0);
  });

  process.on("SIGTERM", () => {
    void shutdown(0);
  });
}

const executedAsScript = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (executedAsScript) {
  void main().catch((error: unknown) => {
    console.error("[playwright-real-stack] failed to start", error);
    process.exit(1);
  });
}
