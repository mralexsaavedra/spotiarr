import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Link } from "react-router-dom";
import { useHeaderController } from "../../hooks/controllers/useHeaderController";

export const Header: FC = () => {
  const { url, handleDownload, isPending, isValidUrl, handleChangeUrl, handleKeyUp } =
    useHeaderController();

  const isDownloadDisabled = !isValidUrl || isPending;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10 px-4 md:px-8 py-3">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Logo: Mobile Only */}
        <div className="flex items-center md:hidden shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SpotiArr Logo" className="w-8 h-8" />
            <span className="text-lg font-bold text-text-primary hidden sm:block">SpotiArr</span>
          </Link>
        </div>

        {/* Search Bar: Unified */}
        <div className="flex-1 max-w-lg md:mx-auto">
          <div className="relative">
            <input
              className={`w-full pl-9 md:pl-10 pr-12 md:pr-28 py-2 md:py-2.5 rounded-full bg-background-elevated text-text-primary text-sm placeholder-text-secondary focus:outline-none transition ${
                url && !isValidUrl
                  ? "ring-2 ring-red-500/50 focus:ring-red-500 bg-red-500/5"
                  : "focus:ring-2 focus:ring-white/20 focus:bg-background-hover"
              }`}
              type="text"
              value={url}
              onChange={handleChangeUrl}
              onKeyUp={handleKeyUp}
              placeholder="Paste Spotify URL..."
            />
            <FontAwesomeIcon
              icon="link"
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none ${
                url && !isValidUrl ? "text-red-400" : "text-text-secondary"
              }`}
            />

            {url && (
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 md:h-8 px-3 md:px-4 bg-primary text-black font-bold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center justify-center"
                onClick={handleDownload}
                disabled={isDownloadDisabled}
              >
                <span className="hidden md:inline">Download</span>
                <FontAwesomeIcon icon="download" className="md:hidden" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
