import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PlaylistHistory } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDownloadStatus } from "../../hooks/useDownloadStatus";
import { Path } from "../../routes/routes";
import { type Playlist } from "../../types/playlist";
import { formatRelativeDate } from "../../utils/date";
import { Button } from "../atoms/Button";
import { VirtualList } from "../molecules/VirtualList";

interface HistoryListItemProps {
  item: PlaylistHistory;
  activePlaylist?: Playlist;
  isDownloading: boolean;
  recreatingUrl: string | null;
  onRecreate: (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => void;
  onItemClick: (item: PlaylistHistory, activePlaylist?: Playlist) => void;
}

const HistoryListItem: FC<HistoryListItemProps> = memo(
  ({ item, activePlaylist, isDownloading, recreatingUrl, onRecreate, onItemClick }) => {
    const { playlistName, playlistSpotifyUrl, lastCompletedAt } = item;

    const handleRecreate = useCallback(() => {
      const fakeEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as MouseEvent<HTMLButtonElement>;
      onRecreate(fakeEvent, playlistSpotifyUrl);
    }, [onRecreate, playlistSpotifyUrl]);

    const handleRowClick = useCallback(() => {
      onItemClick(item, activePlaylist);
    }, [onItemClick, item, activePlaylist]);

    const handleActionClick = useCallback((e: MouseEvent) => {
      e.stopPropagation();
    }, []);

    const handleLinkClick = useCallback((e: MouseEvent) => {
      e.stopPropagation();
    }, []);

    const isDisabled = !!activePlaylist;
    const isRecreating = recreatingUrl === playlistSpotifyUrl;

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
                onClick={handleLinkClick}
              >
                {playlistName}
              </Link>
            ) : playlistSpotifyUrl ? (
              <Link
                to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(playlistSpotifyUrl)}`}
                className="hover:underline"
                onClick={handleLinkClick}
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
                  <FontAwesomeIcon icon="spinner" spin className="text-primary" />
                  <span className="hidden md:inline">Downloading...</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={isDisabled ? "check" : "rotate"}
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
  recreatingUrl: string | null;
  onRecreate: (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => void;
  onItemClick: (item: PlaylistHistory, activePlaylist?: Playlist) => void;
}

export const HistoryList: FC<HistoryListProps> = ({
  history,
  activePlaylists,
  recreatingUrl,
  onRecreate,
  onItemClick,
}) => {
  const { isPlaylistDownloading } = useDownloadStatus();

  const activePlaylistsMap = useMemo(() => {
    const map = new Map<string, Playlist>();
    activePlaylists.forEach((p) => {
      if (p.spotifyUrl) map.set(p.spotifyUrl, p);
    });
    return map;
  }, [activePlaylists]);

  const renderItem = useCallback(
    (item: PlaylistHistory) => {
      const activePlaylist = item.playlistSpotifyUrl
        ? activePlaylistsMap.get(item.playlistSpotifyUrl)
        : undefined;

      const isDownloading = isPlaylistDownloading(item.playlistSpotifyUrl);

      return (
        <HistoryListItem
          item={item}
          activePlaylist={activePlaylist}
          isDownloading={isDownloading}
          recreatingUrl={recreatingUrl}
          onRecreate={onRecreate}
          onItemClick={onItemClick}
        />
      );
    },
    [activePlaylistsMap, recreatingUrl, onRecreate, onItemClick, isPlaylistDownloading],
  );

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
        renderItem={renderItem}
      />
    </div>
  );
};
