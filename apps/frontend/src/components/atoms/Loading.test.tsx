import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Loading } from "./Loading";

describe("Loading", () => {
  it("renders with role=status", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("has default aria-label of 'Loading' when no message is provided", () => {
    render(<Loading />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Loading");
  });

  it("renders screen-reader-only 'Loading' text when no message", () => {
    render(<Loading />);
    expect(screen.getByText("Loading")).toBeTruthy();
  });

  it("sets aria-label to the provided message", () => {
    render(<Loading message="Fetching data..." />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Fetching data...");
  });

  it("renders the message text visibly when provided", () => {
    render(<Loading message="Please wait" />);
    expect(screen.getByText("Please wait")).toBeTruthy();
  });

  it("does not render a visible message paragraph when message is absent", () => {
    render(<Loading />);
    // Only the sr-only span should exist, no <p> element
    const status = screen.getByRole("status");
    expect(status.querySelector("p")).toBeNull();
  });

  it("applies additional className to the container", () => {
    render(<Loading className="custom-class" />);
    expect(screen.getByRole("status").className).toContain("custom-class");
  });

  it("renders a spinning icon (svg)", () => {
    const { container } = render(<Loading />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
