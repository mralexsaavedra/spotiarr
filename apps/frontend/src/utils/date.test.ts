import { describe, expect, it } from "vitest";
import { formatDuration } from "./date";

describe("formatDuration", () => {
  it("formats zero milliseconds", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats seconds under one minute", () => {
    expect(formatDuration(30_000)).toBe("0:30");
  });

  it("formats exact minutes", () => {
    expect(formatDuration(120_000)).toBe("2:00");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(185_000)).toBe("3:05");
  });

  it("formats hours as large minutes", () => {
    expect(formatDuration(3_600_000)).toBe("60:00");
  });
});
