import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryStatsSection } from "./LibraryStatsSection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/components/molecules/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid="stat-card">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

const sampleStats = {
  artists: 120,
  albums: 430,
  tracks: 5200,
  size: "12.00 GB",
};

describe("LibraryStatsSection", () => {
  it("renders four StatCards when stats is provided", () => {
    render(<LibraryStatsSection stats={sampleStats} />);

    const cards = screen.getAllByTestId("stat-card");
    expect(cards).toHaveLength(4);
  });

  it("renders the artists value", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("120")).toBeTruthy();
  });

  it("renders the albums value", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("430")).toBeTruthy();
  });

  it("renders the tracks value", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("5200")).toBeTruthy();
  });

  it("renders the size value", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("12.00 GB")).toBeTruthy();
  });

  it("uses library.artists i18n key for artists label", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("library.artists")).toBeTruthy();
  });

  it("uses library.albums i18n key for albums label", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("library.albums")).toBeTruthy();
  });

  it("uses library.tracks i18n key for tracks label", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("library.tracks")).toBeTruthy();
  });

  it("uses library.size i18n key for size label", () => {
    render(<LibraryStatsSection stats={sampleStats} />);
    expect(screen.getByText("library.size")).toBeTruthy();
  });

  it("renders nothing when stats prop is null", () => {
    const { container } = render(<LibraryStatsSection stats={null} />);
    expect(container.firstChild).toBeNull();
  });
});
