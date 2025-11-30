import { useCallback } from "react";
import { PlaylistList } from "../components/organisms/PlaylistList";
import { CardGridSkeleton } from "../components/skeletons/CardGridSkeleton";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { shouldClearPlaylist } from "../utils/playlist";

export const Home = () => {
  const { data: playlists = [], isLoading } = usePlaylistsQuery();
  const deletePlaylist = useDeletePlaylistMutation();

  const handleClearAll = useCallback(() => {
    playlists.filter((p) => shouldClearPlaylist(p)).forEach((p) => deletePlaylist.mutate(p.id));
  }, [deletePlaylist, playlists]);

  if (isLoading) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-primary">Your Playlists</h2>
        </div>
        <CardGridSkeleton />
      </section>
    );
  }

  return <PlaylistList onClearAll={handleClearAll} playlists={playlists} />;
};
