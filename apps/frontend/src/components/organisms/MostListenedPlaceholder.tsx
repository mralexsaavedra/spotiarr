import { FC } from "react";
import { useTranslation } from "react-i18next";

// Extension point for #205 (most-listened) — no data wiring yet
export const MostListenedPlaceholder: FC = () => {
  const { t } = useTranslation();

  return (
    <section className="mt-8">
      <h2 className="text-text-primary mb-4 text-lg font-semibold">
        {t("dashboard.mostListenedTitle")}
      </h2>
      <p className="text-text-secondary text-sm">{t("dashboard.mostListenedComingSoon")}</p>
    </section>
  );
};
