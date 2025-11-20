import type { Playlist } from '@/types/playlist';
import type { Track } from '@/types/track';

const API_BASE = '/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
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
    return this.request<Playlist[]>('/playlist');
  }

  async createPlaylist(spotifyUrl: string): Promise<void> {
    return this.request<void>('/playlist', {
      method: 'POST',
      body: JSON.stringify({ spotifyUrl }),
    });
  }

  async updatePlaylist(id: number, data: Partial<Playlist>): Promise<void> {
    return this.request<void>(`/playlist/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async retryFailedTracks(playlistId: number): Promise<void> {
    return this.request<void>(`/playlist/retry/${playlistId}`, {
      method: 'GET',
    });
  }

  async deletePlaylist(id: number): Promise<void> {
    return this.request<void>(`/playlist/${id}`, {
      method: 'DELETE',
    });
  }

  // Track endpoints
  async getTracksByPlaylist(playlistId: number): Promise<Track[]> {
    return this.request<Track[]>(`/track/playlist/${playlistId}`);
  }

  async retryTrack(id: number): Promise<void> {
    return this.request<void>(`/track/retry/${id}`, {
      method: 'GET',
    });
  }

  async deleteTrack(id: number): Promise<void> {
    return this.request<void>(`/track/${id}`, {
      method: 'DELETE',
    });
  }

  // Version endpoint
  async getVersion(): Promise<{ version: string }> {
    return this.request<{ version: string }>('/version');
  }
}

export const api = new ApiClient();
