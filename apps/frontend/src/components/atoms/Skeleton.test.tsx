import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders a div element", () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).tagName).toBe("DIV");
  });

  it("includes animate-pulse class by default", () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain("animate-pulse");
  });

  it("includes rounded-md class by default", () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain("rounded-md");
  });

  it("merges additional className with base classes", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-32");
  });

  it("forwards extra HTML attributes to the div", () => {
    const { container } = render(<Skeleton data-testid="skel" aria-hidden="true" />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("data-testid")).toBe("skel");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});
