import { FC, ReactNode, useEffect } from "react";
import { useDownloadStatusQuery } from "@/hooks/queries/useDownloadStatusQuery";
import { useDownloadStatusStore } from "@/store/useDownloadStatusStore";

// Re-export hooks from store for backwards compatibility
export {
  usePlaylistDownloaded,
  usePlaylistDownloading,
  useTrackStatus,
  useBulkPlaylistStatus,
  useBulkTrackStatus,
  useDownloadStatusSnapshot,
} from "@/store/useDownloadStatusStore";

export const DownloadStatusProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { data } = useDownloadStatusQuery();
  const syncFromResponse = useDownloadStatusStore((state) => state.syncFromResponse);

  useEffect(() => {
    syncFromResponse(data);
  }, [data, syncFromResponse]);

  return <>{children}</>;
};
