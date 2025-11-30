import { FC } from "react";
import { Track } from "../../types/track";
import { PlaylistTrackItem } from "../molecules/PlaylistTrackItem";

interface PlaylistTracksListProps {
  tracks: Track[];
  onRetryTrack: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

export const PlaylistTracksList: FC<PlaylistTracksListProps> = ({
  tracks,
  onRetryTrack,
  onDownloadTrack,
}) => {
  return (
    <div className="space-y-1">
      {tracks.map((track, index) => (
        <PlaylistTrackItem
          key={track.id}
          track={track}
          index={index}
          onRetryTrack={onRetryTrack}
          onDownloadTrack={onDownloadTrack}
        />
      ))}
    </div>
  );
};
