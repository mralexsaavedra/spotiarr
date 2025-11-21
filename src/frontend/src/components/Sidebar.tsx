export const Sidebar = ({ version, toggleDarkMode, isDarkMode }: { version: string; toggleDarkMode: () => void; isDarkMode: boolean }) => (
  <aside className="w-64 bg-spotify-gray-light dark:bg-spotify-gray-dark flex flex-col py-8 px-6 border-r border-spotify-gray-medium dark:border-spotify-gray-medium h-screen fixed top-0 left-0 overflow-y-auto z-20">
    <div className="flex items-center gap-3 mb-8">
      <img src="/logo.svg" alt="SpotiArr Logo" className="w-10 h-10" />
      <span className="text-2xl font-black tracking-tight">SpotiArr</span>
    </div>
    <nav className="flex flex-col gap-4">
      <a href="#" className="group flex items-center gap-2 text-spotify-gray-dark dark:text-spotify-gray-light font-semibold transition rounded-lg px-2 py-1">
        <i className="fa-solid fa-house group-hover:text-spotify-green group-hover:dark:text-spotify-green transition" />
        <span className="group-hover:text-spotify-green group-hover:dark:text-spotify-green transition">Home</span>
      </a>
      <a href="#" className="group flex items-center gap-2 text-spotify-gray-dark dark:text-spotify-gray-light font-semibold transition rounded-lg px-2 py-1">
        <i className="fa-solid fa-list group-hover:text-spotify-green group-hover:dark:text-spotify-green transition" />
        <span className="group-hover:text-spotify-green group-hover:dark:text-spotify-green transition">Playlists</span>
      </a>
      <a href="#" className="group flex items-center gap-2 text-spotify-gray-dark dark:text-spotify-gray-light font-semibold transition rounded-lg px-2 py-1">
        <i className="fa-solid fa-download group-hover:text-spotify-green group-hover:dark:text-spotify-green transition" />
        <span className="group-hover:text-spotify-green group-hover:dark:text-spotify-green transition">Downloads</span>
      </a>
    </nav>
    <div className="mt-auto pt-8">
      <button
        onClick={toggleDarkMode}
        className={
          `w-full px-4 py-2 rounded-full border border-spotify-gray-medium dark:border-spotify-gray-light bg-spotify-gray-light dark:bg-spotify-gray-medium transition flex items-center justify-center gap-2 hover:bg-spotify-green/20 hover:border-spotify-green dark:hover:bg-spotify-green/30`
        }
        title="Toggle theme"
      >
        <i
          className={`fa-solid ${isDarkMode ? "fa-sun" : "fa-moon"}`}
          style={{ color: isDarkMode ? '#FFD700' : '#282828' }}
        />
        <span className={isDarkMode ? "text-white" : "text-black font-semibold"}>
          {isDarkMode ? "Light" : "Dark"} mode
        </span>
      </button>
      <div className="mt-4 text-xs text-spotify-gray-dark dark:text-spotify-gray-light">v{version}</div>
    </div>
  </aside>
);
