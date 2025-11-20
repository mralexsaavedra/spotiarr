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
    const completedTracks = tracks.filter(
      (track) => track.status === TrackStatus.Completed,
    ).length;
    const failedTracks = tracks.filter(
      (track) => track.status === TrackStatus.Error,
    ).length;

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
    playlists
      .filter((p) => getPlaylistStatus(p) === PlaylistStatusEnum.Completed)
      .forEach((p) => deletePlaylist.mutate(p.id));
  }, [deletePlaylist, getPlaylistStatus, playlists]);

  const handleDeleteFailed = useCallback(() => {
    playlists
      .filter((p) => {
        if (p.error) return true;
        return (p.tracks ?? []).some(
          (track) => track.status === TrackStatus.Error,
        );
      })
      .forEach((p) => deletePlaylist.mutate(p.id));
  }, [deletePlaylist, playlists]);

  return (
    <>
      <section className="bg-spotify-black dark:bg-spotify-gray-dark">
        <div className="py-8 px-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-4xl font-black text-white flex items-center gap-3">
                <img
                  src="/logo.svg"
                  alt="SpotiArr Logo"
                  className="w-12 h-12"
                />
                <span className="tracking-tight">SpotiArr</span>
                <span className="inline-block bg-spotify-gray-medium text-spotify-gray-light text-xs font-bold px-3 py-1 rounded-full">
                  v{version}
                </span>
              </p>
              <p className="text-lg mt-3 text-spotify-gray-light font-medium">
                Your personal Spotify downloader with media server integration
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 rounded-full bg-spotify-gray-medium hover:bg-spotify-gray-medium/80 transition text-white"
              title="Toggle theme"
            >
              <i className={`fa-solid ${isDarkMode ? "fa-sun" : "fa-moon"}`} />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-spotify-gray-dark min-h-screen">
        <div className="py-8 px-6 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-spotify-gray-medium to-spotify-black dark:from-spotify-black dark:to-spotify-gray-dark rounded-2xl shadow-2xl p-6 mb-6">
            <p className="text-xl font-bold mb-4 text-white">
              Download from Spotify
            </p>
            <div className="flex gap-3">
              <input
                className="flex-1 px-4 py-3 bg-spotify-gray-dark border-2 border-spotify-gray-medium text-white rounded-full focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-spotify-green placeholder-spotify-gray-light"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyUp={(e) => e.key === "Enter" && handleDownload()}
                placeholder="Paste Spotify playlist, album or track URL"
              />
              <button
                className="px-8 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green-light hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 shadow-lg"
                onClick={handleDownload}
                disabled={!url || createPlaylist.isPending}
              >
                <i className="fa-solid fa-download" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-spotify-black rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="text-2xl font-bold text-black dark:text-white">
                Your Downloads
              </p>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 bg-spotify-green/10 border-2 border-spotify-green text-spotify-green font-semibold rounded-full hover:bg-spotify-green hover:text-black transition-all"
                  title="Remove completed from list"
                  onClick={handleDeleteCompleted}
                >
                  <i className="fa-solid fa-check" />
                </button>
                <button
                  className="px-4 py-2 bg-red-500/10 border-2 border-red-500 text-red-500 font-semibold rounded-full hover:bg-red-500 hover:text-white transition-all"
                  title="Remove failed from list"
                  onClick={handleDeleteFailed}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {playlists.map((playlist) => (
              <PlaylistBox key={playlist.id} playlist={playlist} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
