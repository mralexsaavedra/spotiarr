import { NormalizedTrack } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { SearchTrackRow } from "../molecules/SearchTrackRow";
import { VirtualList } from "../molecules/VirtualList";

interface SearchTrackListProps {
  tracks: NormalizedTrack[];
  onPreview: (track: NormalizedTrack) => void;
  onDownload: (track: NormalizedTrack) => void;
}

export const SearchTrackList: FC<SearchTrackListProps> = ({ tracks, onPreview, onDownload }) => {
  const { getBulkTrackStatus } = useDownloadStatusContext();

  const trackStatusesMap = useMemo(() => {
    const urls = tracks.map((t) => t.trackUrl).filter(Boolean) as string[];
    return getBulkTrackStatus(urls);
  }, [tracks, getBulkTrackStatus]);

  const renderItem = useCallback(
    (track: NormalizedTrack, index: number) => {
      const status = track.trackUrl ? trackStatusesMap.get(track.trackUrl) : undefined;
      return (
        <SearchTrackRow
          track={track}
          index={index}
          status={status}
          onPreview={onPreview}
          onDownload={onDownload}
        />
      );
    },
    [onPreview, onDownload, trackStatusesMap],
  );

  const itemKey = useCallback(
    (track: NormalizedTrack) => track.spotifyUrl ?? track.name ?? String(Math.random()),
    [],
  );

  return <VirtualList items={tracks} itemKey={itemKey} renderItem={renderItem} />;
};
