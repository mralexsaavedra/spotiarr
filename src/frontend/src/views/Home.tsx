import { FC, useCallback } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { PlaylistList } from "../components/organisms/PlaylistList";
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
        <PageHeader title="Your Library" className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : !playlists || playlists.length === 0 ? (
          <EmptyState
            icon="fa-music"
            title="Create your first playlist"
            description="Search for artists or albums to start building your collection."
          />
        ) : (
          <PlaylistList onClearAll={handleClearAll} playlists={playlists} />
        )}
      </div>
    </section>
  );
};
