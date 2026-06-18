import { FC, Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Loading } from "@/components/atoms/Loading";
import { RouteErrorBoundary } from "@/components/errors/RouteErrorBoundary";
import { AppLayout } from "@/components/layouts/AppLayout";
import { Path } from "./routes";

const Home = lazy(() => import("../views/Home").then((module) => ({ default: module.Home })));
const PlaylistDetail = lazy(() =>
  import("../views/PlaylistDetail").then((module) => ({ default: module.PlaylistDetail })),
);
const PlaylistPreview = lazy(() =>
  import("../views/PlaylistPreview").then((module) => ({ default: module.PlaylistPreview })),
);
const Dashboard = lazy(() =>
  import("../views/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const Releases = lazy(() =>
  import("../views/Releases").then((module) => ({ default: module.Releases })),
);
const Artists = lazy(() =>
  import("../views/Artists").then((module) => ({ default: module.Artists })),
);
const ArtistDetail = lazy(() =>
  import("../views/ArtistDetail").then((module) => ({ default: module.ArtistDetail })),
);
const LibraryArtist = lazy(() =>
  import("../views/LibraryArtist").then((module) => ({ default: module.LibraryArtist })),
);
const LibraryAlbumDetail = lazy(() =>
  import("../views/LibraryAlbumDetail").then((module) => ({ default: module.LibraryAlbumDetail })),
);
const MyPlaylists = lazy(() =>
  import("../views/MyPlaylists").then((module) => ({ default: module.MyPlaylists })),
);
const Settings = lazy(() =>
  import("../views/Settings").then((module) => ({ default: module.Settings })),
);
const NotFound = lazy(() =>
  import("../views/NotFound").then((module) => ({ default: module.NotFound })),
);
const Search = lazy(() => import("../views/Search").then((module) => ({ default: module.Search })));
const AlbumDetail = lazy(() =>
  import("../views/AlbumDetail").then((module) => ({ default: module.AlbumDetail })),
);
const Chat = lazy(() => import("../views/Chat").then((module) => ({ default: module.Chat })));

interface RoutingProps {
  pathname: Path;
  version: string;
}

export const Routing: FC<RoutingProps> = ({ pathname, version }) => (
  <Routes>
    <Route element={<AppLayout pathname={pathname} version={version} />}>
      <Route
        element={
          <RouteErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        }
      >
        <Route path={Path.HOME} element={<Home />} />
        <Route path={Path.PLAYLIST_DETAIL} element={<PlaylistDetail />} />
        <Route path={Path.PLAYLIST_PREVIEW} element={<PlaylistPreview />} />
        <Route path={Path.DASHBOARD} element={<Dashboard />} />
        <Route path={Path.HISTORY} element={<Navigate to={Path.DASHBOARD} replace />} />
        <Route path={Path.RELEASES} element={<Releases />} />
        <Route path={Path.ARTISTS} element={<Artists />} />
        <Route path={Path.ARTIST_DETAIL} element={<ArtistDetail />} />
        <Route path={Path.LIBRARY_ARTIST} element={<LibraryArtist />} />
        <Route path={Path.LIBRARY_ALBUM} element={<LibraryAlbumDetail />} />
        <Route path={Path.MY_PLAYLISTS} element={<MyPlaylists />} />
        <Route path={Path.SETTINGS} element={<Settings />} />
        <Route path={Path.SEARCH} element={<Search />} />
        <Route path={Path.ALBUM_DETAIL} element={<AlbumDetail />} />
        <Route path={Path.CHAT} element={<Chat />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>
  </Routes>
);
