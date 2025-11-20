import {
  IsString,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { PlaylistTypeEnum } from './playlist.entity';

export class CreatePlaylistDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PlaylistTypeEnum)
  type?: PlaylistTypeEnum;

  @IsUrl()
  spotifyUrl: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  artistImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePlaylistDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PlaylistTypeEnum)
  type?: PlaylistTypeEnum;

  @IsOptional()
  @IsUrl()
  spotifyUrl?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  artistImageUrl?: string;
}
