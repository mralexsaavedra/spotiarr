import { Request, Response } from "express";
import { z } from "zod";
import type { ResolveExternalUrlUseCase } from "@/application/use-cases/external-url/resolve-external-url.use-case";

const ExternalUrlQuerySchema = z.object({
  provider: z.enum(["spotify"]),
  type: z.enum(["artist", "album", "track"]),
  id: z.string().min(1),
  name: z.string().optional(),
  artist: z.string().optional(),
});

export class ExternalUrlController {
  constructor(private readonly resolveExternalUrl: ResolveExternalUrlUseCase) {}

  resolve = async (req: Request, res: Response) => {
    const parseResult = ExternalUrlQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ error: "invalid_params", details: parseResult.error.flatten() });
      return;
    }

    const { provider, type, id, name, artist } = parseResult.data;

    try {
      const url = await this.resolveExternalUrl.resolve({
        provider,
        type,
        internalId: id,
        name,
        artistName: artist,
      });

      if (!url) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      res.json({ url });
    } catch (err) {
      // Circuit open or transient Spotify error — retryable
      const status = (err as { status?: number })?.status === 503 ? 503 : 503;
      res.status(status).json({ error: "service_unavailable", retryable: true });
    }
  };
}
