import { FC } from "react";
import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/molecules/StatCard";

interface LibraryStatsSectionProps {
  stats: { artists: number; albums: number; tracks: number; size: string } | null;
}

export const LibraryStatsSection: FC<LibraryStatsSectionProps> = ({ stats }) => {
  const { t } = useTranslation();

  if (!stats) return null;

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label={t("library.artists")} value={stats.artists} />
      <StatCard label={t("library.albums")} value={stats.albums} />
      <StatCard label={t("library.tracks")} value={stats.tracks} />
      <StatCard label={t("library.size")} value={stats.size} />
    </div>
  );
};
