import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { FC, MouseEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../utils/cn";
import { Button, ButtonProps } from "../atoms/Button";

interface SpotifyLinkButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  url: string;
}

export const SpotifyLinkButton: FC<SpotifyLinkButtonProps> = ({
  url,
  className = "",
  variant = "secondary",
  size = "md",
  ...props
}) => {
  const { t } = useTranslation();
  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
  }, []);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline"
      onClick={handleClick}
    >
      <Button
        variant={variant}
        size={size}
        className={cn(
          "border border-zinc-600 hover:border-white !w-9 md:!w-auto !h-9 md:!h-10 !px-0 md:!px-4 justify-center",
          className,
        )}
        icon={faSpotify}
        {...props}
      >
        <span className="hidden md:inline">{t("common.openInSpotify")}</span>
      </Button>
    </a>
  );
};
