import { ArtworkBackfillRunStatus } from "@spotiarr/shared";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Button } from "../atoms/Button";

interface ScanLibraryModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  backfillStatus: ArtworkBackfillRunStatus;
  onCancel: () => void;
  onConfirm: (input: { shouldStartBackfill: boolean }) => void;
}

const ACTIVE_BACKFILL_STATUSES = new Set<ArtworkBackfillRunStatus>([
  "running",
  "pause_requested",
  "paused",
  "paused_rate_limited",
]);

export const ScanLibraryModal: FC<ScanLibraryModalProps> = ({
  isOpen,
  isSubmitting,
  backfillStatus,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [shouldStartBackfill, setShouldStartBackfill] = useState(false);
  const isBackfillActive = useMemo(
    () => ACTIVE_BACKFILL_STATUSES.has(backfillStatus),
    [backfillStatus],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, containerRef, onCancel);

  useEffect(() => {
    if (isBackfillActive) {
      setShouldStartBackfill(false);
    }
  }, [isBackfillActive]);

  useEffect(() => {
    if (!isOpen) {
      setShouldStartBackfill(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-library-modal-title"
        className="bg-background-hover w-full max-w-lg rounded-lg border border-white/5 p-6 shadow-2xl"
      >
        <h2 id="scan-library-modal-title" className="mb-2 text-xl font-bold text-white">
          {t("library.scanModal.title", "Scan library")}
        </h2>
        <p className="text-text-subtle mb-6 text-sm">
          {t(
            "library.scanModal.description",
            "Choose whether to only scan your library or also start artwork backfill.",
          )}
        </p>

        <label className="mb-6 flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={shouldStartBackfill}
            disabled={isBackfillActive || isSubmitting}
            onChange={(event) => setShouldStartBackfill(event.target.checked)}
          />
          <span className="text-sm text-white">
            {t(
              "library.scanModal.startBackfill",
              "Start artwork backfill after scan starts successfully",
            )}
            {isBackfillActive && (
              <span className="text-text-subtle mt-1 block">
                {t(
                  "library.scanModal.backfillActive",
                  "Artwork backfill is already running. You can still run scan-only.",
                )}
              </span>
            )}
          </span>
        </label>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={() => onConfirm({ shouldStartBackfill })}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {t("library.scanModal.confirm", "Start scan")}
          </Button>
        </div>
      </div>
    </div>
  );
};
