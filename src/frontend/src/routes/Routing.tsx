import { FC } from "react";
import { Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { History } from "../views/History";
import { Home } from "../views/Home";
import { PlaylistDetail } from "../views/PlaylistDetail";
import { PlaylistPreview } from "../views/PlaylistPreview";
import { Releases } from "../views/Releases";
import { Settings } from "../views/Settings";
import { Path } from "./routes";

interface RoutingProps {
  pathname: Path;
  version: string;
}

export const Routing: FC<RoutingProps> = ({ pathname, version }) => (
  <Routes>
    <Route element={<AppLayout pathname={pathname} version={version} />}>
      <Route path={Path.HOME} element={<Home />} />
      <Route path={Path.PLAYLIST_DETAIL} element={<PlaylistDetail />} />
      <Route path={Path.PLAYLIST_PREVIEW} element={<PlaylistPreview />} />
      <Route path={Path.HISTORY} element={<History />} />
      <Route path={Path.RELEASES} element={<Releases />} />
      <Route path={Path.SETTINGS} element={<Settings />} />
    </Route>
  </Routes>
);
