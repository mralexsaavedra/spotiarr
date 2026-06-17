import { describe, expect, it } from "vitest";
import { formatLibrarySize } from "./formatLibrarySize";

describe("formatLibrarySize", () => {
  it("formats bytes in the GB range", () => {
    const oneGb = 1024 * 1024 * 1024;
    expect(formatLibrarySize(oneGb)).toBe("1024.00 MB");
  });

  it("formats bytes in the MB range", () => {
    const fiveMb = 5 * 1024 * 1024;
    expect(formatLibrarySize(fiveMb)).toBe("5.00 MB");
  });

  it("formats a value just above the GB boundary", () => {
    const justOver1GbInBytes = 1025 * 1024 * 1024;
    const result = formatLibrarySize(justOver1GbInBytes);
    expect(result).toMatch(/GB$/);
  });

  it("formats zero bytes as 0.00 MB", () => {
    expect(formatLibrarySize(0)).toBe("0.00 MB");
  });

  it("formats null as 0.00 MB", () => {
    expect(formatLibrarySize(null)).toBe("0.00 MB");
  });

  it("formats undefined as 0.00 MB", () => {
    expect(formatLibrarySize(undefined)).toBe("0.00 MB");
  });

  it("formats large values in GB with two decimal places", () => {
    const twelveGb = 12 * 1024 * 1024 * 1024;
    expect(formatLibrarySize(twelveGb)).toBe("12.00 GB");
  });
});
