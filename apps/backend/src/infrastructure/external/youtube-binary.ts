import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import { join } from "path";

export interface YtDlpResolverDeps {
  which: () => string;
  isWritable: (path: string) => boolean;
  copyFile: (src: string, dest: string) => void;
  chmod: (path: string, mode: number) => void;
  tmpFile: string;
}

export function resolveYtDlpPath(deps: YtDlpResolverDeps): string {
  const systemPath = deps.which();
  if (!systemPath) {
    throw new Error("yt-dlp not found in PATH");
  }

  if (deps.isWritable(systemPath)) {
    return systemPath;
  }

  deps.copyFile(systemPath, deps.tmpFile);
  deps.chmod(deps.tmpFile, 0o755);
  return deps.tmpFile;
}

export function detectYtDlpPath(): string {
  return resolveYtDlpPath({
    which: () => execSync("which yt-dlp", { encoding: "utf-8" }).trim(),
    isWritable: (path) => {
      try {
        fs.accessSync(path, fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    },
    copyFile: (src, dest) => fs.copyFileSync(src, dest),
    chmod: (path, mode) => fs.chmodSync(path, mode),
    tmpFile: join(os.tmpdir(), "yt-dlp"),
  });
}
