import { FC } from "react";
import { Outlet } from "react-router-dom";
import { Path } from "@/routes/routes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { cn } from "@/utils/cn";
import { GlobalPlayerBar } from "../organisms/GlobalPlayerBar";
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
    <div className="bg-background text-text-primary flex min-h-dvh">
      <Sidebar pathname={pathname} version={version} />

      <main
        className={cn(
          "bg-background ml-0 flex flex-1 flex-col pb-[calc(9rem+env(safe-area-inset-bottom))] transition-[margin-left] duration-300 md:pb-24",
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64",
        )}
      >
        <AppHeader />

        <Outlet />
      </main>

      <BottomNavigation pathname={pathname} />

      {/* GlobalPlayerBar is always mounted above BottomNavigation on mobile (bottom-16),
          at bottom-0 on desktop. z-40 places it below z-50 nav. */}
      <GlobalPlayerBar />
    </div>
  );
};
