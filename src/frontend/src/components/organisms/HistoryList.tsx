import { faCheck, faRotate, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PlaylistHistory } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDownloadStatusContext } from "../../contexts/DownloadStatusContext";
import { Path } from "../../routes/routes";
import { type Playlist } from "../../types";
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
    const { t } = useTranslation();
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
        className="group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 rounded-md px-4 py-3 transition-colors hover:bg-white/10 md:grid-cols-[1fr_150px_120px]"
      >
        <div className="min-w-0">
          <h3 className="text-text-primary truncate text-base font-medium">
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
          <div className="text-text-secondary mt-1 flex items-center gap-2 text-xs md:hidden">
            <span>{lastCompletedAt ? formatRelativeDate(lastCompletedAt) : "-"}</span>
          </div>
        </div>

        <div className="text-text-secondary hidden text-right text-sm md:block">
          {lastCompletedAt ? formatRelativeDate(lastCompletedAt) : "-"}
        </div>

        <div className="flex items-center justify-end" onClick={handleActionClick}>
          {playlistSpotifyUrl && (
            <>
              {isDownloading ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="text-text-secondary !cursor-default !opacity-100 hover:!bg-transparent"
                >
                  <FontAwesomeIcon icon={faSpinner} spin className="text-primary" />
                  <span className="hidden md:inline">{t("history.downloading")}</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={isDisabled ? faCheck : faRotate}
                  title={isDisabled ? t("history.playlistExists") : t("history.recreateTooltip")}
                  onClick={handleRecreate}
                  disabled={isRecreating || isDisabled}
                  loading={isRecreating && !isDisabled}
                  className={isDisabled ? "text-green-500 hover:text-green-400" : ""}
                >
                  <span className="hidden md:inline">
                    {isDisabled ? t("history.exists") : t("history.recreate")}
                  </span>
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
  const { t } = useTranslation();
  const { getBulkPlaylistStatus } = useDownloadStatusContext();

  const activePlaylistsMap = useMemo(() => {
    const map = new Map<string, Playlist>();
    activePlaylists.forEach((p) => {
      if (p.spotifyUrl) map.set(p.spotifyUrl, p);
    });
    return map;
  }, [activePlaylists]);

  const downloadStatesMap = useMemo(() => {
    const urls = history.map((item) => item.playlistSpotifyUrl);
    return getBulkPlaylistStatus(urls);
  }, [history, getBulkPlaylistStatus]);

  const renderItem = useCallback(
    (item: PlaylistHistory) => {
      const activePlaylist = item.playlistSpotifyUrl
        ? activePlaylistsMap.get(item.playlistSpotifyUrl)
        : undefined;

      const downloadState = item.playlistSpotifyUrl
        ? downloadStatesMap.get(item.playlistSpotifyUrl)
        : undefined;

      const isDownloading = downloadState?.isDownloading ?? false;

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
    [activePlaylistsMap, downloadStatesMap, recreatingUrl, onRecreate, onItemClick],
  );

  return (
    <div className="flex flex-col">
      <div className="text-text-secondary mb-2 grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 px-4 py-2 text-sm font-medium tracking-wider uppercase md:grid-cols-[1fr_150px_120px]">
        <div>{t("common.title")}</div>
        <div className="hidden text-right md:block">{t("history.completed")}</div>
        <div className="text-right">{t("history.actions")}</div>
      </div>
      <VirtualList
        items={history}
        itemKey={(item) => item.playlistId ?? item.playlistSpotifyUrl ?? item.playlistName}
        renderItem={renderItem}
      />
    </div>
  );
};
