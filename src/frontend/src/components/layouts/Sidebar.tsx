import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";
import { Path } from "../../routes/routes";
import { AppFooter } from "./AppFooter";

interface SidebarProps {
  pathname: string;
  version: string;
}

export const Sidebar: FC<SidebarProps> = ({ pathname }) => (
  <aside className="hidden md:flex w-64 bg-black flex-col py-8 px-6 border-r border-border h-screen fixed top-0 left-0 overflow-y-auto z-[70]">
    <Link to={Path.HOME} className="flex items-center gap-3 mb-8 px-2">
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
      <AppFooter />
    </div>
  </aside>
);
