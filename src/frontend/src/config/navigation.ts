import { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faBell,
  faClockRotateLeft,
  faHouse,
  faListUl,
  faSliders,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import { Path } from "@/routes/routes";

export interface NavItem {
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
  { label: "Settings", icon: faSliders, to: Path.SETTINGS },
];

export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter(
  (item) => item.to !== Path.SETTINGS && item.to !== Path.HISTORY,
);
