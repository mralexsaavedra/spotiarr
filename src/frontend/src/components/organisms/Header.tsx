import { ChangeEvent, FC, KeyboardEvent, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCreatePlaylistFromUrl } from "../../hooks/useCreatePlaylistFromUrl";

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export const Header: FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { url, setUrl, handleDownload, isPending, isValidUrl } = useCreatePlaylistFromUrl();

  const handleToggleMobileMenu = useCallback(() => {
    onToggleMobileMenu();
  }, [onToggleMobileMenu]);

  const handleChangeUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setUrl(event.target.value);
    },
    [setUrl],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && isValidUrl) {
        handleDownload();
      }
    },
    [handleDownload, isValidUrl],
  );

  const isDownloadDisabled = !isValidUrl || isPending;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3">
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-3 md:hidden mr-auto">
          <button
            onClick={handleToggleMobileMenu}
            className="p-2 rounded-full hover:bg-white/10 transition"
            aria-label="Open menu"
          >
            <i className="fa-solid fa-bars text-text-primary text-lg" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SpotiArr Logo" className="w-7 h-7" />
            <span className="text-lg font-bold text-text-primary">SpotiArr</span>
          </Link>
        </div>

        <div className="hidden md:block w-full max-w-lg">
          <div className="relative">
            <input
              className="w-full pl-10 pr-28 py-2.5 rounded-full bg-background-elevated text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-background-hover transition"
              type="text"
              value={url}
              onChange={handleChangeUrl}
              onKeyUp={handleKeyUp}
              placeholder="Paste Spotify URL to download..."
            />
            <i className="fa-solid fa-link absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm pointer-events-none" />
            {url && (
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-black font-bold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                onClick={handleDownload}
                disabled={isDownloadDisabled}
              >
                Download
              </button>
            )}
          </div>
        </div>

        {url && (
          <button
            className="md:hidden w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDownload}
            disabled={isDownloadDisabled}
          >
            <i className="fa-solid fa-download text-black text-sm" />
          </button>
        )}
      </div>

      <div className="md:hidden mt-3">
        <div className="relative">
          <input
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-background-elevated text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-white/20"
            type="text"
            value={url}
            onChange={handleChangeUrl}
            onKeyUp={handleKeyUp}
            placeholder="Paste Spotify URL..."
          />
          <i className="fa-solid fa-link absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm pointer-events-none" />
        </div>
        {url && !isValidUrl && (
          <p className="text-xs text-red-400 mt-2 px-2">Please enter a valid Spotify URL</p>
        )}
      </div>
    </header>
  );
};
