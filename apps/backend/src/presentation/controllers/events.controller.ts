import { Request, Response } from "express";
import { resolveAllowedOrigin } from "../middleware/cors";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface SseClient {
  id: number;
  res: Response;
}

export class EventsController {
  private clients: SseClient[] = [];
  private clientId = 0;

  constructor(private readonly getCorsAllowlist: () => string[] | undefined = () => undefined) {}

  connect = (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Align SSE with the global CORS policy: echo the origin only when it is
    // on the explicit allowlist. Same-origin deployments send no CORS header.
    const allowedOrigin = resolveAllowedOrigin(req.headers.origin, this.getCorsAllowlist());
    if (allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }

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
        console.error("Failed to write SSE event:", toErrorMessage(error));
      }
    }
  };
}
