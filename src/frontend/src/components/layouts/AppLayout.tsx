import { FC } from "react";
import { Outlet } from "react-router-dom";
import { Path } from "../../routes/routes";
import { BottomNavigation } from "../organisms/BottomNavigation";
import { Header } from "../organisms/Header";
import { Sidebar } from "../organisms/Sidebar";

interface AppLayoutProps {
  pathname: Path;
  version: string;
}

export const AppLayout: FC<AppLayoutProps> = ({ pathname, version }) => {
  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <Sidebar pathname={pathname} version={version} />

      <main className="flex-1 flex flex-col bg-background ml-0 md:ml-64 pb-20 md:pb-0">
        <Header />

        <Outlet />
      </main>

      <BottomNavigation pathname={pathname} />
    </div>
  );
};
