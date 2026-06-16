import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState icon={faMusic} title="No results found" />);
    expect(screen.getByText("No results found")).not.toBeNull();
  });

  it("renders the description when provided", () => {
    render(
      <EmptyState icon={faMusic} title="No results found" description="Try a different search" />,
    );
    expect(screen.getByText("Try a different search")).not.toBeNull();
  });

  it("does not render a description when omitted", () => {
    render(<EmptyState icon={faMusic} title="No results found" />);
    expect(screen.queryByText("Try a different search")).toBeNull();
  });

  it("renders the action when provided", () => {
    render(<EmptyState icon={faMusic} title="No results found" action={<button>Retry</button>} />);
    expect(screen.getByRole("button", { name: "Retry" })).not.toBeNull();
  });

  it("does not render an action when omitted", () => {
    render(<EmptyState icon={faMusic} title="No results found" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
