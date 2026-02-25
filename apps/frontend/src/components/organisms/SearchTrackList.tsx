import { NormalizedTrack } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { TrackList, TrackListTrack } from "./TrackList";

interface SearchTrackListProps {
  tracks: NormalizedTrack[];
  onDownload: (track: NormalizedTrack) => void;
  // onPreview is handled inside TrackList via the Link to PLAYLIST_PREVIEW
}

export const SearchTrackList: FC<SearchTrackListProps> = ({ tracks, onDownload }) => {
  const handleDownload = useCallback(
    (track: TrackListTrack) => {
      onDownload(track as NormalizedTrack);
    },
    [onDownload],
  );

  return <TrackList tracks={tracks} onDownload={handleDownload} />;
};
