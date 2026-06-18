import { FC } from "react";
import { useTranslation } from "react-i18next";

export const MostListenedPlaceholder: FC = () => {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="text-text-primary mb-4 text-lg font-semibold">
        {t("dashboard.mostListenedTitle")}
      </h2>
      <p className="text-text-secondary text-sm">{t("dashboard.mostListenedComingSoon")}</p>
    </section>
  );
};
