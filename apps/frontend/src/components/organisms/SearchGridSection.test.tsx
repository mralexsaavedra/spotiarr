import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchGridSection } from "./SearchGridSection";

describe("SearchGridSection", () => {
  it("renders the section title", () => {
    render(
      <SearchGridSection title="Albums">
        <div>child</div>
      </SearchGridSection>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Albums" })).toBeTruthy();
  });

  it("renders children inside the grid container", () => {
    render(
      <SearchGridSection title="Artists">
        <div data-testid="child-a">A</div>
        <div data-testid="child-b">B</div>
      </SearchGridSection>,
    );
    expect(screen.getByTestId("child-a")).toBeTruthy();
    expect(screen.getByTestId("child-b")).toBeTruthy();
  });

  it("renders a <section> element as the root", () => {
    const { container } = render(
      <SearchGridSection title="Tracks">
        <span>item</span>
      </SearchGridSection>,
    );
    expect(container.querySelector("section")).toBeTruthy();
  });

  it("renders with an empty children list without throwing", () => {
    expect(() => render(<SearchGridSection title="Empty">{null}</SearchGridSection>)).not.toThrow();
  });
});
