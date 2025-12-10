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
    <div className="bg-background text-text-primary flex min-h-screen">
      <Sidebar pathname={pathname} version={version} />

      <main
        className={cn(
          "bg-background ml-0 flex flex-1 flex-col pb-20 transition-[margin-left] duration-300 md:pb-0",
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
