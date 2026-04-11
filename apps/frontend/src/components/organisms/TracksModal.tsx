import { faCompactDisc, faX } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { NormalizedTrack } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms/Button";
import { Image } from "../atoms/Image";

interface TracksModalProps {
  isOpen: boolean;
  albumName: string;
  artistName: string;
  coverUrl?: string | null;
  tracks: NormalizedTrack[];
  isLoading: boolean;
  onClose: () => void;
}

export const TracksModal: FC<TracksModalProps> = ({
  isOpen,
  albumName,
  artistName,
  coverUrl,
  tracks,
  isLoading,
  onClose,
}) => {
  const { t } = useTranslation();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-background-hover animate-in zoom-in-95 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-white/5 shadow-2xl transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-md">
              <Image
                src={coverUrl || undefined}
                alt={albumName}
                fallbackIcon={faCompactDisc}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{albumName}</h2>
              <p className="text-text-subtle text-sm">{artistName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-text-secondary transition-colors hover:text-white"
          >
            <FontAwesomeIcon icon={faX} className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : tracks.length === 0 ? (
            <p className="text-text-secondary py-8 text-center">{t("artist.albums.noTracks")}</p>
          ) : (
            <ul className="space-y-2">
              {tracks.map((track, index) => (
                <li
                  key={track.id || index}
                  className="flex items-center gap-3 rounded-md bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <span className="text-text-secondary w-6 text-center text-sm">
                    {track.trackNumber ?? index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{track.name}</p>
                    {track.artists.length > 0 && (
                      <p className="text-text-subtle truncate text-xs">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                    )}
                  </div>
                  {track.durationMs && (
                    <span className="text-text-secondary text-xs">
                      {Math.floor(track.durationMs / 60000)}:
                      {String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, "0")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-white/10 p-4">
          <Button variant="secondary" onClick={handleClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </div>
  );
};
