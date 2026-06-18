import { FC } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/molecules/PageHeader";
import { DownloadHistorySection } from "@/components/organisms/DownloadHistorySection";
import { LibraryStatsSection } from "@/components/organisms/LibraryStatsSection";
import { MostListenedPlaceholder } from "@/components/organisms/MostListenedPlaceholder";
import { useDashboardController } from "@/hooks/controllers/useDashboardController";

export const Dashboard: FC = () => {
  const { t } = useTranslation();
  const { statsProps, historyProps } = useDashboardController();

  return (
    <section className="bg-background w-full px-4 py-6 md:px-8">
      <div className="max-w-full">
        <PageHeader title={t("dashboard.title")} className="mb-6" />
        <LibraryStatsSection stats={statsProps} />
        <DownloadHistorySection {...historyProps} />
        <MostListenedPlaceholder />
      </div>
    </section>
  );
};
