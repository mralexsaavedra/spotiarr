import { FC, MouseEvent, useCallback } from "react";
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
        className={`border border-zinc-600 hover:border-white !w-9 md:!w-auto !h-9 md:!h-10 !px-0 md:!px-4 justify-center ${className}`}
        icon={["fab", "spotify"]}
        {...props}
      >
        <span className="hidden md:inline">Open in Spotify</span>
      </Button>
    </a>
  );
};
