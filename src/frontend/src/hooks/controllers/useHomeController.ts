import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../../routes/routes";
import { useDeleteCompletedPlaylistsMutation } from "../mutations/useDeleteCompletedPlaylistsMutation";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";

export const useHomeController = () => {
  const navigate = useNavigate();
  const { data: playlists, isLoading } = usePlaylistsQuery();
  const deleteCompletedPlaylists = useDeleteCompletedPlaylistsMutation();

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const handleClearAllClick = useCallback(() => {
    setIsClearModalOpen(true);
  }, []);

  const handleConfirmClearAll = useCallback(() => {
    deleteCompletedPlaylists.mutate();
    setIsClearModalOpen(false);
  }, [deleteCompletedPlaylists]);

  const handleCancelClearAll = useCallback(() => {
    setIsClearModalOpen(false);
  }, []);

  const handlePlaylistClick = useCallback(
    (id: string) => {
      navigate(Path.PLAYLIST_DETAIL.replace(":id", id));
    },
    [navigate],
  );

  return {
    playlists,
    isLoading,
    isClearModalOpen,
    handleClearAllClick,
    handleConfirmClearAll,
    handleCancelClearAll,
    handlePlaylistClick,
  };
};
