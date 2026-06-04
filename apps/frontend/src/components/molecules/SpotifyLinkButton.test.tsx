import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => mockToast,
}));

vi.mock("@/hooks/mutations/useResolveExternalUrl", () => ({
  useResolveExternalUrl: () => mockMutation,
}));

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

const mockMutate = vi.fn();
let mockMutation: {
  mutate: typeof mockMutate;
  isPending: boolean;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockMutation = {
    mutate: mockMutate,
    isPending: false,
  };
});

// Must be imported AFTER mocks are declared
const { SpotifyLinkButton } = await import("./SpotifyLinkButton");

describe("SpotifyLinkButton", () => {
  describe("eagerUrl mode — renders as direct anchor", () => {
    it("renders an anchor tag when eagerUrl is provided", () => {
      render(
        <SpotifyLinkButton
          provider="spotify"
          entityType="artist"
          id="12345"
          eagerUrl="https://open.spotify.com/artist/12345"
        />,
      );
      const link = screen.getByRole("link");
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("https://open.spotify.com/artist/12345");
    });
  });

  describe("lazy mode — click triggers fetch, spinner shows", () => {
    it("renders a button when no eagerUrl provided", () => {
      render(
        <SpotifyLinkButton provider="spotify" entityType="artist" id="99999" name="Test Artist" />,
      );
      const button = screen.getByRole("button");
      expect(button).toBeDefined();
    });

    it("calls mutate with correct params on click", () => {
      render(
        <SpotifyLinkButton provider="spotify" entityType="artist" id="99999" name="Test Artist" />,
      );
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(mockMutate).toHaveBeenCalledWith(
        { provider: "spotify", type: "artist", id: "99999", name: "Test Artist" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("shows spinner (disables button) while loading", () => {
      mockMutation.isPending = true;
      render(<SpotifyLinkButton provider="spotify" entityType="track" id="track1" />);
      const button = screen.getByRole("button");
      expect(button.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("error handling", () => {
    it("shows toast error on 503", async () => {
      render(
        <SpotifyLinkButton provider="spotify" entityType="artist" id="99999" name="Unknown" />,
      );
      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Simulate the onError callback path
      const lastCallArgs = mockMutate.mock.calls[0];
      if (lastCallArgs?.[1]?.onError) {
        lastCallArgs[1].onError({ status: 503 });
      }

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });
  });
});
