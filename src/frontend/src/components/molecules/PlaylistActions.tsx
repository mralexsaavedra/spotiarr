import { faBell as faBellRegular } from "@fortawesome/free-regular-svg-icons";
import { faBell, faCheck, faDownload, faRepeat, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { Button } from "../atoms/Button";
import { SpotifyLinkButton } from "../molecules/SpotifyLinkButton";

interface PlaylistActionsProps {
  spotifyUrl: string;
  isSubscribed: boolean;
  hasFailed: boolean;
  isRetrying: boolean;
  isDownloading: boolean;
  isDownloaded: boolean;
  isSaved: boolean;
  onToggleSubscription: () => void;
  onRetryFailed: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

export const PlaylistActions: FC<PlaylistActionsProps> = ({
  isSubscribed,
  hasFailed,
  isRetrying,
  isDownloading,
  isDownloaded,
  isSaved,
  onToggleSubscription,
  onRetryFailed,
  onDelete,
  onDownload,
  spotifyUrl,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 md:gap-4">
      <Button
        variant="primary"
        size="lg"
        className={cn(
          "!h-12 !w-12 justify-center !rounded-full !p-0 shadow-lg transition-transform md:!h-14 md:!w-14",
          isDownloaded
            ? "cursor-default bg-green-500 hover:bg-green-600"
            : "bg-green-500 hover:scale-105 hover:bg-green-600",
        )}
        onClick={onDownload}
        loading={isDownloading}
        disabled={isDownloaded || isDownloading}
        title={
          isDownloaded
            ? t("playlist.downloaded")
            : isDownloading
              ? t("playlist.actions.downloading")
              : t("playlist.actions.download")
        }
      >
        {isDownloaded ? (
          <FontAwesomeIcon icon={faCheck} className="text-xl text-black" />
        ) : !isDownloading ? (
          <FontAwesomeIcon icon={faDownload} className="text-xl text-black" />
        ) : null}
      </Button>

      <Button
        variant="secondary"
        size="md"
        className={cn(
          "!h-9 !w-9 justify-center !rounded-full border-2 px-0 shadow-lg md:!h-10 md:!w-36 md:px-0",
          isSubscribed
            ? "border-green-500 bg-green-500 text-black hover:border-green-400 hover:bg-green-400"
            : "border-white/30 bg-transparent text-white hover:border-white hover:bg-white/10",
        )}
        onClick={onToggleSubscription}
        title={isSubscribed ? t("playlist.actions.unsubscribe") : t("playlist.actions.subscribe")}
      >
        <div className="flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={isSubscribed ? faBell : faBellRegular} className="text-sm" />
          <span className="hidden text-xs font-bold tracking-wide uppercase md:inline">
            {isSubscribed ? t("playlist.actions.subscribed") : t("playlist.actions.subscribe")}
          </span>
        </div>
      </Button>

      {spotifyUrl && <SpotifyLinkButton url={spotifyUrl} />}

      <div className="flex-1" />

      {hasFailed && (
        <Button
          variant="ghost"
          size="lg"
          icon={faRepeat}
          loading={isRetrying}
          className="text-text-secondary hover:text-text-primary hover:bg-white/10"
          onClick={onRetryFailed}
          title={t("playlist.actions.retryFailedTooltip")}
        >
          <span className="hidden sm:inline">{t("playlist.actions.retryFailed")}</span>
        </Button>
      )}

      <Button
        variant="ghost"
        size="lg"
        icon={faTrash}
        className={cn(
          "text-text-secondary",
          !isSaved ? "cursor-not-allowed opacity-30" : "hover:bg-red-500/10 hover:text-red-400",
        )}
        onClick={onDelete}
        disabled={!isSaved}
        title={
          !isSaved ? t("playlist.actions.downloadToEnable") : t("playlist.actions.deleteTooltip")
        }
      >
        <span className="hidden sm:inline">{t("playlist.actions.delete")}</span>
      </Button>
    </div>
  );
};
