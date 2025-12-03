import { ITrack, TrackStatusEnum } from "@spotiarr/shared";

export interface Track extends ITrack {
  id: string;
  playlistId?: string;
  status: TrackStatusEnum; // Override optional status with required
}
