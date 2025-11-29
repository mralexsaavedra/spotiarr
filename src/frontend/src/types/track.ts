import { ITrack, TrackStatusEnum, TrackArtist } from "@spotiarr/shared";

export interface Track extends ITrack {
  id: string;
  playlistId?: string;
  status: TrackStatusEnum; // Override optional status with required
}

export type { TrackArtist };
