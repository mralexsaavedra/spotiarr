import { FC } from "react";
import { Track } from "../../types/track";
import { EmptyState } from "../molecules/EmptyState";
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
  if (tracks.length === 0) {
    return (
      <EmptyState
        icon="fa-music"
        title="No tracks in this playlist yet"
        description="Tracks you download or sync will appear here."
        className="py-12"
      />
    );
  }

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
