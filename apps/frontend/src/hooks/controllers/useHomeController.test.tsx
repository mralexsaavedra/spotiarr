import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/httpClient";
import { useHomeController } from "./useHomeController";

const mockNavigate = vi.fn();
const mockScanMutateAsync = vi.fn();
const mockStartBackfillMutateAsync = vi.fn();
const mockToast = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => mockToast,
}));

vi.mock("../queries/useLibraryStatsQuery", () => ({
  useLibraryStatsQuery: () => ({ data: null, isLoading: false }),
}));

vi.mock("../queries/useLibraryArtistsQuery", () => ({
  useLibraryArtistsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("../queries/useArtworkBackfillStatusQuery", () => ({
  useArtworkBackfillStatusQuery: () => ({
    data: { status: "idle" },
  }),
}));

vi.mock("../mutations/useScanLibraryMutation", () => ({
  useScanLibraryMutation: () => ({
    mutateAsync: mockScanMutateAsync,
    isPending: false,
  }),
}));

vi.mock("../mutations/useStartArtworkBackfillMutation", () => ({
  useStartArtworkBackfillMutation: () => ({
    mutateAsync: mockStartBackfillMutateAsync,
    isPending: false,
  }),
}));

describe("useHomeController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts scan first and then starts artwork backfill", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync.mockResolvedValueOnce({ status: "running", runId: "run-1" });

    const { result } = renderHook(() => useHomeController());

    act(() => {
      result.current.handleOpenScanModal();
    });
    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockScanMutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockStartBackfillMutateAsync.mock.invocationCallOrder[0],
    );
    await waitFor(() => {
      expect(result.current.isScanModalOpen).toBe(false);
    });
  });

  it("starts scan only when backfill is not selected", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: false });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).not.toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not start backfill when scan fails", async () => {
    mockScanMutateAsync.mockRejectedValueOnce(new Error("scan failed"));

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("surfaces partial failure when scan succeeds but backfill start fails", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useHomeController());

    act(() => {
      result.current.handleOpenScanModal();
    });
    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockToast.warning).toHaveBeenCalled();
  });

  it("retries backfill without re-running scan after partial failure", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ status: "running", runId: "run-2" });

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).toHaveBeenCalledTimes(2);
  });

  it("shows retry-only success copy when backfill retry succeeds", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ status: "running", runId: "run-2" });

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockToast.success).toHaveBeenLastCalledWith("Artwork backfill started.");
  });

  it("handles conflict as graceful already-running flow", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync.mockRejectedValueOnce(
      new ApiError("artwork_backfill_already_running", "invalid_request", 409),
    );

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      "Library scan started. Artwork backfill is already running.",
    );
    expect(result.current.isScanModalOpen).toBe(false);
  });

  it("shows retry-only conflict copy when retry backfill is already running", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(
        new ApiError("artwork_backfill_already_running", "invalid_request", 409),
      );

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockToast.success).toHaveBeenLastCalledWith("Artwork backfill is already running.");
    expect(result.current.isScanModalOpen).toBe(false);
  });
});
