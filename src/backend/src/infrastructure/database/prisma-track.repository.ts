import type { Prisma, Track as DbTrack } from "@prisma/client";
import type { ITrack, TrackStatusEnum } from "@spotiarr/shared";
import { Track } from "@/domain/entities/track.entity";
import type { TrackRepository } from "@/domain/repositories/track.repository";
import { prisma } from "../setup/prisma";
import { jsonToTrackArtists, toTrackStatus, trackArtistsToJson } from "./types";

export class PrismaTrackRepository implements TrackRepository {
  async findAll(where?: Partial<ITrack>): Promise<Track[]> {
    const tracks = await prisma.track.findMany({
      where: where as Prisma.TrackWhereInput | undefined,
      include: { playlist: true },
    });
    return tracks.map((t) => this.mapToTrack(t));
  }

  async findAllByPlaylist(playlistId: string): Promise<Track[]> {
    const tracks = await prisma.track.findMany({
      where: { playlistId },
      include: { playlist: true },
      orderBy: { playlistIndex: "asc" },
    });
    return tracks.map((t) => this.mapToTrack(t));
  }

  async findOne(id: string): Promise<Track | null> {
    const track = await prisma.track.findUnique({ where: { id } });
    return track ? this.mapToTrack(track) : null;
  }

  async findOneWithPlaylist(id: string): Promise<Track | null> {
    const track = await prisma.track.findUnique({
      where: { id },
      include: { playlist: true },
    });
    return track ? this.mapToTrack(track) : null;
  }

  async save(track: ITrack | Track): Promise<Track> {
    const data = track instanceof Track ? track.toPrimitive() : track;

    const created = await prisma.track.create({
      data: {
        id: data.id,
        name: data.name,
        artist: data.artist,
        album: data.album,
        albumUrl: data.albumUrl ?? null,
        albumYear: data.albumYear,
        trackNumber: data.trackNumber,
        durationMs: data.durationMs,
        spotifyUrl: data.spotifyUrl,
        trackUrl: data.trackUrl,
        artists: trackArtistsToJson(data.artists),
        youtubeUrl: data.youtubeUrl,
        status: data.status || "New",
        error: data.error,
        createdAt: data.createdAt ? BigInt(data.createdAt) : BigInt(Date.now()),
        completedAt: data.completedAt ? BigInt(data.completedAt) : null,
        playlistId: data.playlistId,
        playlistIndex: data.playlistIndex,
      },
    });
    return this.mapToTrack(created);
  }

  async update(id: string, track: Partial<ITrack> | Track): Promise<void> {
    const data = track instanceof Track ? track.toPrimitive() : track;

    await prisma.track.update({
      where: { id },
      data: {
        name: data.name,
        artist: data.artist,
        album: data.album,
        albumUrl: data.albumUrl ?? null,
        albumYear: data.albumYear,
        trackNumber: data.trackNumber,
        durationMs: data.durationMs,
        spotifyUrl: data.spotifyUrl,
        trackUrl: data.trackUrl,
        artists: data.artists !== undefined ? trackArtistsToJson(data.artists) : undefined,
        youtubeUrl: data.youtubeUrl,
        status: data.status,
        error: data.error,
        completedAt: data.completedAt ? BigInt(data.completedAt) : undefined,
        playlistIndex: data.playlistIndex ?? undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.track.delete({ where: { id } });
  }

  async deleteAll(ids: string[]): Promise<void> {
    await prisma.track.deleteMany({ where: { id: { in: ids } } });
  }

  async findStuckTracks(statuses: TrackStatusEnum[], createdBefore: number): Promise<Track[]> {
    const tracks = await prisma.track.findMany({
      where: {
        status: { in: statuses },
        createdAt: { lt: BigInt(createdBefore) },
      },
      include: { playlist: true },
    });
    return tracks.map((t) => this.mapToTrack(t));
  }

  private mapToTrack(track: DbTrack): Track {
    const iTrack: ITrack = {
      id: track.id,
      name: track.name,
      artist: track.artist,
      album: track.album ?? undefined,
      albumUrl: track.albumUrl ?? undefined,
      albumYear: track.albumYear ?? undefined,
      trackNumber: track.trackNumber ?? undefined,
      durationMs: track.durationMs ?? undefined,
      spotifyUrl: track.spotifyUrl ?? undefined,
      trackUrl: track.trackUrl ?? undefined,
      artists: jsonToTrackArtists(track.artists),
      youtubeUrl: track.youtubeUrl ?? undefined,
      status: toTrackStatus(track.status),
      error: track.error ?? undefined,
      createdAt: track.createdAt ? Number(track.createdAt) : undefined,
      completedAt: track.completedAt ? Number(track.completedAt) : undefined,
      playlistId: track.playlistId ?? undefined,
      playlistIndex: track.playlistIndex ?? undefined,
    };
    return new Track(iTrack);
  }
}
