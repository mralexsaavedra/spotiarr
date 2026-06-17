import { describe, expect, it, vi } from "vitest";
import { AppEventBus } from "./app-event-bus";

describe("AppEventBus", () => {
  it("constructs without an SSE emitter and still works", () => {
    const bus = new AppEventBus();
    expect(bus).toBeInstanceOf(AppEventBus);
  });

  it("forwards emitted events to internal Node.js listeners", () => {
    const bus = new AppEventBus();
    const listener = vi.fn();
    bus.on("test-event", listener);

    bus.emit("test-event", { foo: "bar" });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ foo: "bar" });
  });

  it("calls the SSE emitter with the event name and data", () => {
    const sseEmitter = vi.fn();
    const bus = new AppEventBus(sseEmitter);

    bus.emit("playlist-updated", { id: 42 });

    expect(sseEmitter).toHaveBeenCalledOnce();
    expect(sseEmitter).toHaveBeenCalledWith("playlist-updated", { id: 42 });
  });

  it("calls both internal listeners and SSE emitter on a single emit", () => {
    const sseEmitter = vi.fn();
    const bus = new AppEventBus(sseEmitter);
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    bus.on("my-event", listenerA);
    bus.on("my-event", listenerB);

    bus.emit("my-event", "payload");

    expect(listenerA).toHaveBeenCalledWith("payload");
    expect(listenerB).toHaveBeenCalledWith("payload");
    expect(sseEmitter).toHaveBeenCalledWith("my-event", "payload");
  });

  it("emits to SSE even when there are no internal listeners", () => {
    const sseEmitter = vi.fn();
    const bus = new AppEventBus(sseEmitter);

    bus.emit("orphan-event", { x: 1 });

    expect(sseEmitter).toHaveBeenCalledOnce();
    expect(sseEmitter).toHaveBeenCalledWith("orphan-event", { x: 1 });
  });

  it("returns the boolean result from the underlying EventEmitter emit", () => {
    const bus = new AppEventBus();
    const listener = vi.fn();
    bus.on("has-listener", listener);

    const withListener = bus.emit("has-listener");
    const withoutListener = bus.emit("no-listener");

    expect(withListener).toBe(true);
    expect(withoutListener).toBe(false);
  });

  it("emits events with undefined data when no data argument is provided", () => {
    const sseEmitter = vi.fn();
    const bus = new AppEventBus(sseEmitter);
    const listener = vi.fn();
    bus.on("no-data-event", listener);

    bus.emit("no-data-event");

    expect(listener).toHaveBeenCalledWith(undefined);
    expect(sseEmitter).toHaveBeenCalledWith("no-data-event", undefined);
  });

  it("supports multiple independent subscriptions on different event names", () => {
    const bus = new AppEventBus();
    const fooListener = vi.fn();
    const barListener = vi.fn();
    bus.on("foo", fooListener);
    bus.on("bar", barListener);

    bus.emit("foo", 1);
    bus.emit("bar", 2);

    expect(fooListener).toHaveBeenCalledWith(1);
    expect(barListener).toHaveBeenCalledWith(2);
    expect(fooListener).not.toHaveBeenCalledWith(2);
    expect(barListener).not.toHaveBeenCalledWith(1);
  });
});
