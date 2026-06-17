import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faBell,
  faClockRotateLeft,
  faHouse,
  faListUl,
  faRobot,
  faSliders,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { Path } from "@/routes/routes";

interface NavItem {
  label: string;
  icon: IconProp;
  to: Path;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: faHouse, to: Path.HOME },
  { label: "History", icon: faClockRotateLeft, to: Path.HISTORY },
  { label: "Releases", icon: faBell, to: Path.RELEASES },
  { label: "My Playlists", icon: faListUl, to: Path.MY_PLAYLISTS },
  { label: "Artists", icon: faUserGroup, to: Path.ARTISTS },
  { label: "AI Chat", icon: faRobot, to: Path.CHAT },
  { label: "Settings", icon: faSliders, to: Path.SETTINGS },
];

const byPath = (path: Path): NavItem => {
  const item = NAV_ITEMS.find((navItem) => navItem.to === path);
  if (!item) throw new Error(`Missing nav item for path: ${path}`);
  return item;
};

export const MOBILE_NAV_ITEMS: NavItem[] = [
  Path.RELEASES,
  Path.MY_PLAYLISTS,
  Path.HOME,
  Path.ARTISTS,
  Path.CHAT,
].map(byPath);

export const MOBILE_HEADER_ITEMS: NavItem[] = [Path.HISTORY, Path.SETTINGS].map(byPath);
