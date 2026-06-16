import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistDescription } from "./PlaylistDescription";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("PlaylistDescription", () => {
  it("shows progress bar when completedCount > 0 and mode is managed (default)", () => {
    render(<PlaylistDescription completedCount={5} totalCount={10} />);
    expect(screen.queryByText(/5 \/ 10/)).not.toBeNull();
  });

  it("shows progress bar when isDownloading=true and totalCount > 0", () => {
    render(<PlaylistDescription completedCount={0} totalCount={10} isDownloading={true} />);
    expect(screen.queryByText(/0 \/ 10/)).not.toBeNull();
  });

  it("shows description text when completedCount=0 and description is provided", () => {
    render(
      <PlaylistDescription completedCount={0} totalCount={10} description="A great playlist" />,
    );
    expect(screen.queryByText("A great playlist")).not.toBeNull();
  });

  it("returns nothing when completedCount=0 and no description", () => {
    const { container } = render(<PlaylistDescription completedCount={0} totalCount={10} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows description instead of progress bar when mode is library", () => {
    render(
      <PlaylistDescription
        completedCount={5}
        totalCount={10}
        description="Library desc"
        mode="library"
      />,
    );
    expect(screen.queryByText(/5 \/ 10/)).toBeNull();
    expect(screen.queryByText("Library desc")).not.toBeNull();
  });

  it("shows percentage in the progress bar", () => {
    render(<PlaylistDescription completedCount={5} totalCount={10} />);
    expect(screen.queryByText("50%")).not.toBeNull();
  });
});
