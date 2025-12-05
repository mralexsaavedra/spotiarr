import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Link } from "react-router-dom";
import { NAV_ITEMS } from "../../config/navigation";
import { cn } from "../../utils/cn";

interface BottomNavigationProps {
  pathname: string;
}

export const BottomNavigation: FC<BottomNavigationProps> = ({ pathname }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg border-white/10 md:hidden pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                active ? "text-white" : "text-text-secondary hover:text-text-primary",
              )}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={cn("text-xl mb-0.5", active ? "text-white" : "")}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
