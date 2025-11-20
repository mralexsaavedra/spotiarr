import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import type { Playlist } from '@/types/playlist';
import type { Track } from '@/types/track';

let socket: Socket | null = null;

export const useWebSocket = () => {
  const queryClient = useQueryClient();

  const isTrackPayload = (
    v: unknown,
  ): v is { track?: Track; playlistId?: number } => {
    if (typeof v !== 'object' || v === null) return false;
    const obj = v as Record<string, unknown>;
    return (
      Object.prototype.hasOwnProperty.call(obj, 'track') ||
      Object.prototype.hasOwnProperty.call(obj, 'playlistId')
    );
  };

  useEffect(() => {
    // Connect to WebSocket
    socket = io('http://localhost:3000', {
      transports: ['websocket'],
    });

    // Playlist events
    socket.on('playlistNew', (playlist: Playlist) => {
      queryClient.setQueryData<Playlist[]>(['playlists'], (old = []) => [
        ...old,
        playlist,
      ]);
    });

    socket.on('playlistUpdate', (playlist: Playlist) => {
      queryClient.setQueryData<Playlist[]>(['playlists'], (old = []) =>
        old.map((p) => (p.id === playlist.id ? playlist : p)),
      );
    });

    socket.on('playlistDelete', (playlistId: number) => {
      queryClient.setQueryData<Playlist[]>(['playlists'], (old = []) =>
        old.filter((p) => p.id !== playlistId),
      );
    });

    // Track events
    socket.on('trackNew', (payload: unknown) => {
      // backend may emit { track, playlistId } or the track object directly
      if (isTrackPayload(payload)) {
        const track =
          (payload as { track?: Track }).track ?? (payload as unknown as Track);
        const playlistId =
          (payload as { playlistId?: number }).playlistId ?? track.playlistId;
        if (!playlistId) return;

        queryClient.setQueryData<Track[]>(
          ['tracks', playlistId],
          (old = []) => [...old, track],
        );
        return;
      }

      // fallback: treat payload as Track
      const track = payload as Track;
      const playlistId = (track as Track).playlistId;
      if (!playlistId) return;
      queryClient.setQueryData<Track[]>(['tracks', playlistId], (old = []) => [
        ...old,
        track,
      ]);
    });

    socket.on('trackUpdate', (payload: unknown) => {
      if (isTrackPayload(payload)) {
        const track =
          (payload as { track?: Track }).track ?? (payload as unknown as Track);
        const playlistId =
          (payload as { playlistId?: number }).playlistId ?? track.playlistId;

        if (playlistId) {
          queryClient.setQueryData<Track[]>(
            ['tracks', playlistId],
            (old = []) => old.map((t) => (t.id === track.id ? track : t)),
          );
          queryClient.invalidateQueries({ queryKey: ['tracks', playlistId] });
          return;
        }
      }

      // If playlistId is missing, update any tracks list where this track exists
      const track = payload as Track;
      const playlists =
        queryClient.getQueryData<Playlist[]>(['playlists']) || [];
      playlists.forEach((pl) => {
        if (!pl?.id) return;
        queryClient.setQueryData<Track[]>(['tracks', pl.id], (old = []) =>
          old.map((t) => (t.id === track.id ? track : t)),
        );
        queryClient.invalidateQueries({ queryKey: ['tracks', pl.id] });
      });
    });

    socket.on('trackDelete', (trackId: number) => {
      // Find all track query lists and remove the deleted track from them
      const playlists =
        queryClient.getQueryData<Playlist[]>(['playlists']) || [];
      playlists.forEach((pl) => {
        if (pl.id) {
          queryClient.setQueryData<Track[]>(['tracks', pl.id], (tracks = []) =>
            tracks.filter((t) => t.id !== trackId),
          );
        }
      });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [queryClient]);
};
