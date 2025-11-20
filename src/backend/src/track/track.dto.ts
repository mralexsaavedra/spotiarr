import {
  IsString,
  IsUrl,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrackStatusEnum } from './track.entity';

class ArtistDto {
  @IsString()
  name: string;

  @IsUrl()
  url: string;
}

export class CreateTrackDto {
  @IsString()
  artist: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsOptional()
  @IsNumber()
  albumYear?: number;

  @IsOptional()
  @IsNumber()
  trackNumber?: number;

  @IsOptional()
  @IsUrl()
  spotifyUrl?: string;

  @IsOptional()
  @IsUrl()
  trackUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArtistDto)
  artists?: ArtistDto[];

  @IsOptional()
  @IsUrl()
  youtubeUrl?: string;

  @IsOptional()
  @IsEnum(TrackStatusEnum)
  status?: TrackStatusEnum;
}

export class UpdateTrackDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsOptional()
  @IsNumber()
  albumYear?: number;

  @IsOptional()
  @IsNumber()
  trackNumber?: number;

  @IsOptional()
  @IsUrl()
  spotifyUrl?: string;

  @IsOptional()
  @IsUrl()
  trackUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArtistDto)
  artists?: ArtistDto[];

  @IsOptional()
  @IsUrl()
  youtubeUrl?: string;

  @IsOptional()
  @IsEnum(TrackStatusEnum)
  status?: TrackStatusEnum;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsNumber()
  createdAt?: number;
}
