import { PlaylistTypeEnum, IPlaylist } from "@spotiarr/shared";
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { TrackEntity } from "./track.entity";

@Entity()
export class PlaylistEntity implements IPlaylist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", nullable: true })
  name?: string;

  @Column({ type: "varchar", nullable: true })
  type?: PlaylistTypeEnum;

  @Column({ type: "varchar" })
  spotifyUrl: string;

  @Column({ type: "varchar", nullable: true })
  error?: string;

  @Column({ type: "boolean", default: false })
  subscribed?: boolean;

  @Column({ type: "bigint", default: () => Date.now() })
  createdAt?: number;

  @Column({ type: "varchar", nullable: true })
  coverUrl?: string;

  @Column({ type: "varchar", nullable: true })
  artistImageUrl?: string;

  @OneToMany(() => TrackEntity, (track) => track.playlist)
  tracks?: TrackEntity[];
}
