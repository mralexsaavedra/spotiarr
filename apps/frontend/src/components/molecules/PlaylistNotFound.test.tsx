import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistNotFound } from "./PlaylistNotFound";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../atoms/Button", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

describe("PlaylistNotFound", () => {
  it("renders playlist.notFound heading", () => {
    render(<PlaylistNotFound onGoHome={vi.fn()} />);
    expect(screen.queryByText("playlist.notFound")).not.toBeNull();
  });

  it("renders playlist.goBack button", () => {
    render(<PlaylistNotFound onGoHome={vi.fn()} />);
    expect(screen.queryByText("playlist.goBack")).not.toBeNull();
  });

  it("calls onGoHome when button is clicked", () => {
    const onGoHome = vi.fn();
    render(<PlaylistNotFound onGoHome={onGoHome} />);
    fireEvent.click(screen.getByText("playlist.goBack"));
    expect(onGoHome).toHaveBeenCalledOnce();
  });
});
