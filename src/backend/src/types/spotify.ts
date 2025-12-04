import type { ITrack } from "@spotiarr/shared";

export type NormalizedTrack = ITrack & {
  primaryArtist?: string;
  primaryArtistImage?: string | null;
  albumCoverUrl?: string;
  previewUrl?: string | null;
  artists: { name: string; url: string | undefined }[];
};
