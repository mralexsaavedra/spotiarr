import { PlaylistTypeEnum } from "@spotiarr/shared";

export interface CreatePlaylistDto {
  name?: string;
  type?: PlaylistTypeEnum;
  spotifyUrl: string;
  coverUrl?: string;
  artistImageUrl?: string;
  subscribed?: boolean;
}

export interface UpdatePlaylistDto {
  id?: number;
  name?: string;
  type?: PlaylistTypeEnum;
  spotifyUrl?: string;
  error?: string;
  subscribed?: boolean;
  createdAt?: number;
  coverUrl?: string;
  artistImageUrl?: string;
}
