import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTokenGate } from "@/hooks/controllers/useTokenGate";
import { ApiError } from "@/services/httpClient";
import { TokenGate } from "./TokenGate";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/hooks/controllers/useTokenGate");

const mockUseTokenGate = vi.mocked(useTokenGate);

afterEach(() => {
  vi.clearAllMocks();
});

describe("TokenGate phase: checking", () => {
  it("renders nothing", () => {
    mockUseTokenGate.mockReturnValue({ phase: "checking", unlock: vi.fn(), sessionExpired: false });
    const { container } = render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("child")).toBeNull();
  });
});

describe("TokenGate phase: unlocked", () => {
  it("renders children", () => {
    mockUseTokenGate.mockReturnValue({ phase: "unlocked", unlock: vi.fn(), sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );
    expect(screen.getByText("child")).toBeTruthy();
  });
});

describe("TokenGate phase: error", () => {
  it("shows connection-error card with title and reload button", () => {
    mockUseTokenGate.mockReturnValue({ phase: "error", unlock: vi.fn(), sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );
    expect(screen.getByText("instanceAuth.connectionErrorTitle")).toBeTruthy();
    expect(screen.getByRole("button", { name: "instanceAuth.reloadButton" })).toBeTruthy();
    expect(screen.queryByText("child")).toBeNull();
  });
});

describe("TokenGate phase: locked", () => {
  it("shows unlock form and no children", () => {
    mockUseTokenGate.mockReturnValue({ phase: "locked", unlock: vi.fn(), sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );
    expect(screen.getByText("instanceAuth.title")).toBeTruthy();
    expect(screen.getByLabelText("instanceAuth.tokenLabel")).toBeTruthy();
    expect(screen.getByRole("button", { name: "instanceAuth.submitButton" })).toBeTruthy();
    expect(screen.queryByText("child")).toBeNull();
  });

  it("submit button is disabled when input is empty", () => {
    mockUseTokenGate.mockReturnValue({ phase: "locked", unlock: vi.fn(), sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );
    const btn = screen.getByRole("button", { name: "instanceAuth.submitButton" });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls unlock with the typed token on submit", async () => {
    const unlock = vi.fn().mockResolvedValue(undefined);
    mockUseTokenGate.mockReturnValue({ phase: "locked", unlock, sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );

    const input = screen.getByLabelText("instanceAuth.tokenLabel");
    fireEvent.change(input, { target: { value: "my-token" } });
    fireEvent.click(screen.getByRole("button", { name: "instanceAuth.submitButton" }));

    await waitFor(() => expect(unlock).toHaveBeenCalledWith("my-token"));
  });

  it("shows instanceAuth.rateLimited when unlock rejects with ApiError 429", async () => {
    const unlock = vi.fn().mockRejectedValue(new ApiError("rate limited", undefined, 429));
    mockUseTokenGate.mockReturnValue({ phase: "locked", unlock, sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );

    fireEvent.change(screen.getByLabelText("instanceAuth.tokenLabel"), {
      target: { value: "tok" },
    });
    fireEvent.click(screen.getByRole("button", { name: "instanceAuth.submitButton" }));

    await waitFor(() => expect(screen.getByText("instanceAuth.rateLimited")).toBeTruthy());
  });

  it("shows instanceAuth.invalidToken when unlock rejects with non-429 error", async () => {
    const unlock = vi.fn().mockRejectedValue(new ApiError("bad token", undefined, 401));
    mockUseTokenGate.mockReturnValue({ phase: "locked", unlock, sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );

    fireEvent.change(screen.getByLabelText("instanceAuth.tokenLabel"), {
      target: { value: "tok" },
    });
    fireEvent.click(screen.getByRole("button", { name: "instanceAuth.submitButton" }));

    await waitFor(() => expect(screen.getByText("instanceAuth.invalidToken")).toBeTruthy());
  });

  it("shows instanceAuth.sessionExpired when sessionExpired is true", () => {
    mockUseTokenGate.mockReturnValue({ phase: "locked", unlock: vi.fn(), sessionExpired: true });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );
    expect(screen.getByText("instanceAuth.sessionExpired")).toBeTruthy();
  });

  it("disables input and button while unlock is pending", async () => {
    let resolve!: () => void;
    const deferred = new Promise<void>((res) => {
      resolve = res;
    });
    const unlock = vi.fn().mockReturnValue(deferred);
    mockUseTokenGate.mockReturnValue({ phase: "locked", unlock, sessionExpired: false });
    render(
      <TokenGate>
        <span>child</span>
      </TokenGate>,
    );

    const input = screen.getByLabelText("instanceAuth.tokenLabel");
    fireEvent.change(input, { target: { value: "tok" } });
    fireEvent.click(screen.getByRole("button", { name: "instanceAuth.submitButton" }));

    await waitFor(() => expect((input as HTMLInputElement).disabled).toBe(true));
    expect(
      (screen.getByRole("button", { name: "instanceAuth.loadingButton" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    resolve();
  });
});
