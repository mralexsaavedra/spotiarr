import { execFile, execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import { join } from "path";
import { promisify } from "util";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";

const execFilePromise = promisify(execFile);

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export class YoutubeSearchService {
  private readonly ytDlpPath: string;

  constructor(private readonly settingsService: SettingsService) {
    // Auto-detect yt-dlp path from system PATH
    try {
      const systemPath = execSync("which yt-dlp", {
        encoding: "utf-8",
      }).trim();

      // WORKAROUND: ytdlp-nodejs tries to chmod the binary, which fails for /usr/bin/yt-dlp in Docker
      // We copy it to a local writable path (tmp dir) so the library can do its thing
      const localPath = join(os.tmpdir(), "yt-dlp");

      // Only copy if it doesn't exist or is different (simple check)
      if (!fs.existsSync(localPath)) {
        console.debug(`Copying system yt-dlp to ${localPath} to avoid permission issues`);
        fs.copyFileSync(systemPath, localPath);
        fs.chmodSync(localPath, 0o755);
      }

      this.ytDlpPath = localPath;
      console.debug(`Using yt-dlp from: ${this.ytDlpPath}`);
    } catch (e) {
      console.warn("yt-dlp not found in PATH, will try default 'yt-dlp' command", e);
      this.ytDlpPath = "yt-dlp";
    }
  }

  async findOnYoutubeOne(artist: string, name: string): Promise<string> {
    console.debug(`Searching ${artist} - ${name} on YT`);

    const args = [
      "--print",
      "webpage_url",
      `ytsearch3:${artist} - ${name}`,
      "--no-warnings",
      "--no-playlist",
      "--ignore-errors",
      "--user-agent",
      HEADERS["User-Agent"],
    ];

    // Get cookies browser from settings
    const ytCookies = await this.settingsService.getString("YT_COOKIES");
    if (ytCookies) {
      // Check if it's a file path or a browser name
      const isFile = ytCookies.includes("/") || ytCookies.endsWith(".txt");
      if (isFile) {
        args.push("--cookies", ytCookies);
      } else {
        args.push("--cookies-from-browser", ytCookies);
      }
    }

    try {
      const { stdout } = await execFilePromise(this.ytDlpPath, args);
      const urls = stdout.trim().split("\n");
      // Get first non-empty line
      const firstUrl = urls.find((u) => u.trim().length > 0);

      if (!firstUrl) {
        throw new AppError(404, "track_not_found", "No results found");
      }

      console.debug(`Found ${artist} - ${name} on ${firstUrl}`);
      return firstUrl;
    } catch (error: any) {
      // If yt-dlp fails (e.g. exit code 1) but printed a URL to stdout, use it
      if (error.stdout && typeof error.stdout === "string") {
        const urls = error.stdout.trim().split("\n");
        const firstUrl = urls.find((u: string) => u.trim().length > 0);

        if (firstUrl) {
          console.debug(
            `Found ${artist} - ${name} on ${firstUrl} (managed to recover from yt-dlp error)`,
          );
          return firstUrl;
        }
      }

      console.error(`Error searching ${artist} - ${name} with yt-dlp:`, error);
      throw error;
    }
  }

  // Helper to expose path to DownloadService if needed, or we can duplicate detection logic (it's small)
  getYtDlpPath(): string {
    return this.ytDlpPath;
  }
}
