import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PlaylistEntity } from "./playlist.entity";
import { TrackEntity } from "./track.entity";

@Entity()
export class DownloadHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => PlaylistEntity, { nullable: true, onDelete: "SET NULL" })
  playlist?: PlaylistEntity | null;

  @ManyToOne(() => TrackEntity, { nullable: true, onDelete: "SET NULL" })
  track?: TrackEntity | null;

  @Column({ type: "varchar" })
  playlistName!: string;

  @Column({ type: "varchar", nullable: true })
  playlistSpotifyUrl?: string | null;

  @Column({ type: "varchar" })
  trackName!: string;

  @Column({ type: "varchar" })
  artist!: string;

  @Column({ type: "varchar", nullable: true })
  album?: string | null;

  @Column({ type: "varchar", nullable: true })
  trackUrl?: string | null;

  @Column({ type: "bigint" })
  completedAt!: number;

  @Column({ type: "bigint", default: () => Date.now() })
  createdAt!: number;
}
