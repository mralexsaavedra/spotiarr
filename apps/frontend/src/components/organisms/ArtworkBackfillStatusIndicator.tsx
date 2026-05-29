import { ArtworkBackfillStatusResponse } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";

interface ArtworkBackfillStatusIndicatorProps {
  status?: ArtworkBackfillStatusResponse;
}

export const ArtworkBackfillStatusIndicator: FC<ArtworkBackfillStatusIndicatorProps> = ({
  status,
}) => {
  const { t } = useTranslation();

  if (!status || status.status === "idle") return null;

  const progress = status.totals > 0 ? Math.round((status.processed / status.totals) * 100) : 0;
  const localizedStatus = t(`library.artworkBackfill.status.${status.status}`, status.status);

  return (
    <div className="mb-4 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white">
      <p className="font-semibold">
        {t("library.artworkBackfill.title", "Artwork backfill")} · {localizedStatus}
      </p>
      <p className="text-text-subtle">
        {t("library.artworkBackfill.progress", "{{processed}} / {{totals}} ({{progress}}%)", {
          processed: status.processed,
          totals: status.totals,
          progress,
        })}
      </p>
    </div>
  );
};
