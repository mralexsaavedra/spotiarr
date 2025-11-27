import type {
  ApiErrorCode,
  ApiErrorShape,
  ArtistRelease,
  PlaylistHistory,
  PlaylistPreview,
  SettingItem,
  SettingMetadata,
  SupportedAudioFormat,
} from "@spotiarr/shared";
import type { Playlist } from "../types/playlist";
import type { Track } from "../types/track";

const API_BASE = "/api";

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    // Some endpoints (DELETE, void responses) return no content.
    // Safely attempt to parse JSON, but return undefined for empty bodies.
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    try {
      const text = await response.text();
      if (!text) return undefined as unknown as T;
      return JSON.parse(text) as T;
    } catch {
      return undefined as unknown as T;
    }
  }

  // Playlist endpoints
  async getPlaylists(): Promise<Playlist[]> {
    const response = await this.request<{ data: Playlist[] }>("/playlist");
    return response.data;
  }

  async getPlaylistPreview(spotifyUrl: string): Promise<PlaylistPreview> {
    return this.request(`/playlist/preview?url=${encodeURIComponent(spotifyUrl)}`);
  }

  async createPlaylist(spotifyUrl: string): Promise<void> {
    const response = await fetch(`${API_BASE}/playlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ spotifyUrl }),
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    if (!response.ok) {
      let errorCode: string | undefined;
      let message: string | undefined;

      if (typeof data === "object" && data !== null && "error" in data) {
        const shape = data as ApiErrorShape;
        errorCode = shape.error;
        message = shape.message;
      }

      if (response.status === 400 && errorCode === "invalid_playlist_payload") {
        // Expose a stable error code to callers; message is still available via logs if needed.
        throw new Error(errorCode ?? "invalid_playlist_payload");
      }

      throw new Error(message ?? `API Error: ${response.statusText}`);
    }
  }

  async updatePlaylist(id: string, data: Partial<Playlist>): Promise<void> {
    const response = await fetch(`${API_BASE}/playlist/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : undefined;

    if (!response.ok) {
      let errorCode: ApiErrorCode | undefined;
      let message: string | undefined;

      if (typeof body === "object" && body !== null && "error" in body) {
        const shape = body as ApiErrorShape;
        errorCode = shape.error;
        message = shape.message;
      }

      if (response.status === 400 && errorCode === "invalid_playlist_payload") {
        throw new Error(errorCode ?? "invalid_playlist_payload");
      }

      throw new Error(message ?? `API Error: ${response.statusText}`);
    }
  }

  async retryFailedTracks(playlistId: string): Promise<void> {
    return this.request<void>(`/playlist/retry/${playlistId}`, {
      method: "GET",
    });
  }

  async deletePlaylist(id: string): Promise<void> {
    return this.request<void>(`/playlist/${id}`, {
      method: "DELETE",
    });
  }

  // Track endpoints
  async getTracksByPlaylist(playlistId: string): Promise<Track[]> {
    const response = await this.request<{ data: Track[] }>(`/track/playlist/${playlistId}`);
    return response.data;
  }

  async retryTrack(id: string): Promise<void> {
    return this.request<void>(`/track/retry/${id}`, {
      method: "GET",
    });
  }

  async deleteTrack(id: string): Promise<void> {
    return this.request<void>(`/track/${id}`, {
      method: "DELETE",
    });
  }

  // History endpoints
  async getDownloadHistory(): Promise<PlaylistHistory[]> {
    const response = await this.request<{ data: PlaylistHistory[] }>("/history/downloads");
    return response.data;
  }

  // Settings endpoints
  async getSettings(): Promise<SettingItem[]> {
    const response = await this.request<{ data: SettingItem[] }>("/settings");
    return response.data;
  }

  async updateSettings(settings: Array<{ key: string; value: string }>): Promise<void> {
    return this.request<void>("/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });
  }

  async getSupportedFormats(): Promise<SupportedAudioFormat[]> {
    const response = await this.request<{ data: SupportedAudioFormat[] }>("/settings/formats");
    return response.data;
  }

  async getSettingsMetadata(): Promise<Record<string, SettingMetadata>> {
    const response = await this.request<{ data: Record<string, SettingMetadata> }>(
      "/settings/metadata",
    );
    return response.data;
  }

  // Feed endpoints
  async getReleases(): Promise<ArtistRelease[]> {
    const response = await fetch(`${API_BASE}/feed/releases`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;

    if (!response.ok) {
      let errorCode: ApiErrorCode | undefined;

      if (typeof data === "object" && data !== null && "error" in data) {
        errorCode = (data as ApiErrorShape).error;
      }

      if (response.status === 400 && errorCode === "missing_user_access_token") {
        throw new Error("missing_user_access_token");
      }

      if (response.status === 503 && errorCode === "spotify_rate_limited") {
        throw new Error("spotify_rate_limited");
      }

      throw new Error("failed_to_fetch_releases");
    }

    return data as ArtistRelease[];
  }
}

export const api = new ApiClient();
