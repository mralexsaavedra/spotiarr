import type { ITrack } from "@spotiarr/shared";

export type NormalizedTrack = ITrack & {
  primaryArtist?: string;
  primaryArtistImage?: string | null;
  albumCoverUrl?: string;
  previewUrl?: string | null;
  // For compatibility with existing consumers (e.g. PlaylistTrackDetail),
  // ensure artists always have a defined url field.
  artists: { name: string; url: string | undefined }[];
};
