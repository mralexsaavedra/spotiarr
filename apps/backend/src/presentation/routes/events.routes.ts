import type { Request, Response, Router as ExpressRouter } from "express";
import { Router } from "express";
import { getErrorMessage } from "@/infrastructure/utils/error.utils";

const router: ExpressRouter = Router();

interface SseClient {
  id: number;
  res: Response;
}

const clients: SseClient[] = [];
let clientId = 0;

router.get("/", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Allow CORS for dev if needed
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Initial comment to keep connection open
  res.write(": connected\n\n");

  const id = clientId++;
  clients.push({ id, res });

  req.on("close", () => {
    const index = clients.findIndex((c) => c.id === id);
    if (index >= 0) {
      clients.splice(index, 1);
    }
  });
});

export function emitSseEvent(event: string, data: unknown = {}): void {
  if (clients.length === 0) {
    return;
  }

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch (error) {
      console.error("Failed to write SSE event:", getErrorMessage(error));
    }
  }
}

export default router;
