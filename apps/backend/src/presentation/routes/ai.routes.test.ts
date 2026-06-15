import express, { type Express } from "express";
import http from "node:http";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import type { Container } from "@/container";
import { AiChatController } from "../controllers/ai.controller";
import { errorHandler } from "../middleware/error-handler";
import { createAiRoutes } from "./ai.routes";

const servers: http.Server[] = [];

function makeQueueService(enqueueGenerate = vi.fn().mockResolvedValue(undefined)) {
  return { enqueueGenerate };
}

function buildApp(container: Container): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/ai", createAiRoutes(container));
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
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

describe("POST /api/ai/chat/generate", () => {
  let enqueueGenerate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    enqueueGenerate = vi.fn().mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  it("returns 202 with jobId for a valid prompt", async () => {
    const queueService = makeQueueService(enqueueGenerate);
    const aiChatController = new AiChatController(queueService);
    const container = {
      aiChatController,
      aiPlaylistQueueService: queueService,
    } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/chat/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "upbeat 90s rock" }),
    });

    expect(res.status).toBe(202);
    const body = (await res.json()) as { data: { jobId: string } };
    expect(body).toHaveProperty("data.jobId");
    expect(typeof body.data.jobId).toBe("string");
  });

  it("returns 400 for an empty prompt — enqueue NOT called", async () => {
    const queueService = makeQueueService(enqueueGenerate);
    const aiChatController = new AiChatController(queueService);
    const container = {
      aiChatController,
      aiPlaylistQueueService: queueService,
    } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/chat/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "" }),
    });

    expect(res.status).toBe(400);
    expect(enqueueGenerate).not.toHaveBeenCalled();
  });

  it("returns 400 for a whitespace-only prompt — enqueue NOT called", async () => {
    const queueService = makeQueueService(enqueueGenerate);
    const aiChatController = new AiChatController(queueService);
    const container = {
      aiChatController,
      aiPlaylistQueueService: queueService,
    } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/chat/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "   " }),
    });

    expect(res.status).toBe(400);
    expect(enqueueGenerate).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt exceeds 500 characters — enqueue NOT called", async () => {
    const queueService = makeQueueService(enqueueGenerate);
    const aiChatController = new AiChatController(queueService);
    const container = {
      aiChatController,
      aiPlaylistQueueService: queueService,
    } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/chat/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "a".repeat(501) }),
    });

    expect(res.status).toBe(400);
    expect(enqueueGenerate).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt is missing from body — enqueue NOT called", async () => {
    const queueService = makeQueueService(enqueueGenerate);
    const aiChatController = new AiChatController(queueService);
    const container = {
      aiChatController,
      aiPlaylistQueueService: queueService,
    } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/chat/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(enqueueGenerate).not.toHaveBeenCalled();
  });
});

describe("POST /api/ai/models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with sorted model ids", async () => {
    const listModelsFn = vi.fn().mockResolvedValue(["gpt-3.5-turbo", "gpt-4o"]);
    const aiChatController = new AiChatController(makeQueueService(), listModelsFn);
    const container = { aiChatController } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { models: string[] } };
    expect(body.data.models).toEqual(["gpt-3.5-turbo", "gpt-4o"]);
  });

  it("returns 200 with empty array when no models", async () => {
    const listModelsFn = vi.fn().mockResolvedValue([]);
    const aiChatController = new AiChatController(makeQueueService(), listModelsFn);
    const container = { aiChatController } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { models: string[] } };
    expect(body.data.models).toEqual([]);
  });

  it("passes override body fields to listModelsFn", async () => {
    const listModelsFn = vi.fn().mockResolvedValue(["gpt-4o"]);
    const aiChatController = new AiChatController(makeQueueService(), listModelsFn);
    const container = { aiChatController } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "openai", apiKey: "sk-body" }),
    });

    expect(res.status).toBe(200);
    expect(listModelsFn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "openai", apiKey: "sk-body" }),
    );
  });

  it("accepts empty body", async () => {
    const listModelsFn = vi.fn().mockResolvedValue([]);
    const aiChatController = new AiChatController(makeQueueService(), listModelsFn);
    const container = { aiChatController } as unknown as Container;
    const baseUrl = await startServer(buildApp(container));

    const res = await fetch(`${baseUrl}/api/ai/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    expect(res.status).toBe(200);
  });
});
