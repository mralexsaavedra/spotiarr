import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navigation";
import { Path } from "../../routes/routes";
import { usePreferencesStore } from "../../store/usePreferencesStore";
import { cn } from "../../utils/cn";
import { AppFooter } from "./AppFooter";

interface SidebarProps {
  pathname: string;
  version: string;
}

const NAV_TRANSLATION_KEYS: Record<string, string> = {
  Home: "home",
  History: "history",
  Releases: "releases",
  "My Playlists": "myPlaylists",
  Artists: "artists",
  Settings: "settings",
};

export const Sidebar: FC<SidebarProps> = ({ pathname }) => {
  const { t } = useTranslation();
  const { isSidebarCollapsed, toggleSidebar } = usePreferencesStore();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col py-6 border-r border-border h-screen fixed top-0 left-0 z-[70] bg-black transition-all duration-300",
        isSidebarCollapsed ? "w-20 px-2" : "w-64 px-4",
      )}
    >
      {/* Header */}
      <Link
        to={Path.HOME}
        className={cn(
          "flex items-center gap-3 mb-8 transition-all shrink-0",
          isSidebarCollapsed ? "pl-3" : "px-2",
        )}
        title={t("navigation.spotiarrHome")}
      >
        <img src="/logo.svg" alt="SpotiArr Logo" className="w-8 h-8 shrink-0" />
        {!isSidebarCollapsed && (
          <span className="text-xl font-bold tracking-tight text-white duration-300 whitespace-nowrap animate-in fade-in slide-in-from-left-2">
            SpotiArr
          </span>
        )}
      </Link>

      {/* Navigation - Scrollable area */}
      <nav className="flex flex-col flex-1 w-full min-h-0 gap-2 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          const label = t(`navigation.${NAV_TRANSLATION_KEYS[item.label]}`);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 font-semibold transition-all rounded-lg py-2.5 shrink-0 overflow-hidden whitespace-nowrap",
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
                  "text-lg transition-colors w-5 text-center",
                  active
                    ? "text-text-primary"
                    : "text-text-secondary group-hover:text-text-primary",
                )}
              />
              {!isSidebarCollapsed && (
                <span
                  className={cn(
                    "transition-all whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300",
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
            "group flex items-center gap-3 font-semibold transition-all rounded-lg py-2.5 shrink-0 mt-2 text-text-secondary hover:text-white hover:bg-white/5 w-full whitespace-nowrap overflow-hidden",
            isSidebarCollapsed ? "pl-5" : "px-2",
          )}
          title={isSidebarCollapsed ? t("navigation.expand") : t("navigation.collapse")}
        >
          <FontAwesomeIcon
            icon={isSidebarCollapsed ? faChevronRight : faChevronLeft}
            className="w-5 text-lg text-center transition-colors shrink-0"
          />
          {!isSidebarCollapsed && (
            <span className="transition-all duration-300 whitespace-nowrap animate-in fade-in slide-in-from-left-2">
              {t("navigation.collapse")}
            </span>
          )}
        </button>

        <div className="pt-4 border-t border-white/10 shrink-0">
          <AppFooter collapsed={isSidebarCollapsed} />
        </div>
      </div>
    </aside>
  );
};
