import type { AlbumType, ArtistRelease, NormalizedTrack } from "@spotiarr/shared";
import { logger } from "@/infrastructure/logging/logger";
import { namesMatch } from "../normalize-name";

export interface MusicBrainzArtist {
  id: string;
  name: string;
}

interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string;
  "first-release-date"?: string;
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
}

interface MusicBrainzTrackItem {
  position: number;
  recording: {
    id: string;
    title: string;
    length?: number;
    "artist-credit"?: Array<{ name: string }>;
  };
}

interface MusicBrainzMedia {
  position: number;
  tracks: MusicBrainzTrackItem[];
}

interface MusicBrainzReleaseWithRecordings {
  id: string;
  title: string;
  media: MusicBrainzMedia[];
}

const MUSICBRAINZ_API_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "Spotiarr/1.0 ( https://github.com/spotiarr/spotiarr )";

/**
 * MusicBrainz REST client with mandatory 1 req/sec rate limiting.
 * User-Agent header is required by the MusicBrainz API terms of use.
 */
export class MusicBrainzClient {
  private lastRequestAt = 0;

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < 1100) {
      await this.sleep(1100 - elapsed);
    }
    this.lastRequestAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      });
      if (!response.ok) {
        logger.warn(
          { component: "musicbrainz-client", status: response.status, url },
          `HTTP ${response.status} for ${url}`,
        );
        return null;
      }
      return (await response.json()) as T;
    } catch (err) {
      logger.warn({ component: "musicbrainz-client", url, err }, `Network error for ${url}`);
      return null;
    }
  }

  /**
   * Search for an artist by name and return the first exact match.
   */
  async searchArtist(name: string): Promise<MusicBrainzArtist | null> {
    const encoded = encodeURIComponent(name);
    const result = await this.fetchJson<{
      artists?: MusicBrainzArtist[];
    }>(`${MUSICBRAINZ_API_BASE}/artist/?query=artist:${encoded}&fmt=json`);

    if (!result?.artists?.length) {
      return null;
    }

    const match = result.artists.find((a) => namesMatch(a.name, name));
    if (!match) {
      return null;
    }

    return match;
  }

  /**
   * Fetch release groups (albums and singles) for a given MusicBrainz artist ID.
   */
  async getArtistReleaseGroups(mbid: string): Promise<ArtistRelease[]> {
    const result = await this.fetchJson<{
      "release-groups"?: MusicBrainzReleaseGroup[];
    }>(`${MUSICBRAINZ_API_BASE}/release-group?artist=${mbid}&type=album|single&fmt=json`);

    if (!result?.["release-groups"]) {
      return [];
    }

    return result["release-groups"].map((rg) => ({
      artistId: mbid,
      artistName: "", // filled in by orchestration layer
      artistImageUrl: null,
      albumId: rg.id,
      albumName: rg.title,
      albumType: mapMusicBrainzType(rg["primary-type"]),
      releaseDate: rg["first-release-date"],
      coverUrl: null,
      spotifyUrl: undefined,
    }));
  }

  /**
   * Fetch tracks for a release-group by choosing a concrete release
   * and loading its recordings. Returns empty array if no release or tracks found.
   */
  async getReleaseTracks(mbReleaseGroupId: string): Promise<NormalizedTrack[]> {
    // 1. Find concrete releases for this release-group
    const releasesResult = await this.fetchJson<{
      releases?: MusicBrainzRelease[];
    }>(`${MUSICBRAINZ_API_BASE}/release-group/${mbReleaseGroupId}/releases?fmt=json`);

    const releases = releasesResult?.releases ?? [];
    if (releases.length === 0) {
      return [];
    }

    // Pick the first release
    const release = releases[0];

    // 2. Load recordings for the chosen release
    const recordingsResult = await this.fetchJson<MusicBrainzReleaseWithRecordings>(
      `${MUSICBRAINZ_API_BASE}/release/${release.id}?inc=recordings&fmt=json`,
    );

    if (!recordingsResult?.media?.length) {
      return [];
    }

    const tracks: NormalizedTrack[] = [];

    for (const medium of recordingsResult.media) {
      for (const trackItem of medium.tracks) {
        const recording = trackItem.recording;
        const artists = recording["artist-credit"] ?? [];
        const artistName = artists.map((a) => a.name).join(", ") || "";

        tracks.push({
          name: recording.title,
          artist: artistName,
          artists: artists.map((a) => ({ name: a.name, url: undefined })),
          album: recordingsResult.title,
          trackNumber: trackItem.position,
          discNumber: medium.position,
          durationMs: recording.length ?? undefined,
          trackUrl: `${MUSICBRAINZ_API_BASE}/recording/${recording.id}`,
          albumUrl: `${MUSICBRAINZ_API_BASE}/release/${release.id}`,
        });
      }
    }

    return tracks;
  }
}

function mapMusicBrainzType(type?: string): AlbumType | undefined {
  const t = type?.toLowerCase();
  if (t === "album") return "album";
  if (t === "single") return "single";
  return undefined;
}
