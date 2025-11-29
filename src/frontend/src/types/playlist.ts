import { IPlaylist } from "@spotiarr/shared";
import type { Track } from "./track";

export interface Playlist extends IPlaylist {
  id: string;
  collapsed?: boolean; // UI state
  tracks?: Track[];
}

export enum PlaylistStatusEnum {
  InProgress,
  Completed,
  Warning,
  Error,
  Subscribed,
}
