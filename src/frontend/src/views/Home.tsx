import { FC, useCallback, useState } from "react";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { ConfirmModal } from "../components/molecules/ConfirmModal";
import { EmptyState } from "../components/molecules/EmptyState";
import { PlaylistList } from "../components/organisms/PlaylistList";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { shouldClearPlaylist } from "../utils/playlist";

export const Home: FC = () => {
  const { data: playlists, isLoading } = usePlaylistsQuery();
  const deletePlaylist = useDeletePlaylistMutation();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const handleClearAllClick = useCallback(() => {
    setIsClearModalOpen(true);
  }, []);

  const handleConfirmClearAll = useCallback(() => {
    if (playlists) {
      playlists.filter((p) => shouldClearPlaylist(p)).forEach((p) => deletePlaylist.mutate(p.id));
    }
    setIsClearModalOpen(false);
  }, [deletePlaylist, playlists]);

  const handleCancelClearAll = useCallback(() => {
    setIsClearModalOpen(false);
  }, []);

  return (
    <section className="w-full bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader
          title="Your Library"
          className="mb-6"
          action={
            playlists && playlists.length > 0 ? (
              <Button variant="secondary" size="md" icon="fa-broom" onClick={handleClearAllClick}>
                <span className="hidden sm:inline">Clear completed</span>
              </Button>
            ) : undefined
          }
        />

        {isLoading ? (
          <Loading />
        ) : !playlists || playlists.length === 0 ? (
          <EmptyState
            icon="fa-music"
            title="Create your first playlist"
            description="Search for artists or albums to start building your collection."
          />
        ) : (
          <PlaylistList playlists={playlists} />
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
