import {
  faClockRotateLeft,
  faDownload,
  faLink,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useHeaderController } from "../../hooks/controllers/useHeaderController";
import { Path } from "../../routes/routes";
import { cn } from "../../utils/cn";

export const AppHeader: FC = () => {
  const { t } = useTranslation();
  const { url, handleDownload, isPending, isValidUrl, handleChangeUrl, handleKeyUp } =
    useHeaderController();

  const isDownloadDisabled = !isValidUrl || isPending;

  return (
    <header className="bg-background/95 sticky top-0 z-50 border-b border-white/10 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-3 md:gap-4">
        {/* Logo: Mobile Only */}
        <div className="flex shrink-0 items-center md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="SpotiArr Logo" className="h-8 w-8" />
            <span className="text-text-primary hidden text-lg font-bold sm:block">SpotiArr</span>
          </Link>
        </div>

        {/* Search Bar: Unified */}
        <div className="max-w-lg flex-1 md:mx-auto">
          <div className="relative">
            <input
              className={cn(
                "bg-background-elevated text-text-primary placeholder-text-secondary w-full rounded-full py-2 pr-12 pl-9 text-sm transition focus:outline-none md:py-2.5 md:pr-28 md:pl-10",
                url && !isValidUrl
                  ? "bg-red-500/5 ring-2 ring-red-500/50 focus:ring-red-500"
                  : "focus:bg-background-hover focus:ring-2 focus:ring-white/20",
              )}
              type="text"
              value={url}
              onChange={handleChangeUrl}
              onKeyUp={handleKeyUp}
              placeholder={t("header.pasteUrl")}
            />
            <FontAwesomeIcon
              icon={faLink}
              className={cn(
                "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm",
                url && !isValidUrl ? "text-red-400" : "text-text-secondary",
              )}
            />

            {url && (
              <button
                className="bg-primary absolute top-1/2 right-1 flex h-7 -translate-y-1/2 items-center justify-center rounded-full px-3 text-xs font-bold text-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:px-4"
                onClick={handleDownload}
                disabled={isDownloadDisabled}
              >
                <span className="hidden md:inline">{t("header.download")}</span>
                <FontAwesomeIcon icon={faDownload} className="md:hidden" />
              </button>
            )}
          </div>
        </div>

        {/* History: Mobile Only */}
        <Link
          to={Path.HISTORY}
          className="text-text-secondary hover:text-text-primary hover:bg-background-elevated flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors md:hidden"
        >
          <FontAwesomeIcon icon={faClockRotateLeft} className="text-xl" />
        </Link>

        {/* Settings: Mobile Only */}
        <Link
          to={Path.SETTINGS}
          className="text-text-secondary hover:text-text-primary hover:bg-background-elevated flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors md:hidden"
        >
          <FontAwesomeIcon icon={faSliders} className="text-xl" />
        </Link>
      </div>
    </header>
  );
};
