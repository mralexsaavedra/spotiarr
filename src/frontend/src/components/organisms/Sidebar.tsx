import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";

interface NavItem {
  label: string;
  icon: IconProp;
  to: Path;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: "house", to: Path.HOME },
  { label: "History", icon: "clock-rotate-left", to: Path.HISTORY },
  { label: "Releases", icon: "bell", to: Path.RELEASES },
  { label: "Artists", icon: "user-group", to: Path.ARTISTS },
  { label: "Settings", icon: "sliders", to: Path.SETTINGS },
];

interface SidebarProps {
  pathname: string;
  version: string;
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  pathname,
  version,
  isMobileMenuOpen,
  closeMobileMenu,
}) => (
  <>
    {isMobileMenuOpen && (
      <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={closeMobileMenu} />
    )}

    <aside
      className={`w-64 bg-black flex flex-col py-8 px-6 border-r border-border h-screen fixed top-0 left-0 overflow-y-auto z-[70] transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
    >
      <button
        onClick={closeMobileMenu}
        className="absolute top-4 right-4 md:hidden text-white hover:text-text-primary transition"
        aria-label="Close menu"
      >
        <FontAwesomeIcon icon="xmark" className="text-xl" />
      </button>

      <Link to={Path.HOME} onClick={closeMobileMenu} className="flex items-center gap-3 mb-8 px-2">
        <img src="/logo.svg" alt="SpotiArr Logo" className="w-8 h-8" />
        <span className="text-xl font-bold tracking-tight text-white">SpotiArr</span>
      </Link>

      <nav className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={`group flex items-center gap-2 font-semibold transition rounded-lg px-2 py-1 ${active ? "text-text-primary bg-background-hover" : "text-text-secondary hover:text-text-primary"}`}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={`text-lg transition-colors ${active ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"}`}
              />
              <span
                className={`transition-colors ${active ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <div className="flex items-center justify-between gap-2 text-xs text-text-secondary px-2">
          <div>
            {version && (
              <a
                href={`https://github.com/mralexsaavedra/spotiarr/releases/tag/v${version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text-primary underline underline-offset-2 transition-colors"
                title="Open GitHub release page"
              >
                v{version}
              </a>
            )}
          </div>

          <a
            href="https://buymeacoffee.com/mralexsaavedra"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-full hover:bg-yellow-400/10 text-yellow-400 transition-colors"
            title="Buy me a coffee"
          >
            <FontAwesomeIcon icon="mug-hot" className="text-sm" />
          </a>
        </div>
      </div>
    </aside>
  </>
);
