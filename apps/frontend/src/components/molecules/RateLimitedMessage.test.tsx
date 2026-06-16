import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RateLimitedMessage } from "./RateLimitedMessage";

describe("RateLimitedMessage", () => {
  it("renders the heading", () => {
    render(<RateLimitedMessage />);

    expect(screen.getByText("Rate Limited")).not.toBeNull();
  });

  it("renders the descriptive message", () => {
    render(<RateLimitedMessage />);

    expect(
      screen.getByText(
        "Spotify is temporarily limiting requests. Please try again in a few minutes.",
      ),
    ).not.toBeNull();
  });

  it("renders without crashing", () => {
    const { container } = render(<RateLimitedMessage />);

    expect(container.firstChild).not.toBeNull();
  });
});
