import { TrackStatusEnum, ITrack, TrackArtist } from "@spotiarr/shared";
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { PlaylistEntity } from "./playlist.entity";

@Entity()
export class TrackEntity implements ITrack {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column({ type: "varchar" })
  artist: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  album?: string;

  @Column({ type: "int", nullable: true })
  albumYear?: number;

  @Column({ type: "int", nullable: true })
  trackNumber?: number;

  @Column({ type: "varchar", nullable: true })
  spotifyUrl?: string;

  @Column({ type: "varchar", nullable: true })
  trackUrl?: string;

  @Column({ type: "varchar", nullable: true })
  albumCoverUrl?: string;

  @Column({ type: "varchar", nullable: true })
  primaryArtistImageUrl?: string;

  @Column({ type: "simple-json", nullable: true })
  artists?: TrackArtist[];

  @Column({ type: "varchar", nullable: true })
  youtubeUrl?: string;

  @Column({ type: "varchar", default: TrackStatusEnum.New })
  status?: TrackStatusEnum;

  @Column({ type: "varchar", nullable: true })
  error?: string;

  @Column({ type: "bigint", default: () => Date.now() })
  createdAt?: number;

  @Column({ type: "bigint", nullable: true })
  completedAt?: number;

  @ManyToOne(() => PlaylistEntity, (playlist) => playlist.tracks, {
    onDelete: "CASCADE",
  })
  playlist?: PlaylistEntity;

  @Column({ type: "varchar", nullable: true })
  playlistId?: string;
}
