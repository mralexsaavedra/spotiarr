import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "../components/atoms/Loading";
import { EmptyState } from "../components/molecules/EmptyState";
import { PageHeader } from "../components/molecules/PageHeader";
import { HistoryList } from "../components/organisms/HistoryList";
import { useHistoryController } from "../hooks/controllers/useHistoryController";

export const History: FC = () => {
  const { t } = useTranslation();
  const {
    history,
    isLoading,
    activePlaylists,
    recreatePlaylist,
    handleRecreatePlaylistClick,
    handleHistoryItemClick,
  } = useHistoryController();

  return (
    <section className="bg-background w-full px-4 py-6 md:px-8">
      <div className="max-w-full">
        <PageHeader title={t("history.title")} className="mb-6" />

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
            recreatingUrl={recreatePlaylist.isPending ? recreatePlaylist.variables : null}
            onRecreate={handleRecreatePlaylistClick}
            onItemClick={handleHistoryItemClick}
          />
        )}
      </div>
    </section>
  );
};
