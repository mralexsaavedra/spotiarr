import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "@/config/navigation";
import { Path } from "@/routes/routes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { cn } from "@/utils/cn";
import { AppFooter } from "./AppFooter";

interface SidebarProps {
  pathname: string;
  version: string;
}

const NAV_TRANSLATION_KEYS = {
  Home: "navigation.home",
  History: "navigation.history",
  Releases: "navigation.releases",
  "My Playlists": "navigation.myPlaylists",
  Artists: "navigation.artists",
  Settings: "navigation.settings",
} as const;

export const Sidebar: FC<SidebarProps> = ({ pathname }) => {
  const { t } = useTranslation();
  const { isSidebarCollapsed, toggleSidebar } = usePreferencesStore();

  return (
    <aside
      className={cn(
        "border-border fixed top-0 left-0 z-70 hidden h-screen flex-col border-r bg-black py-6 transition-all duration-300 md:flex",
        isSidebarCollapsed ? "w-20 px-2" : "w-64 px-4",
      )}
    >
      {/* Header */}
      <Link
        to={Path.HOME}
        className={cn(
          "mb-8 flex shrink-0 items-center gap-3 transition-all",
          isSidebarCollapsed ? "pl-3" : "px-2",
        )}
        title={t("navigation.spotiarrHome")}
      >
        <img src="/logo.svg" alt="SpotiArr Logo" className="h-8 w-8 shrink-0" />
        {!isSidebarCollapsed && (
          <span className="animate-in fade-in slide-in-from-left-2 text-xl font-bold tracking-tight whitespace-nowrap text-white duration-300">
            SpotiArr
          </span>
        )}
      </Link>

      {/* Navigation - Scrollable area */}
      <nav className="scrollbar-hide flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          const translationKey =
            NAV_TRANSLATION_KEYS[item.label as keyof typeof NAV_TRANSLATION_KEYS];
          const label = t(translationKey);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex shrink-0 items-center gap-3 overflow-hidden rounded-lg py-2.5 font-semibold whitespace-nowrap transition-all",
                active
                  ? "text-text-primary bg-background-hover"
                  : "text-text-secondary hover:text-text-primary",
                isSidebarCollapsed ? "pl-5" : "px-2",
              )}
              title={isSidebarCollapsed ? label : undefined}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={cn(
                  "w-5 text-center text-lg transition-colors",
                  active
                    ? "text-text-primary"
                    : "text-text-secondary group-hover:text-text-primary",
                )}
              />
              {!isSidebarCollapsed && (
                <span
                  className={cn(
                    "animate-in fade-in slide-in-from-left-2 whitespace-nowrap transition-all duration-300",
                    active
                      ? "text-text-primary"
                      : "text-text-secondary group-hover:text-text-primary",
                  )}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Fixed at bottom */}
      <div className="flex flex-col gap-2 pt-2">
        {/* Collapse Toggle Item */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "group text-text-secondary mt-2 flex w-full shrink-0 items-center gap-3 overflow-hidden rounded-lg py-2.5 font-semibold whitespace-nowrap transition-all hover:bg-white/5 hover:text-white",
            isSidebarCollapsed ? "pl-5" : "px-2",
          )}
          title={isSidebarCollapsed ? t("navigation.expand") : t("navigation.collapse")}
        >
          <FontAwesomeIcon
            icon={isSidebarCollapsed ? faChevronRight : faChevronLeft}
            className="w-5 shrink-0 text-center text-lg transition-colors"
          />
          {!isSidebarCollapsed && (
            <span className="animate-in fade-in slide-in-from-left-2 whitespace-nowrap transition-all duration-300">
              {t("navigation.collapse")}
            </span>
          )}
        </button>

        <div className="shrink-0 border-t border-white/10 pt-4">
          <AppFooter collapsed={isSidebarCollapsed} />
        </div>
      </div>
    </aside>
  );
};
