import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is disabled when loading is true", () => {
    render(<Button loading>Click me</Button>);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("applies primary variant styles", () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole("button").className).toContain("bg-primary");
  });

  it("applies danger variant styles", () => {
    render(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button").className).toContain("bg-white/10");
  });

  it("applies ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button").className).toContain("bg-transparent");
  });

  it("applies sm size styles", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toContain("px-3");
  });

  it("applies lg size styles", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button").className).toContain("px-6");
  });

  it("sets aria-label from ariaLabel prop", () => {
    render(<Button ariaLabel="accessible label">Click me</Button>);
    expect(screen.getByRole("button", { name: "accessible label" })).toBeTruthy();
  });

  it("sets title attribute", () => {
    render(<Button title="tooltip">Click me</Button>);
    expect(screen.getByTitle("tooltip")).toBeTruthy();
  });

  it("renders icon when provided", () => {
    render(<Button icon={faMusic}>With icon</Button>);
    // FontAwesomeIcon renders an svg
    const btn = screen.getByRole("button");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("renders spinner svg when loading", () => {
    render(<Button loading>Click me</Button>);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("applies disabled opacity class when disabled", () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole("button").className).toContain("opacity-50");
  });

  it("sets type=submit when specified", () => {
    render(<Button type="submit">Submit</Button>);
    expect((screen.getByRole("button") as HTMLButtonElement).type).toBe("submit");
  });

  it("defaults to type=button", () => {
    render(<Button>Click me</Button>);
    expect((screen.getByRole("button") as HTMLButtonElement).type).toBe("button");
  });
});
