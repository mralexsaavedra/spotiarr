import type { Playlist as DbPlaylist, Track as DbTrack, Prisma } from "@prisma/client";
import type { IPlaylist, TrackArtist } from "@spotiarr/shared";
import { Playlist } from "../../domain/entities/playlist.entity";
import type { PlaylistRepository } from "../../domain/repositories/playlist.repository";
import { prisma } from "../setup/prisma";

export class PrismaPlaylistRepository implements PlaylistRepository {
  async findAll(includesTracks = false, where?: Partial<IPlaylist>): Promise<Playlist[]> {
    const playlists = await prisma.playlist.findMany({
      where: where as Prisma.PlaylistWhereInput | undefined,
      include: { tracks: includesTracks },
    });
    return playlists.map((p) => this.mapToPlaylist(p));
  }

  async findOne(id: string): Promise<Playlist | null> {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: { tracks: true },
    });
    return playlist ? this.mapToPlaylist(playlist) : null;
  }

  async save(playlist: IPlaylist | Playlist): Promise<Playlist> {
    const data = playlist instanceof Playlist ? playlist.toPrimitive() : playlist;

    const created = await prisma.playlist.create({
      data: {
        id: data.id,
        name: data.name,
        type: data.type,
        spotifyUrl: data.spotifyUrl,
        error: data.error,
        subscribed: data.subscribed ?? false,
        createdAt: data.createdAt ? BigInt(data.createdAt) : BigInt(Date.now()),
        coverUrl: data.coverUrl,
        artistImageUrl: data.artistImageUrl,
      },
    });
    return this.mapToPlaylist(created);
  }

  async update(id: string, playlist: Partial<IPlaylist> | Playlist): Promise<void> {
    const data = playlist instanceof Playlist ? playlist.toPrimitive() : playlist;

    await prisma.playlist.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        error: data.error,
        subscribed: data.subscribed,
        coverUrl: data.coverUrl,
        artistImageUrl: data.artistImageUrl,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.playlist.delete({ where: { id } });
  }

  private mapToPlaylist(playlist: DbPlaylist & { tracks?: DbTrack[] }): Playlist {
    const iPlaylist: IPlaylist = {
      id: playlist.id,
      name: playlist.name ?? undefined,
      type: (playlist.type as IPlaylist["type"]) ?? undefined,
      spotifyUrl: playlist.spotifyUrl,
      error: playlist.error ?? undefined,
      subscribed: playlist.subscribed,
      createdAt: playlist.createdAt ? Number(playlist.createdAt) : undefined,
      coverUrl: playlist.coverUrl ?? undefined,
      artistImageUrl: playlist.artistImageUrl ?? undefined,
      tracks: playlist.tracks?.map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artist,
        album: track.album ?? undefined,
        albumYear: track.albumYear ?? undefined,
        trackNumber: track.trackNumber ?? undefined,
        spotifyUrl: track.spotifyUrl ?? undefined,
        trackUrl: track.trackUrl ?? undefined,
        albumUrl: track.albumUrl ?? undefined,
        artists: track.artists ? (track.artists as unknown as TrackArtist[]) : undefined,
        youtubeUrl: track.youtubeUrl ?? undefined,
        status: track.status as unknown as IPlaylist["tracks"] extends (infer T)[] | undefined
          ? T extends { status?: infer S }
            ? S
            : undefined
          : undefined,
        error: track.error ?? undefined,
        createdAt: track.createdAt ? Number(track.createdAt) : undefined,
        completedAt: track.completedAt ? Number(track.completedAt) : undefined,
        playlistId: track.playlistId ?? undefined,
      })),
    };
    return new Playlist(iPlaylist);
  }
}
