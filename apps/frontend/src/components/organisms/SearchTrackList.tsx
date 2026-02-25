import { NormalizedTrack } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { SearchTrackRow } from "../molecules/SearchTrackRow";
import { VirtualList } from "../molecules/VirtualList";

interface SearchTrackListProps {
  tracks: NormalizedTrack[];
  onDownload: (track: NormalizedTrack) => void;
}

export const SearchTrackList: FC<SearchTrackListProps> = ({ tracks, onDownload }) => {
  const { getBulkTrackStatus } = useDownloadStatusContext();

  const trackStatusesMap = useMemo(() => {
    const urls = tracks.map((t) => t.trackUrl).filter(Boolean) as string[];
    return getBulkTrackStatus(urls);
  }, [tracks, getBulkTrackStatus]);

  const renderItem = useCallback(
    (track: NormalizedTrack, index: number) => {
      const status = track.trackUrl ? trackStatusesMap.get(track.trackUrl) : undefined;
      return <SearchTrackRow track={track} index={index} status={status} onDownload={onDownload} />;
    },
    [onDownload, trackStatusesMap],
  );

  const itemKey = useCallback(
    (track: NormalizedTrack) => track.spotifyUrl ?? track.name ?? String(Math.random()),
    [],
  );

  return <VirtualList items={tracks} itemKey={itemKey} renderItem={renderItem} />;
};
