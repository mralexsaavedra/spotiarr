import type { Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventsController } from "./events.controller";

interface FakeResponse {
  headers: Record<string, string>;
  res: Response;
  writeCalls: string[];
}

function createFakeResponse(): FakeResponse {
  const headers: Record<string, string> = {};
  const writeCalls: string[] = [];
  const res = {
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    write: vi.fn((data: string) => {
      writeCalls.push(data);
    }),
  } as unknown as Response;
  return { headers, res, writeCalls };
}

function createFakeRequest(origin?: string): Request {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    headers: origin ? { origin } : {},
    on: vi.fn((event: string, handler: () => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    _trigger: (event: string) => {
      for (const handler of listeners[event] ?? []) handler();
    },
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

  it("writes the initial SSE comment to keep the connection open", () => {
    const { res, writeCalls } = createFakeResponse();

    new EventsController().connect(createFakeRequest(), res);

    expect(writeCalls[0]).toBe(": connected\n\n");
  });

  it("removes the client when the request closes", () => {
    const controller = new EventsController();
    const { res, writeCalls } = createFakeResponse();
    const req = createFakeRequest();

    controller.connect(req, res);

    // Emit before close — should write
    controller.emit("test-event", { x: 1 });
    expect(writeCalls.length).toBe(2); // initial comment + event

    // Trigger client disconnect
    (req as unknown as { _trigger: (e: string) => void })._trigger("close");

    // After disconnect, emit should not write to this client
    controller.emit("test-event-2", { x: 2 });
    expect(writeCalls.length).toBe(2); // still 2 — nothing new
  });
});

// ─── emit ─────────────────────────────────────────────────────────────────────

describe("EventsController.emit", () => {
  it("is a no-op when there are no connected clients", () => {
    const controller = new EventsController();
    // No clients connected — should not throw
    expect(() => controller.emit("test-event", {})).not.toThrow();
  });

  it("broadcasts the event payload to all connected clients", () => {
    const controller = new EventsController();

    const { res: res1, writeCalls: calls1 } = createFakeResponse();
    const { res: res2, writeCalls: calls2 } = createFakeResponse();

    controller.connect(createFakeRequest(), res1);
    controller.connect(createFakeRequest(), res2);

    const data = { value: 42 };
    controller.emit("my-event", data);

    const expected = `event: my-event\ndata: ${JSON.stringify(data)}\n\n`;
    expect(calls1).toContain(expected);
    expect(calls2).toContain(expected);
  });

  it("uses empty object as default data when no data argument is provided", () => {
    const controller = new EventsController();
    const { res, writeCalls } = createFakeResponse();

    controller.connect(createFakeRequest(), res);
    controller.emit("ping");

    const expected = `event: ping\ndata: ${JSON.stringify({})}\n\n`;
    expect(writeCalls).toContain(expected);
  });

  it("continues broadcasting to remaining clients when one write throws", () => {
    const controller = new EventsController();

    const { res: res1, writeCalls: calls1 } = createFakeResponse();
    const { writeCalls: calls2 } = createFakeResponse();

    // First client will throw on write
    const throwingRes = {
      setHeader: vi.fn(),
      write: vi
        .fn()
        .mockImplementationOnce(() => {
          // skip initial comment
        })
        .mockImplementationOnce(() => {
          throw new Error("stream closed");
        }),
    } as unknown as Response;

    controller.connect(createFakeRequest(), throwingRes);
    controller.connect(createFakeRequest(), res1);

    // Should not throw despite first client error
    expect(() => controller.emit("safe-event", {})).not.toThrow();
    // Second client should still receive the event
    expect(calls1).toContain(`event: safe-event\ndata: ${JSON.stringify({})}\n\n`);
    // First client's calls2 is from the original factory — just verify res1 got the event
    expect(calls2.length).toBe(0);
  });
});
