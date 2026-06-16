import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders the label", () => {
    render(<StatCard label="Total Tracks" value={42} />);

    expect(screen.getByText("Total Tracks")).not.toBeNull();
  });

  it("renders a numeric value", () => {
    render(<StatCard label="Albums" value={7} />);

    expect(screen.getByText("7")).not.toBeNull();
  });

  it("renders a string value", () => {
    render(<StatCard label="Size" value="1.2 GB" />);

    expect(screen.getByText("1.2 GB")).not.toBeNull();
  });

  it("renders the icon when provided", () => {
    const { container } = render(<StatCard label="Tracks" value={10} icon={faMusic} />);

    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("does not render an icon element when icon is not provided", () => {
    const { container } = render(<StatCard label="Tracks" value={10} />);

    expect(container.querySelector("svg")).toBeNull();
  });

  it("applies additional className when provided", () => {
    const { container } = render(
      <StatCard label="Tracks" value={10} className="my-custom-class" />,
    );

    expect((container.firstChild as HTMLElement).className).toContain("my-custom-class");
  });
});
