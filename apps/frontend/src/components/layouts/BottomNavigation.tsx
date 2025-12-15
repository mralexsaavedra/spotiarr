import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Link } from "react-router-dom";
import { MOBILE_NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/utils/cn";

interface BottomNavigationProps {
  pathname: string;
}

export const BottomNavigation: FC<BottomNavigationProps> = ({ pathname }) => {
  return (
    <nav className="bg-background/95 pb-safe fixed right-0 bottom-0 left-0 z-50 border-t border-white/10 backdrop-blur-lg md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-1 transition-colors",
                active ? "text-white" : "text-text-secondary hover:text-text-primary",
              )}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={cn("mb-0.5 text-xl", active ? "text-white" : "")}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
