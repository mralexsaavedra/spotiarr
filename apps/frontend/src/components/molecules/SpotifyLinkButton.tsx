import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { FC, MouseEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { useResolveExternalUrl } from "@/hooks/mutations/useResolveExternalUrl";
import { ApiError } from "@/services/httpClient";
import { cn } from "@/utils/cn";
import { Button, ButtonProps } from "../atoms/Button";

interface SpotifyLinkButtonProps extends Omit<ButtonProps, "onClick" | "children" | "type"> {
  provider: "spotify" | "deezer";
  entityType: "artist" | "album" | "track";
  id: string;
  name?: string;
  artistName?: string;
  eagerUrl?: string;
}

export const SpotifyLinkButton: FC<SpotifyLinkButtonProps> = ({
  provider,
  entityType,
  id,
  name,
  artistName,
  eagerUrl,
  className = "",
  variant = "secondary",
  size = "md",
  ...props
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { mutate, isPending } = useResolveExternalUrl();

  const buttonClass = cn(
    "!h-9 !w-9 justify-center border border-zinc-600 !px-0 hover:border-white md:!h-10 md:!w-auto md:!px-4",
    className,
  );

  const handleAnchorClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  }, []);

  if (eagerUrl) {
    return (
      <a
        href={eagerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline"
        onClick={handleAnchorClick}
      >
        <Button variant={variant} size={size} className={buttonClass} icon={faSpotify} {...props}>
          <span className="hidden md:inline">{t("common.openInSpotify")}</span>
        </Button>
      </a>
    );
  }

  const handleClick = () => {
    mutate(
      { provider, type: entityType, id, name, artistName },
      {
        onSuccess: (data) => {
          window.open(data.url, "_blank", "noopener,noreferrer");
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 503) {
            toast.error(t("common.spotifyUnavailable"));
          } else {
            toast.error(t("common.openInSpotifyFailed"));
          }
        },
      },
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={buttonClass}
      icon={faSpotify}
      loading={isPending}
      disabled={isPending}
      onClick={handleClick}
      {...props}
    >
      <span className="hidden md:inline">{t("common.openInSpotify")}</span>
    </Button>
  );
};
