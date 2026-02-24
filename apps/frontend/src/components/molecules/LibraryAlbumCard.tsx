import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApiRoutes, LibraryAlbum, LibraryTrack } from "@spotiarr/shared";
import { FC, memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDuration } from "@/utils/date";

interface LibraryAlbumCardProps {
  album: LibraryAlbum;
}

export const LibraryAlbumCard: FC<LibraryAlbumCardProps> = memo(({ album }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const imageUrl = album.image
    ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(album.image)}`
    : null;

  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

  return (
    <div className="bg-card group overflow-hidden rounded-lg border border-white/5 transition-all">
      <div
        className="hover:bg-card-hover flex cursor-pointer items-center p-4 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="mr-4 h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-white/5 shadow-sm">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={album.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="bg-brand-primary/10 text-brand-primary flex h-full w-full items-center justify-center text-xl">
              <FontAwesomeIcon icon={faMusic} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-text-primary mb-1 truncate text-lg font-medium" title={album.name}>
            {album.name}
          </h3>
          <p className="text-text-secondary text-sm">
            {album.year ? `${album.year} • ` : ""}
            {album.trackCount}{" "}
            {album.trackCount === 1 ? t("common.track", "Track") : t("common.tracks", "Tracks")}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/5 bg-black/20 p-2">
          <div className="flex flex-col gap-1">
            {album.tracks.map((track) => (
              <TrackItem key={track.filePath} track={track} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

LibraryAlbumCard.displayName = "LibraryAlbumCard";

const TrackItem: FC<{ track: LibraryTrack }> = memo(({ track }) => {
  return (
    <div className="text-text-secondary hover:text-text-primary flex items-center justify-between rounded px-3 py-2 text-sm transition-colors hover:bg-white/5">
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="w-6 text-right font-mono text-xs opacity-50">
          {track.trackNumber || "-"}
        </span>
        <span className="truncate">{track.name}</span>
      </div>
      {track.duration && (
        <span className="text-xs opacity-70">{formatDuration(track.duration * 1000)} </span>
      )}
      {!track.duration && <span className="text-xs opacity-50">-</span>}
    </div>
  );
});

TrackItem.displayName = "TrackItem";
