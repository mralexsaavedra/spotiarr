import { Path } from "@/routes/routes";
import { Link } from "react-router-dom";

interface NavItem {
  label: string;
  icon: string;
  to: Path;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: "fa-house", to: Path.HOME },
  { label: "Playlists", icon: "fa-list", to: Path.PLAYLISTS },
  { label: "Downloads", icon: "fa-download", to: Path.DOWNLOADS },
];

export const Sidebar = ({
  pathname,
  version,
  toggleDarkMode,
  isDarkMode,
}: {
  pathname: string;
  version: string;
  toggleDarkMode: () => void;
  isDarkMode: boolean;
}) => (
  <aside className="w-64 bg-spotify-gray-light dark:bg-spotify-gray-dark flex flex-col py-8 px-6 border-r border-spotify-gray-medium dark:border-spotify-gray-medium h-screen fixed top-0 left-0 overflow-y-auto z-20">
    <div className="flex items-center gap-3 mb-8">
      <img src="/logo.svg" alt="SpotiArr Logo" className="w-10 h-10" />
      <span className="text-2xl font-black tracking-tight">SpotiArr</span>
    </div>

    <nav className="flex flex-col gap-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.to;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`group flex items-center gap-2 font-semibold transition rounded-lg px-2 py-1 ${active ? "text-spotify-green bg-spotify-green/10 dark:bg-spotify-green/20" : "text-spotify-gray-dark dark:text-spotify-gray-light"} hover:text-spotify-green hover:bg-spotify-green/10 dark:hover:bg-spotify-green/20`}
          >
            <i
              className={`fa-solid ${item.icon} group-hover:text-spotify-green group-hover:dark:text-spotify-green transition ${active ? "text-spotify-green" : ""}`}
            />
            <span
              className={`group-hover:text-spotify-green group-hover:dark:text-spotify-green transition ${active ? "text-spotify-green" : ""}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>

    <div className="mt-auto pt-8">
      <button
        onClick={toggleDarkMode}
        className={`w-full px-4 py-2 rounded-full border border-spotify-gray-medium dark:border-spotify-gray-light bg-spotify-gray-light dark:bg-spotify-gray-medium transition flex items-center justify-center gap-2 hover:bg-spotify-green/20 hover:border-spotify-green dark:hover:bg-spotify-green/30`}
        title="Toggle theme"
      >
        <i
          className={`fa-solid ${isDarkMode ? "fa-sun" : "fa-moon"}`}
          style={{ color: isDarkMode ? "#FFD700" : "#282828" }}
        />
        <span
          className={isDarkMode ? "text-white" : "text-black font-semibold"}
        >
          {isDarkMode ? "Light" : "Dark"} mode
        </span>
      </button>

      <div className="mt-4 text-xs text-spotify-gray-dark dark:text-spotify-gray-light">
        v{version}
      </div>
    </div>
  </aside>
);
