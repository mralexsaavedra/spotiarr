import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
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

export const Sidebar: FC<SidebarProps> = ({ pathname }) => {
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
          isSidebarCollapsed ? "justify-center px-0" : "px-2",
        )}
        title="SpotiArr Home"
      >
        <img src="/logo.svg" alt="SpotiArr Logo" className="w-8 h-8 shrink-0" />
        {!isSidebarCollapsed && (
          <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
            SpotiArr
          </span>
        )}
      </Link>

      {/* Navigation - Scrollable area */}
      <nav className="flex flex-col flex-1 w-full min-h-0 gap-2 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 font-semibold transition-all rounded-lg px-2 py-2.5 shrink-0 overflow-hidden whitespace-nowrap",
                active
                  ? "text-text-primary bg-background-hover"
                  : "text-text-secondary hover:text-text-primary",
                isSidebarCollapsed ? "justify-center" : "",
              )}
              title={isSidebarCollapsed ? item.label : undefined}
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
                    "transition-colors whitespace-nowrap",
                    active
                      ? "text-text-primary"
                      : "text-text-secondary group-hover:text-text-primary",
                  )}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Fixed at bottom */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            "group flex items-center gap-3 font-semibold transition-all rounded-lg px-2 py-2.5 text-text-secondary hover:text-white hover:bg-white/5 w-full",
            isSidebarCollapsed ? "justify-center" : "",
          )}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <FontAwesomeIcon
            icon={isSidebarCollapsed ? "chevron-right" : "chevron-left"}
            className="w-5 text-lg text-center transition-colors"
          />
          {!isSidebarCollapsed && (
            <span className="transition-colors whitespace-nowrap">Collapse Sidebar</span>
          )}
        </button>

        <div className="pt-4 border-t border-white/10 shrink-0">
          <AppFooter collapsed={isSidebarCollapsed} />
        </div>
      </div>
    </aside>
  );
};
