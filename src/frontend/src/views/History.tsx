import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { Loading } from "../components/atoms/Loading";
import { EmptyState } from "../components/molecules/EmptyState";
import { PageHeader } from "../components/molecules/PageHeader";
import { HistoryList } from "../components/organisms/HistoryList";
import { useHistoryController } from "../hooks/controllers/useHistoryController";

export const History: FC = () => {
  const {
    history,
    isLoading,
    activePlaylists,
    recreatePlaylist,
    handleRecreatePlaylistClick,
    handleHistoryItemClick,
  } = useHistoryController();

  return (
    <section className="w-full bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title="Download History" className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : history.length === 0 ? (
          <EmptyState
            icon={faClockRotateLeft}
            title="No download history yet"
            description="Completed downloads will appear here."
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
