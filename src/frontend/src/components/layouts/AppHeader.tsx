import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Link } from "react-router-dom";
import { useHeaderController } from "../../hooks/controllers/useHeaderController";
import { Path } from "../../routes/routes";
import { cn } from "../../utils/cn";

export const AppHeader: FC = () => {
  const { url, handleDownload, isPending, isValidUrl, handleChangeUrl, handleKeyUp } =
    useHeaderController();

  const isDownloadDisabled = !isValidUrl || isPending;

  return (
    <header className="sticky top-0 z-50 px-4 py-3 border-b bg-background/95 backdrop-blur-md border-white/10 md:px-8">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Logo: Mobile Only */}
        <div className="flex items-center md:hidden shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SpotiArr Logo" className="w-8 h-8" />
            <span className="hidden text-lg font-bold text-text-primary sm:block">SpotiArr</span>
          </Link>
        </div>

        {/* Search Bar: Unified */}
        <div className="flex-1 max-w-lg md:mx-auto">
          <div className="relative">
            <input
              className={cn(
                "w-full pl-9 md:pl-10 pr-12 md:pr-28 py-2 md:py-2.5 rounded-full bg-background-elevated text-text-primary text-sm placeholder-text-secondary focus:outline-none transition",
                url && !isValidUrl
                  ? "ring-2 ring-red-500/50 focus:ring-red-500 bg-red-500/5"
                  : "focus:ring-2 focus:ring-white/20 focus:bg-background-hover",
              )}
              type="text"
              value={url}
              onChange={handleChangeUrl}
              onKeyUp={handleKeyUp}
              placeholder="Paste Spotify URL..."
            />
            <FontAwesomeIcon
              icon="link"
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none",
                url && !isValidUrl ? "text-red-400" : "text-text-secondary",
              )}
            />

            {url && (
              <button
                className="absolute flex items-center justify-center px-3 text-xs font-bold text-black transition-colors -translate-y-1/2 rounded-full right-1 top-1/2 h-7 md:h-8 md:px-4 bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDownload}
                disabled={isDownloadDisabled}
              >
                <span className="hidden md:inline">Download</span>
                <FontAwesomeIcon icon="download" className="md:hidden" />
              </button>
            )}
          </div>
        </div>

        {/* Settings: Mobile Only */}
        <Link
          to={Path.SETTINGS}
          className="flex items-center justify-center w-10 h-10 transition-colors rounded-full text-text-secondary hover:text-text-primary hover:bg-background-elevated md:hidden shrink-0"
        >
          <FontAwesomeIcon icon="sliders" className="text-xl" />
        </Link>
      </div>
    </header>
  );
};
