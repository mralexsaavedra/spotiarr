import { afterEach, describe, expect, it, vi } from "vitest";
import { type AiProgressListener, aiProgressBus } from "./aiProgressBus";

describe("aiProgressBus", () => {
  afterEach(() => {
    aiProgressBus.removeAllListeners();
  });

  it("calls registered listener when an event is emitted", () => {
    const listener = vi.fn();
    aiProgressBus.on(listener);

    const event = {
      jobId: "job-1",
      stage: "llm" as const,
      progress: 0.2,
    };
    aiProgressBus.emit(event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it("calls multiple listeners", () => {
    const listenerA = vi.fn<AiProgressListener>();
    const listenerB = vi.fn<AiProgressListener>();
    aiProgressBus.on(listenerA);
    aiProgressBus.on(listenerB);

    aiProgressBus.emit({ jobId: "j", stage: "done", progress: 1, resolvedCount: 5 });

    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerB).toHaveBeenCalledOnce();
  });

  it("off() removes a specific listener", () => {
    const listener = vi.fn();
    aiProgressBus.on(listener);
    aiProgressBus.off(listener);

    aiProgressBus.emit({
      jobId: "j",
      stage: "error",
      progress: 0,
      error: { code: "llm-bad-output", message: "fail" },
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("removeAllListeners clears all subscribers", () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    aiProgressBus.on(l1);
    aiProgressBus.on(l2);
    aiProgressBus.removeAllListeners();

    aiProgressBus.emit({ jobId: "j", stage: "saving", progress: 0.8 });

    expect(l1).not.toHaveBeenCalled();
    expect(l2).not.toHaveBeenCalled();
  });
});
