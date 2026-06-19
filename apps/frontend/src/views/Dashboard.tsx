import { FC } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/molecules/PageHeader";
import { DownloadHistorySection } from "@/components/organisms/DownloadHistorySection";
import { LibraryStatsSection } from "@/components/organisms/LibraryStatsSection";
import { MostListenedSection } from "@/components/organisms/MostListenedSection";
import { RecentPlaysSection } from "@/components/organisms/RecentPlaysSection";
import { useDashboardController } from "@/hooks/controllers/useDashboardController";

export const Dashboard: FC = () => {
  const { t } = useTranslation();
  const { statsProps, historyProps, mostListenedProps, recentPlaysProps } =
    useDashboardController();

  return (
    <section className="bg-background w-full px-4 py-6 md:px-8">
      <div className="max-w-full space-y-8">
        <PageHeader title={t("dashboard.title")} />
        <LibraryStatsSection stats={statsProps} />
        <MostListenedSection {...mostListenedProps} />
        <RecentPlaysSection {...recentPlaysProps} />
        <DownloadHistorySection {...historyProps} />
      </div>
    </section>
  );
};
