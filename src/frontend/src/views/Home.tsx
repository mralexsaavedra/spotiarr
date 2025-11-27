import { useCallback } from "react";
import { PlaylistList } from "../components/organisms/PlaylistList";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { shouldClearPlaylist } from "../utils/playlist";

export const Home = () => {
  const { data: playlists = [] } = usePlaylistsQuery();
  const deletePlaylist = useDeletePlaylistMutation();

  const handleClearAll = useCallback(() => {
    playlists.filter((p) => shouldClearPlaylist(p)).forEach((p) => deletePlaylist.mutate(p.id));
  }, [deletePlaylist, playlists]);

  return <PlaylistList onClearAll={handleClearAll} playlists={playlists} />;
};
