import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { Playlist } from '@/types/playlist';

export const usePlaylists = () => {
  const queryClient = useQueryClient();

  const {
    data: playlists = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api.getPlaylists(),
  });

  const createPlaylist = useMutation({
    mutationFn: (spotifyUrl: string) => api.createPlaylist(spotifyUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const updatePlaylist = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Playlist> }) =>
      api.updatePlaylist(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['playlists'] });
      const previous = queryClient.getQueryData<Playlist[]>(['playlists']);

      queryClient.setQueryData<Playlist[]>(['playlists'], (old = []) =>
        old.map((p) => (p.id === id ? { ...p, ...data } : p)),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['playlists'], context.previous);
      }
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: (id: number) => api.deletePlaylist(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['playlists'] });
      const previous = queryClient.getQueryData<Playlist[]>(['playlists']);

      queryClient.setQueryData<Playlist[]>(['playlists'], (old = []) =>
        old.filter((p) => p.id !== id),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['playlists'], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  return {
    playlists,
    isLoading,
    error,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
  };
};
