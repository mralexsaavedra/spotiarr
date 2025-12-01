import { PlaylistHistory } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Path } from "../../routes/routes";
import { PlaylistStatusEnum, type Playlist } from "../../types/playlist";
import { formatRelativeDate } from "../../utils/date";
import { getPlaylistStatus } from "../../utils/playlist";
import { Button } from "../atoms/Button";
import { VirtualList } from "../molecules/VirtualList";

interface HistoryListItemProps {
  item: PlaylistHistory;
  activePlaylist?: Playlist;
  isRecreating: boolean;
  onRecreate: (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => void;
}

const HistoryListItem: FC<HistoryListItemProps> = memo(
  ({
    item: { playlistName, playlistSpotifyUrl, lastCompletedAt },
    activePlaylist,
    isRecreating,
    onRecreate,
  }) => {
    const navigate = useNavigate();

    const handleRecreate = useCallback(() => {
      const fakeEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as MouseEvent<HTMLButtonElement>;
      onRecreate(fakeEvent, playlistSpotifyUrl);
    }, [onRecreate, playlistSpotifyUrl]);

    const handleRowClick = useCallback(() => {
      if (activePlaylist) {
        navigate(Path.PLAYLIST_DETAIL.replace(":id", activePlaylist.id));
      } else if (playlistSpotifyUrl) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(playlistSpotifyUrl)}`);
      }
    }, [activePlaylist, playlistSpotifyUrl, navigate]);

    const handleActionClick = useCallback((e: MouseEvent) => {
      e.stopPropagation();
    }, []);

    const status = activePlaylist ? getPlaylistStatus(activePlaylist) : undefined;
    const isDownloaded = status === PlaylistStatusEnum.Completed;
    const isDownloading =
      status !== undefined && !isDownloaded && status !== PlaylistStatusEnum.Error;

    const isDisabled = !!activePlaylist;

    return (
      <div
        onClick={handleRowClick}
        className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_150px_120px] gap-4 items-center px-4 py-3 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
      >
        <div className="min-w-0">
          <h3 className="font-medium text-base text-text-primary truncate">
            {activePlaylist ? (
              <Link
                to={Path.PLAYLIST_DETAIL.replace(":id", activePlaylist.id)}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {playlistName}
              </Link>
            ) : playlistSpotifyUrl ? (
              <Link
                to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(playlistSpotifyUrl)}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {playlistName}
              </Link>
            ) : (
              playlistName
            )}
          </h3>
          <div className="md:hidden flex items-center gap-2 text-xs text-text-secondary mt-1">
            <span>{lastCompletedAt ? formatRelativeDate(lastCompletedAt) : "-"}</span>
          </div>
        </div>

        <div className="hidden md:block text-right text-sm text-text-secondary">
          {lastCompletedAt ? formatRelativeDate(lastCompletedAt) : "-"}
        </div>

        <div className="flex justify-end items-center" onClick={handleActionClick}>
          {playlistSpotifyUrl && (
            <>
              {isDownloading ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="!opacity-100 !cursor-default hover:!bg-transparent text-text-secondary"
                >
                  <i className="fa-solid fa-spinner fa-spin text-primary" />
                  <span className="hidden md:inline">Downloading...</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={isDisabled ? "fa-check" : "fa-rotate"}
                  title={
                    isDisabled ? "Playlist already exists" : "Recreate playlist and subscribe again"
                  }
                  onClick={handleRecreate}
                  disabled={isRecreating || isDisabled}
                  loading={isRecreating && !isDisabled}
                  className={isDisabled ? "text-green-500 hover:text-green-400" : ""}
                >
                  <span className="hidden md:inline">{isDisabled ? "Exists" : "Recreate"}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
);

interface HistoryListProps {
  history: PlaylistHistory[];
  activePlaylists: Playlist[];
  isRecreating: boolean;
  onRecreate: (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => void;
}

export const HistoryList: FC<HistoryListProps> = ({
  history,
  activePlaylists,
  isRecreating,
  onRecreate,
}) => {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_150px_120px] gap-4 px-4 py-2 border-b border-white/10 text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">
        <div>Title</div>
        <div className="hidden md:block text-right">Completed</div>
        <div className="text-right">Actions</div>
      </div>
      <VirtualList
        items={history}
        itemKey={(item) => item.playlistId ?? item.playlistSpotifyUrl ?? item.playlistName}
        renderItem={(item) => {
          const activePlaylist = activePlaylists.find(
            (p) => p.spotifyUrl === item.playlistSpotifyUrl,
          );

          return (
            <HistoryListItem
              item={item}
              activePlaylist={activePlaylist}
              isRecreating={isRecreating}
              onRecreate={onRecreate}
            />
          );
        }}
      />
    </div>
  );
};
