import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { TrackStatus } from '@/types/track';
export const useTracks = (playlistId: number) => {
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks', playlistId],
    queryFn: () => api.getTracksByPlaylist(playlistId),
    enabled: !!playlistId,
  });

  const retryTrack = useMutation({
    mutationFn: (trackId: number) => api.retryTrack(trackId),
    onMutate: async (trackId: number) => {
      await queryClient.cancelQueries({ queryKey: ['tracks', playlistId] });
      const previous = queryClient.getQueryData<any[]>(['tracks', playlistId]);

      queryClient.setQueryData<any[]>(['tracks', playlistId], (old = []) =>
        old.map((t) => (t.id === trackId ? { ...t, status: TrackStatus.Searching } : t)),
      );

      return { previous };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['tracks', playlistId], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', playlistId] });
    },
  });

  const deleteTrack = useMutation({
    mutationFn: (trackId: number) => api.deleteTrack(trackId),
    onMutate: async (trackId: number) => {
      await queryClient.cancelQueries({ queryKey: ['tracks', playlistId] });
      const previous = queryClient.getQueryData<any[]>(['tracks', playlistId]);

      queryClient.setQueryData<any[]>(['tracks', playlistId], (old = []) =>
        old.filter((t) => t.id !== trackId),
      );

      return { previous };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(['tracks', playlistId], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', playlistId] });
    },
  });

  return {
    tracks,
    isLoading,
    retryTrack,
    deleteTrack,
  };
};
