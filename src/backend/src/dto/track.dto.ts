import { TrackStatusEnum } from "@spotiarr/shared";

export interface ArtistDto {
  name: string;
  url: string;
}

export interface CreateTrackDto {
  artist: string;
  name: string;
  album?: string;
  albumYear?: number;
  trackNumber?: number;
  spotifyUrl?: string;
  trackUrl?: string;
  artists?: ArtistDto[];
  youtubeUrl?: string;
  status?: TrackStatusEnum;
}

export interface UpdateTrackDto {
  id?: number;
  artist?: string;
  name?: string;
  album?: string;
  albumYear?: number;
  trackNumber?: number;
  spotifyUrl?: string;
  trackUrl?: string;
  artists?: ArtistDto[];
  youtubeUrl?: string;
  status?: TrackStatusEnum;
  error?: string;
  createdAt?: number;
}
