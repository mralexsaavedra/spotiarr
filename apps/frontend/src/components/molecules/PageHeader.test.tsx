import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders title in h1", () => {
    render(<PageHeader title="My Title" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("My Title");
  });

  it("renders description when provided", () => {
    render(<PageHeader title="Title" description="Some description" />);
    const desc = screen.queryByText("Some description");
    expect(desc).not.toBeNull();
  });

  it("does not render description when omitted", () => {
    render(<PageHeader title="Title" />);
    const desc = screen.queryByText("Some description");
    expect(desc).toBeNull();
  });

  it("renders action when provided", () => {
    render(<PageHeader title="Title" action={<button>Action</button>} />);
    const btn = screen.queryByRole("button", { name: "Action" });
    expect(btn).not.toBeNull();
  });

  it("does not render action when omitted", () => {
    render(<PageHeader title="Title" />);
    const btn = screen.queryByRole("button");
    expect(btn).toBeNull();
  });
});
