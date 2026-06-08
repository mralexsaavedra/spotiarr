import express from "express";
import type { Request, Response } from "express";
import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Container } from "@/container";
import { createEventsRoutes } from "./events.routes";

const servers: http.Server[] = [];

function createTestContainer(): Pick<Container, "eventsController"> {
  return {
    eventsController: {
      connect: vi.fn((_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      }),
    },
  } as unknown as Pick<Container, "eventsController">;
}

async function startServer(container: Pick<Container, "eventsController">): Promise<string> {
  const app = express();
  app.use("/events", createEventsRoutes(container as Container));

  const server = await new Promise<http.Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
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

describe("createEventsRoutes", () => {
  it("registers the initialized controller handler without proxy failures", async () => {
    const container = createTestContainer();
    const baseUrl = await startServer(container);

    const response = await fetch(`${baseUrl}/events`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(container.eventsController.connect).toHaveBeenCalledOnce();
  });
});
