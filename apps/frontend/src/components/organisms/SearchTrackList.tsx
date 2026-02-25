import { NormalizedTrack } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { SearchTrackRow } from "../molecules/SearchTrackRow";
import { VirtualList } from "../molecules/VirtualList";

interface SearchTrackListProps {
  tracks: NormalizedTrack[];
  onDownload: (track: NormalizedTrack) => void;
}

export const SearchTrackList: FC<SearchTrackListProps> = ({ tracks, onDownload }) => {
  const renderItem = useCallback(
    (track: NormalizedTrack, index: number) => (
      <SearchTrackRow track={track} index={index} onDownload={onDownload} />
    ),
    [onDownload],
  );

  const itemKey = useCallback(
    (track: NormalizedTrack) => track.spotifyUrl ?? track.name ?? String(Math.random()),
    [],
  );

  return <VirtualList items={tracks} itemKey={itemKey} renderItem={renderItem} />;
};
