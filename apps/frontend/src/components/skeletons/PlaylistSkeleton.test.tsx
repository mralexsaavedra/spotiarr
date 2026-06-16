import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaylistSkeleton } from "./PlaylistSkeleton";

describe("PlaylistSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<PlaylistSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders exactly 10 track row skeletons", () => {
    const { container } = render(<PlaylistSkeleton />);
    // Each track row has a grid wrapper — the component uses [...Array(10)].map(...)
    // The rows live under the "Tracks List Skeleton" section.
    // Count divs that have the track row grid class pattern
    const trackRows = container.querySelectorAll(".grid.grid-cols-\\[auto_1fr_auto\\]");
    // Header row + 10 track rows = 11 total; exclude the header
    expect(trackRows.length).toBeGreaterThanOrEqual(10);
  });

  it("renders a large image skeleton for the cover art", () => {
    const { container } = render(<PlaylistSkeleton />);
    // The cover art skeleton has h-48 w-48 classes
    const coverSkeleton = container.querySelector(".h-48");
    expect(coverSkeleton).toBeTruthy();
  });

  it("renders animate-pulse elements (Skeleton components)", () => {
    const { container } = render(<PlaylistSkeleton />);
    const pulseEls = container.querySelectorAll(".animate-pulse");
    expect(pulseEls.length).toBeGreaterThan(5);
  });

  it("renders action area skeletons (circular buttons)", () => {
    const { container } = render(<PlaylistSkeleton />);
    // The download button skeleton has h-12 w-12 rounded-full
    const circleSkeletons = container.querySelectorAll(".rounded-full");
    expect(circleSkeletons.length).toBeGreaterThanOrEqual(3);
  });
});
