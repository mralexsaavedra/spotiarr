import { FC, Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { RouteErrorBoundary } from "../components/RouteErrorBoundary";
import { Loading } from "../components/atoms/Loading";
import { AppLayout } from "../components/layouts/AppLayout";
import { Path } from "./routes";

// Lazy load views
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

interface RoutingProps {
  pathname: Path;
  version: string;
}

export const Routing: FC<RoutingProps> = ({ pathname, version }) => (
  <Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<AppLayout pathname={pathname} version={version} />}>
        <Route
          path={Path.HOME}
          element={
            <RouteErrorBoundary>
              <Home />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={Path.PLAYLIST_DETAIL}
          element={
            <RouteErrorBoundary>
              <PlaylistDetail />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={Path.PLAYLIST_PREVIEW}
          element={
            <RouteErrorBoundary>
              <PlaylistPreview />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={Path.HISTORY}
          element={
            <RouteErrorBoundary>
              <History />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={Path.RELEASES}
          element={
            <RouteErrorBoundary>
              <Releases />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={Path.ARTISTS}
          element={
            <RouteErrorBoundary>
              <Artists />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={Path.ARTIST_DETAIL}
          element={
            <RouteErrorBoundary>
              <ArtistDetail />
            </RouteErrorBoundary>
          }
        />
        <Route
          path={Path.SETTINGS}
          element={
            <RouteErrorBoundary>
              <Settings />
            </RouteErrorBoundary>
          }
        />
      </Route>
    </Routes>
  </Suspense>
);
