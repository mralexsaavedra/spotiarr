import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventsController } from "./events.controller";

interface FakeResponse {
  headers: Record<string, string>;
  res: Response;
}

function createFakeResponse(): FakeResponse {
  const headers: Record<string, string> = {};
  const res = {
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    write: vi.fn(),
  } as unknown as Response;
  return { headers, res };
}

function createFakeRequest(origin?: string): Request {
  return {
    headers: origin ? { origin } : {},
    on: vi.fn(),
  } as unknown as Request;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("EventsController SSE CORS", () => {
  it("sets no CORS headers when no allowlist is configured", () => {
    const { headers, res } = createFakeResponse();

    new EventsController(() => undefined).connect(
      createFakeRequest("https://app.example.com"),
      res,
    );

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
    expect(headers["Vary"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("text/event-stream");
  });

  it("echoes the origin when it is on the allowlist", () => {
    const { headers, res } = createFakeResponse();

    new EventsController(() => ["https://app.example.com"]).connect(
      createFakeRequest("https://app.example.com"),
      res,
    );

    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.example.com");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(headers["Vary"]).toBe("Origin");
  });

  it("sets no CORS origin header for an origin not on the allowlist", () => {
    const { headers, res } = createFakeResponse();

    new EventsController(() => ["https://app.example.com"]).connect(
      createFakeRequest("https://evil.example.com"),
      res,
    );

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
  });

  it("sets no CORS origin header when the request has no Origin", () => {
    const { headers, res } = createFakeResponse();

    new EventsController(() => ["https://app.example.com"]).connect(createFakeRequest(), res);

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("defaults to no allowlist when no getter is provided", () => {
    const { headers, res } = createFakeResponse();

    new EventsController().connect(createFakeRequest("https://app.example.com"), res);

    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
