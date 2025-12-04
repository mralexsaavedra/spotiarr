import { FC, Suspense, lazy } from "react";
import { Outlet, Route, Routes } from "react-router-dom";
import { Loading } from "../components/atoms/Loading";
import { RouteErrorBoundary } from "../components/errors/RouteErrorBoundary";
import { AppLayout } from "../components/layouts/AppLayout";
import { Path } from "./routes";

const Home = lazy(() => import("../views/Home").then((module) => ({ default: module.Home })));
const PlaylistDetail = lazy(() =>
  import("../views/PlaylistDetail").then((module) => ({ default: module.PlaylistDetail })),
);
const PlaylistPreview = lazy(() =>
  import("../views/PlaylistPreview").then((module) => ({ default: module.PlaylistPreview })),
);
const History = lazy(() =>
  import("../views/History").then((module) => ({ default: module.History })),
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
const Settings = lazy(() =>
  import("../views/Settings").then((module) => ({ default: module.Settings })),
);
const NotFound = lazy(() =>
  import("../views/NotFound").then((module) => ({ default: module.NotFound })),
);

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
        <Route path={Path.HISTORY} element={<History />} />
        <Route path={Path.RELEASES} element={<Releases />} />
        <Route path={Path.ARTISTS} element={<Artists />} />
        <Route path={Path.ARTIST_DETAIL} element={<ArtistDetail />} />
        <Route path={Path.SETTINGS} element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>
  </Routes>
);
