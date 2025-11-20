import { useState, useEffect, useCallback } from "react";
import { usePlaylists } from "./hooks/usePlaylists";
import { useWebSocket } from "./hooks/useWebSocket";
import { useUIStore } from "./store/useUIStore";
import { PlaylistStatusEnum, type Playlist } from "./types/playlist";
import { TrackStatus } from "./types/track";
import { api } from "./services/api";
import { PlaylistBox } from "./components/PlaylistBox";

export const App = () => {
  const [url, setUrl] = useState("");
  const [version, setVersion] = useState("");

  const { playlists, createPlaylist, deletePlaylist } = usePlaylists();
  const { isDarkMode, toggleDarkMode } = useUIStore();
  
  useWebSocket();

  useEffect(() => {
    api.getVersion().then((data) => setVersion(data.version));
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const getPlaylistStatus = useCallback((playlist: Playlist): PlaylistStatusEnum => {
    if (playlist.error) return PlaylistStatusEnum.Error;
    
    const tracks = playlist.tracks ?? [];
    const hasTracks = tracks.length > 0;
    const completedTracks = tracks.filter((track) => track.status === TrackStatus.Completed).length;
    const failedTracks = tracks.filter((track) => track.status === TrackStatus.Error).length;
    
    if (hasTracks && completedTracks === tracks.length) {
      return PlaylistStatusEnum.Completed;
    }
    
    if (failedTracks > 0) {
      return PlaylistStatusEnum.Warning;
    }
    
    if (playlist.active) return PlaylistStatusEnum.Subscribed;
    
    return PlaylistStatusEnum.InProgress;
  }, []);

  const handleDownload = () => {
    if (!url.trim()) return;

    createPlaylist.mutate(url);
    setUrl("");
  };

  const handleDeleteCompleted = useCallback(() => {
    playlists.filter((p) => getPlaylistStatus(p) === PlaylistStatusEnum.Completed).forEach((p) => deletePlaylist.mutate(p.id));
  }, [deletePlaylist, getPlaylistStatus, playlists]);

  const handleDeleteFailed = useCallback(() => {
    playlists.filter((p) => {
      if (p.error) return true;

      return (p.tracks ?? []).some((track) => track.status === TrackStatus.Error);
    })
    .forEach((p) => deletePlaylist.mutate(p.id));
  }, [deletePlaylist, playlists]);

  // Layout base tipo Spotify
  return (
    <div className="flex min-h-screen bg-white dark:bg-spotify-black text-black dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-spotify-gray-light dark:bg-spotify-gray-dark flex flex-col py-8 px-6 border-r border-spotify-gray-medium dark:border-spotify-gray-medium">
        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.svg" alt="SpotiArr Logo" className="w-10 h-10" />
          <span className="text-2xl font-black tracking-tight">SpotiArr</span>
        </div>
        <nav className="flex flex-col gap-4">
          <a href="#" className="group flex items-center gap-2 text-spotify-gray-dark dark:text-spotify-gray-light font-semibold transition">
            <i className="fa-solid fa-house group-hover:text-spotify-green group-hover:dark:text-spotify-green transition" />
            <span className="group-hover:text-spotify-green group-hover:dark:text-spotify-green transition">Home</span>
          </a>
          <a href="#" className="group flex items-center gap-2 text-spotify-gray-dark dark:text-spotify-gray-light font-semibold transition">
            <i className="fa-solid fa-list group-hover:text-spotify-green group-hover:dark:text-spotify-green transition" />
            <span className="group-hover:text-spotify-green group-hover:dark:text-spotify-green transition">Playlists</span>
          </a>
          <a href="#" className="group flex items-center gap-2 text-spotify-gray-dark dark:text-spotify-gray-light font-semibold transition">
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

      {/* Main content */}
      <main className="flex-1 flex flex-col bg-white dark:bg-spotify-black">
        {/* Header */}
        <header className="bg-white dark:bg-spotify-black border-b border-spotify-gray-medium dark:border-spotify-gray-medium px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-black dark:text-white">Your personal Spotify downloader</p>
            <p className="text-sm text-spotify-gray-dark dark:text-spotify-gray-light">Media server integration & real-time updates</p>
          </div>
          <div className="flex gap-3">
            <input
              className="px-4 py-2 rounded-full bg-spotify-gray-light dark:bg-spotify-gray-dark border border-spotify-gray-medium dark:border-spotify-gray-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-spotify-green placeholder-spotify-gray-dark dark:placeholder-spotify-gray-light"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyUp={(e) => e.key === "Enter" && handleDownload()}
              placeholder="Paste Spotify playlist, album or track URL"
            />
            <button
              className="px-6 py-2 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green-light hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 shadow-lg"
              onClick={handleDownload}
              disabled={!url || createPlaylist.isPending}
            >
              <i className="fa-solid fa-download" />
              <span>Download</span>
            </button>
          </div>
        </header>

        {/* Downloads section */}
        <section className="flex-1 bg-white dark:bg-spotify-black px-8 py-8">
          <div className="bg-spotify-gray-light dark:bg-spotify-gray-dark rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="text-2xl font-bold text-black dark:text-white">Your Downloads</p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-spotify-green/10 border-2 border-spotify-green text-spotify-green font-semibold rounded-full hover:bg-spotify-green hover:text-black transition-all" title="Remove completed from list" onClick={handleDeleteCompleted}>
                  <i className="fa-solid fa-check" />
                </button>
                <button className="px-4 py-2 bg-red-500/10 border-2 border-red-500 text-red-500 font-semibold rounded-full hover:bg-red-500 hover:text-white transition-all" title="Remove failed from list" onClick={handleDeleteFailed}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>
            {playlists.map((playlist) => (
              <PlaylistBox key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
