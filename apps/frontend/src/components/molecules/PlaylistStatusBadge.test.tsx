import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistStatusBadge } from "./PlaylistStatusBadge";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const baseStats = {
  isDownloading: false,
  hasErrors: false,
  isCompleted: false,
  completedCount: 0,
  totalCount: 5,
  errorCount: 0,
} as any;

describe("PlaylistStatusBadge", () => {
  it("downloading state: shows completedCount/totalCount text", () => {
    render(
      <PlaylistStatusBadge
        {...baseStats}
        isDownloading={true}
        completedCount={3}
        totalCount={10}
      />,
    );
    expect(screen.queryByText(/3\/10/)).not.toBeNull();
  });

  it("error state: shows errorCount and common.cards.status.failed", () => {
    render(<PlaylistStatusBadge {...baseStats} hasErrors={true} errorCount={2} />);
    expect(screen.queryByText(/2/)).not.toBeNull();
    expect(screen.queryByText(/common\.cards\.status\.failed/)).not.toBeNull();
  });

  it("completed state: shows totalCount and common.cards.status.tracks", () => {
    render(<PlaylistStatusBadge {...baseStats} isCompleted={true} totalCount={5} />);
    expect(screen.queryByText(/5/)).not.toBeNull();
    expect(screen.queryByText(/common\.cards\.status\.tracks/)).not.toBeNull();
  });

  it("default state: shows totalCount and common.cards.status.tracks", () => {
    render(<PlaylistStatusBadge {...baseStats} totalCount={7} />);
    expect(screen.queryByText(/7/)).not.toBeNull();
    expect(screen.queryByText(/common\.cards\.status\.tracks/)).not.toBeNull();
  });

  it("downloading takes priority over error when both are true", () => {
    render(
      <PlaylistStatusBadge
        {...baseStats}
        isDownloading={true}
        hasErrors={true}
        completedCount={1}
        totalCount={5}
        errorCount={3}
      />,
    );
    expect(screen.queryByText(/1\/5/)).not.toBeNull();
    expect(screen.queryByText(/common\.cards\.status\.failed/)).toBeNull();
  });

  it("error state takes priority over completed when both are true", () => {
    render(
      <PlaylistStatusBadge
        {...baseStats}
        hasErrors={true}
        isCompleted={true}
        errorCount={2}
        totalCount={5}
      />,
    );
    expect(screen.queryByText(/common\.cards\.status\.failed/)).not.toBeNull();
    expect(screen.queryByText(/common\.cards\.status\.tracks/)).toBeNull();
  });
});
