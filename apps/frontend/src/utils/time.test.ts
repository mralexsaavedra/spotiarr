import { describe, expect, it } from "vitest";
import { formatSeconds } from "./time";

describe("formatSeconds", () => {
  it("formats zero seconds", () => {
    expect(formatSeconds(0)).toBe("0:00");
  });

  it("formats 65 seconds as 1:05", () => {
    expect(formatSeconds(65)).toBe("1:05");
  });

  it("clamps negative values to 0:00", () => {
    expect(formatSeconds(-5)).toBe("0:00");
  });

  it("floors fractional seconds", () => {
    expect(formatSeconds(1.9)).toBe("0:01");
  });

  it("formats 3600 seconds as 60:00", () => {
    expect(formatSeconds(3600)).toBe("60:00");
  });
});
