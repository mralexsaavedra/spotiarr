import { Home } from "@/views/Home";
import { Route, Routes } from "react-router-dom";
import { Path } from "./routes";

export const Routing = () => (
  <Routes>
    <Route path={Path.HOME} element={<Home />} />
    <Route path={Path.PLAYLISTS} element={<div>Playlists</div>} />
    <Route path={Path.DOWNLOADS} element={<div>Downloads</div>} />
  </Routes>
);
