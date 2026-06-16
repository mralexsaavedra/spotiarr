import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpotifyAuthCardSkeleton } from "./SpotifyAuthCardSkeleton";

describe("SpotifyAuthCardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<SpotifyAuthCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders a card container div", () => {
    const { container } = render(<SpotifyAuthCardSkeleton />);
    const card = container.firstChild as HTMLElement;
    expect(card.tagName).toBe("DIV");
    expect(card.className).toContain("rounded-lg");
  });

  it("renders multiple animate-pulse placeholder elements", () => {
    const { container } = render(<SpotifyAuthCardSkeleton />);
    const pulseEls = container.querySelectorAll(".animate-pulse");
    expect(pulseEls.length).toBeGreaterThanOrEqual(4);
  });

  it("renders a heading placeholder (h6 circle + title bar)", () => {
    const { container } = render(<SpotifyAuthCardSkeleton />);
    // h2 wraps a circle (h-6 w-6) and a title bar (h-6 w-48)
    const h2 = container.querySelector("h2");
    expect(h2).toBeTruthy();
    const innerPulse = h2!.querySelectorAll(".animate-pulse");
    expect(innerPulse.length).toBe(2);
  });

  it("renders a button-sized placeholder at the bottom", () => {
    const { container } = render(<SpotifyAuthCardSkeleton />);
    // The CTA placeholder is h-10 w-48
    const ctaPlaceholder = container.querySelector(".h-10.w-48");
    expect(ctaPlaceholder).toBeTruthy();
  });
});
