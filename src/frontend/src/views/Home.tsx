import { FC, useCallback } from "react";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { PlaylistCard } from "../components/organisms/PlaylistCard";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { shouldClearPlaylist } from "../utils/playlist";

export const Home: FC = () => {
  const { data: playlists, isLoading } = usePlaylistsQuery();
  const deletePlaylist = useDeletePlaylistMutation();

  const handleClearAll = useCallback(() => {
    if (playlists) {
      playlists.filter((p) => shouldClearPlaylist(p)).forEach((p) => deletePlaylist.mutate(p.id));
    }
  }, [deletePlaylist, playlists]);

  return (
    <section className="w-full bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader
          title="Your Library"
          className="mb-6"
          action={
            playlists && playlists.length > 0 ? (
              <Button variant="secondary" size="md" icon="fa-broom" onClick={handleClearAll}>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
