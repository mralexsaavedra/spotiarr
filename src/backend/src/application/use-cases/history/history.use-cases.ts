import type { PlaylistHistory, DownloadHistoryItem } from "@spotiarr/shared";
import type { HistoryRepository } from "../../../domain/repositories/history.repository";

export interface HistoryUseCaseDependencies {
  repository: HistoryRepository;
}

interface PlaylistIdentifiers {
  id: string | null;
  url: string | null;
}

interface IntermediatePlaylistHistory extends Omit<PlaylistHistory, "trackCount"> {
  trackIds: Set<string>;
}

interface DeduplicationMaps {
  playlists: Map<string, IntermediatePlaylistHistory>;
  urlToKey: Map<string, string>;
  idToKey: Map<string, string>;
}

export class HistoryUseCases {
  constructor(private readonly deps: HistoryUseCaseDependencies) {}

  async getRecentDownloads(limit = 200): Promise<PlaylistHistory[]> {
    const entries = await this.deps.repository.findAll(limit);
    const maps = this.initializeDeduplicationMaps();

    for (const entry of entries) {
      this.processHistoryEntry(entry, maps);
    }

    return this.sortPlaylistsByDate(maps.playlists);
  }

  async getRecentTracks(limit = 1000): Promise<DownloadHistoryItem[]> {
    return this.deps.repository.findAll(limit);
  }

  private initializeDeduplicationMaps(): DeduplicationMaps {
    return {
      playlists: new Map(),
      urlToKey: new Map(),
      idToKey: new Map(),
    };
  }

  private processHistoryEntry(entry: DownloadHistoryItem, maps: DeduplicationMaps): void {
    const identifiers = this.extractIdentifiers(entry);
    const key = this.resolvePlaylistKey(identifiers, maps);
    const existing = maps.playlists.get(key);

    if (existing) {
      this.updateExistingPlaylist(existing, entry, identifiers, key, maps);
    } else {
      this.createNewPlaylist(key, entry, identifiers, maps);
    }
  }

  private extractIdentifiers(entry: DownloadHistoryItem): PlaylistIdentifiers {
    return {
      id: entry.playlistId,
      url: this.normalizeSpotifyUrl(entry.playlistSpotifyUrl),
    };
  }

  private resolvePlaylistKey(identifiers: PlaylistIdentifiers, maps: DeduplicationMaps): string {
    const { id, url } = identifiers;

    if (id && maps.idToKey.has(id)) {
      return maps.idToKey.get(id)!;
    }

    if (url && maps.urlToKey.has(url)) {
      return maps.urlToKey.get(url)!;
    }

    if (id) {
      this.registerKey(id, id, url, maps);
      return id;
    }

    if (url) {
      this.registerKey(url, null, url, maps);
      return url;
    }

    return `unknown-${Date.now()}`;
  }

  private registerKey(
    key: string,
    id: string | null,
    url: string | null,
    maps: DeduplicationMaps,
  ): void {
    if (id) maps.idToKey.set(id, key);
    if (url) maps.urlToKey.set(url, key);
  }

  private createNewPlaylist(
    key: string,
    entry: DownloadHistoryItem,
    identifiers: PlaylistIdentifiers,
    maps: DeduplicationMaps,
  ): void {
    const trackIds = new Set<string>();
    if (entry.trackId) trackIds.add(entry.trackId);

    maps.playlists.set(key, {
      playlistId: identifiers.id,
      playlistName: entry.playlistName,
      playlistSpotifyUrl: identifiers.url,
      lastCompletedAt: entry.completedAt,
      trackIds,
    });
  }

  private updateExistingPlaylist(
    existing: IntermediatePlaylistHistory,
    entry: DownloadHistoryItem,
    identifiers: PlaylistIdentifiers,
    key: string,
    maps: DeduplicationMaps,
  ): void {
    if (entry.trackId) existing.trackIds.add(entry.trackId);

    if (entry.completedAt > existing.lastCompletedAt) {
      existing.lastCompletedAt = entry.completedAt;
      existing.playlistName = entry.playlistName;
    }

    this.enrichPlaylistData(existing, identifiers, key, maps);
  }

  private enrichPlaylistData(
    playlist: IntermediatePlaylistHistory,
    identifiers: PlaylistIdentifiers,
    key: string,
    maps: DeduplicationMaps,
  ): void {
    if (!playlist.playlistId && identifiers.id) {
      playlist.playlistId = identifiers.id;
      maps.idToKey.set(identifiers.id, key);
    }

    if (!playlist.playlistSpotifyUrl && identifiers.url) {
      playlist.playlistSpotifyUrl = identifiers.url;
      maps.urlToKey.set(identifiers.url, key);
    }
  }

  private sortPlaylistsByDate(
    playlists: Map<string, IntermediatePlaylistHistory>,
  ): PlaylistHistory[] {
    return Array.from(playlists.values())
      .map((p) => ({
        ...p,
        trackCount: p.trackIds.size,
        trackIds: undefined,
      }))
      .sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
  }

  private normalizeSpotifyUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.replace(/\/intl-[a-z]{2}\//g, "/");
  }
}
