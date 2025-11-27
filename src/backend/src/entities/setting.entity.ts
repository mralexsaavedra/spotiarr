import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SettingEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @PrimaryColumn({ type: "varchar" })
  key!: string;

  @Column({ type: "varchar" })
  value!: string;

  @Column({ type: "bigint", default: () => Date.now() })
  updatedAt!: number;
}
