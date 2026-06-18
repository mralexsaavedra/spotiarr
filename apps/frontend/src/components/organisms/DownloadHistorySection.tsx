import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { PlaylistHistory } from "@spotiarr/shared";
import { FC, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";
import { HistoryList } from "@/components/organisms/HistoryList";
import { Playlist } from "@/types";

interface DownloadHistorySectionProps {
  history: PlaylistHistory[];
  isLoading: boolean;
  activePlaylists: Playlist[];
  recreatingUrl: string | null;
  onRecreate: (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => void;
  onItemClick: (item: PlaylistHistory, activePlaylist?: Playlist) => void;
}

export const DownloadHistorySection: FC<DownloadHistorySectionProps> = ({
  history,
  isLoading,
  activePlaylists,
  recreatingUrl,
  onRecreate,
  onItemClick,
}) => {
  const { t } = useTranslation();

  return (
    <section>
      <h2 className="text-text-primary mb-4 text-lg font-semibold">{t("history.title")}</h2>

      {isLoading ? (
        <Loading />
      ) : history.length === 0 ? (
        <EmptyState
          icon={faClockRotateLeft}
          title={t("history.emptyTitle")}
          description={t("history.emptyDescription")}
        />
      ) : (
        <HistoryList
          history={history}
          activePlaylists={activePlaylists}
          recreatingUrl={recreatingUrl}
          onRecreate={onRecreate}
          onItemClick={onItemClick}
        />
      )}
    </section>
  );
};
