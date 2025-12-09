import { faBroom, faMusic } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { EmptyState } from "../components/molecules/EmptyState";
import { PageHeader } from "../components/molecules/PageHeader";
import { ConfirmModal } from "../components/organisms/ConfirmModal";
import { PlaylistList } from "../components/organisms/PlaylistList";
import { useHomeController } from "../hooks/controllers/useHomeController";

export const Home: FC = () => {
  const {
    playlists,
    isLoading,
    isClearModalOpen,
    handleClearAllClick,
    handleConfirmClearAll,
    handleCancelClearAll,
    handlePlaylistClick,
  } = useHomeController();

  return (
    <section className="w-full px-4 py-6 bg-background md:px-8">
      <div className="max-w-full">
        <PageHeader
          title="Your Library"
          className="mb-6"
          action={
            playlists && playlists.length > 0 ? (
              <Button variant="secondary" size="md" icon={faBroom} onClick={handleClearAllClick}>
                <span className="hidden sm:inline">Clear completed</span>
              </Button>
            ) : undefined
          }
        />

        {isLoading ? (
          <Loading />
        ) : !playlists || playlists.length === 0 ? (
          <EmptyState
            icon={faMusic}
            title="Create your first playlist"
            description="Search for artists or albums to start building your collection."
          />
        ) : (
          <PlaylistList playlists={playlists} onPlaylistClick={handlePlaylistClick} />
        )}
      </div>

      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear completed playlists?"
        description="This will remove all completed playlists from your library. Downloaded files will NOT be deleted."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        onConfirm={handleConfirmClearAll}
        onCancel={handleCancelClearAll}
        isDestructive={true}
      />
    </section>
  );
};
