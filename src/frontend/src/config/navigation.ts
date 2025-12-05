import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { Path } from "../routes/routes";

export interface NavItem {
  label: string;
  icon: IconProp;
  to: Path;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: "house", to: Path.HOME },
  { label: "History", icon: "clock-rotate-left", to: Path.HISTORY },
  { label: "Releases", icon: "bell", to: Path.RELEASES },
  { label: "Artists", icon: "user-group", to: Path.ARTISTS },
  { label: "Settings", icon: "sliders", to: Path.SETTINGS },
];
