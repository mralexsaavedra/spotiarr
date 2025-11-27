import { FC } from "react";
import { Outlet } from "react-router-dom";
import { Path } from "../../routes/routes";
import { useUIStore } from "../../store/useUIStore";
import { Header } from "../organisms/Header";
import { Sidebar } from "../organisms/Sidebar";

interface AppLayoutProps {
  pathname: Path;
  version: string;
}

export const AppLayout: FC<AppLayoutProps> = ({ pathname, version }) => {
  const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();

  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <Sidebar
        pathname={pathname}
        version={version}
        isMobileMenuOpen={isMobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
      />

      <main className="flex-1 flex flex-col bg-background ml-0 md:ml-64">
        <Header onToggleMobileMenu={toggleMobileMenu} />

        <Outlet />
      </main>
    </div>
  );
};
