import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import type { AiChatPort, AiTrackSuggestion } from "@/application/ports/ai-chat.port";
import type { SettingsService } from "@/application/services/settings.service";
import { AiChatError } from "@/domain/errors/ai-chat.error";
import { logger } from "@/infrastructure/logging/logger";
import { resolveAiConnection } from "./ai-connection.resolver";

const tracksSchema = z.object({
  tracks: z
    .array(
      z.object({
        title: z.string().min(1),
        artist: z.string().min(1),
      }),
    )
    .min(1)
    .max(50),
});

type GenerateObjectParams = {
  model: ReturnType<ReturnType<typeof createOpenAI>["chat"]>;
  schema: typeof tracksSchema;
  system: string;
  prompt: string;
};

export type GenerateObjectFn = (
  params: GenerateObjectParams,
) => Promise<{ object: { tracks: AiTrackSuggestion[] } }>;

interface AdapterConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  generateFn?: GenerateObjectFn;
}

function extractApiCallErrorReason(err: { responseBody?: string; message?: string }): string {
  const body = err.responseBody;
  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: unknown };
      if (typeof parsed.error === "string" && parsed.error.length > 0) {
        return parsed.error;
      }
    } catch {
      // responseBody is not JSON; fall back to the raw body below
    }
    return body;
  }
  return err.message ?? "Unknown provider error";
}

function mapError(err: unknown): never {
  const statusCode = (err as { statusCode?: number })?.statusCode;
  logger.error(
    { component: "openai-compatible-adapter", name: (err as { name?: string })?.name, statusCode },
    "upstream error",
  );

  if (err instanceof AiChatError) throw err;

  const apiErr = err as {
    name?: string;
    statusCode?: number;
    responseBody?: string;
    message?: string;
  };
  if (apiErr?.name === "AI_APICallError") {
    if (apiErr.statusCode === 401) {
      throw new AiChatError("provider-auth", extractApiCallErrorReason(apiErr));
    }
    if (apiErr.statusCode === 403) {
      throw new AiChatError("provider-forbidden", extractApiCallErrorReason(apiErr));
    }
  }

  if (err instanceof Error) {
    if (
      err.name === "AI_NoObjectGeneratedError" ||
      err instanceof NoObjectGeneratedError ||
      err.name === "ZodError"
    ) {
      throw new AiChatError("llm-bad-output", err.message);
    }

    if (
      err.name === "TypeError" ||
      err.message.includes("fetch") ||
      err.message.includes("network") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("timeout") ||
      err.message.includes("abort")
    ) {
      throw new AiChatError("provider-unreachable", err.message);
    }
  }

  throw new AiChatError("provider-unreachable", String(err));
}

export class OpenAiCompatibleAdapter implements AiChatPort {
  private readonly config: Required<AdapterConfig>;

  constructor(config: AdapterConfig) {
    this.config = {
      ...config,
      generateFn: config.generateFn ?? (generateObject as unknown as GenerateObjectFn),
    };
  }

  async generateTracks(prompt: string, listeningContext?: string): Promise<AiTrackSuggestion[]> {
    const { baseURL, apiKey, model, generateFn } = this.config;

    if (!baseURL || !apiKey) {
      throw new AiChatError("provider-misconfig", "AI_BASE_URL and AI_API_KEY must be configured");
    }

    const effectivePrompt = listeningContext
      ? `${prompt}\n\nUser's listening context:\n${listeningContext}`
      : prompt;

    try {
      const provider = createOpenAI({ baseURL, apiKey });
      const result = await generateFn({
        model: provider.chat(model),
        schema: tracksSchema,
        system: SYSTEM_PROMPT,
        prompt: effectivePrompt,
      });
      return result.object.tracks;
    } catch (err) {
      mapError(err);
    }
  }
}

const SYSTEM_PROMPT = `You are a music curator. Given a playlist description, return a JSON list of real, existing tracks.
Only suggest tracks that genuinely exist. Be accurate about artist names and track titles.
Return at most 50 tracks.`;

export function createAiChatPort(settingsService: SettingsService): AiChatPort {
  return {
    async generateTracks(prompt: string, listeningContext?: string): Promise<AiTrackSuggestion[]> {
      const { baseURL, apiKey } = await resolveAiConnection(settingsService);

      const model = await settingsService.getString("AI_MODEL", "");
      if (!model) {
        throw new AiChatError("provider-misconfig", "AI_MODEL must be configured in Settings");
      }

      const adapter = new OpenAiCompatibleAdapter({ baseURL, apiKey, model });
      return adapter.generateTracks(prompt, listeningContext);
    },
  };
}
