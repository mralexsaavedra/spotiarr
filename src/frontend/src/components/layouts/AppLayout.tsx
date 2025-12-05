import { FC } from "react";
import { Outlet } from "react-router-dom";
import { Path } from "../../routes/routes";
import { usePreferencesStore } from "../../store/usePreferencesStore";
import { cn } from "../../utils/cn";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  pathname: Path;
  version: string;
}

export const AppLayout: FC<AppLayoutProps> = ({ pathname, version }) => {
  const { isSidebarCollapsed } = usePreferencesStore();

  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <Sidebar pathname={pathname} version={version} />

      <main
        className={cn(
          "flex-1 flex flex-col bg-background ml-0 pb-20 md:pb-0 transition-all duration-300",
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64",
        )}
      >
        <AppHeader />

        <Outlet />
      </main>

      <BottomNavigation pathname={pathname} />
    </div>
  );
};
