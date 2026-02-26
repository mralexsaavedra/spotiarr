import { Request, Response } from "express";
import { getErrorMessage } from "@/infrastructure/utils/error.utils";

interface SseClient {
  id: number;
  res: Response;
}

export class EventsController {
  private clients: SseClient[] = [];
  private clientId = 0;

  connect = (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Allow CORS for dev if needed
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Initial comment to keep connection open
    res.write(": connected\n\n");

    const id = this.clientId++;
    this.clients.push({ id, res });

    req.on("close", () => {
      const index = this.clients.findIndex((c) => c.id === id);
      if (index >= 0) {
        this.clients.splice(index, 1);
      }
    });
  };

  emit = (event: string, data: unknown = {}): void => {
    if (this.clients.length === 0) {
      return;
    }

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch (error) {
        console.error("Failed to write SSE event:", getErrorMessage(error));
      }
    }
  };
}
