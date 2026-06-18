import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faBell,
  faGaugeHigh,
  faHouse,
  faListUl,
  faRobot,
  faSliders,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import type { ParseKeys } from "i18next";
import { Path } from "@/routes/routes";

interface NavItem {
  labelKey: ParseKeys;
  icon: IconProp;
  to: Path;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "navigation.home", icon: faHouse, to: Path.HOME },
  { labelKey: "navigation.dashboard", icon: faGaugeHigh, to: Path.DASHBOARD },
  { labelKey: "navigation.releases", icon: faBell, to: Path.RELEASES },
  { labelKey: "navigation.myPlaylists", icon: faListUl, to: Path.MY_PLAYLISTS },
  { labelKey: "navigation.artists", icon: faUserGroup, to: Path.ARTISTS },
  { labelKey: "navigation.aiChat", icon: faRobot, to: Path.CHAT },
  { labelKey: "navigation.settings", icon: faSliders, to: Path.SETTINGS },
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

export const MOBILE_HEADER_ITEMS: NavItem[] = [Path.DASHBOARD, Path.SETTINGS].map(byPath);
