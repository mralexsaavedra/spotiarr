import { FC } from "react";
import { Track } from "../types/track";
import { EmptyPlaylistTracks } from "./EmptyPlaylistTracks";
import { TrackActions } from "./TrackActions";
import { TrackListItem } from "./TrackListItem";
import { TrackStatusBadge } from "./TrackStatusBadge";

interface PlaylistTracksListProps {
  tracks: Track[];
  onRetryTrack: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
}

export const PlaylistTracksList: FC<PlaylistTracksListProps> = ({
  tracks,
  onRetryTrack,
  onDeleteTrack,
}) => {
  if (tracks.length === 0) {
    return <EmptyPlaylistTracks />;
  }

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => (
        <TrackListItem
          key={track.id}
          index={index}
          name={track.name}
          trackUrl={track.trackUrl}
          artists={track.artists || track.artist}
          actions={
            <>
              <TrackStatusBadge status={track.status} />
              <TrackActions
                trackId={track.id}
                status={track.status}
                onRetry={onRetryTrack}
                onDelete={onDeleteTrack}
              />
            </>
          }
        />
      ))}
    </div>
  );
};
