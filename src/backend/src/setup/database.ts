import path from "path";
import { DataSource } from "typeorm";
import { DownloadHistoryEntity } from "../entities/download-history.entity";
import { PlaylistEntity } from "../entities/playlist.entity";
import { SettingEntity } from "../entities/setting.entity";
import { TrackEntity } from "../entities/track.entity";

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: path.resolve(process.cwd(), "config/db.sqlite"),
  entities: [TrackEntity, PlaylistEntity, DownloadHistoryEntity, SettingEntity],
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
});

export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

export function getDataSource(): DataSource {
  if (!AppDataSource.isInitialized) {
    throw new Error("DataSource is not initialized");
  }
  return AppDataSource;
}
