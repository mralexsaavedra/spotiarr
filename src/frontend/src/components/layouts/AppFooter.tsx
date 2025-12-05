import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BUY_ME_A_COFFEE_URL, GITHUB_RELEASE_URL } from "../../config/links";
import { APP_VERSION } from "../../config/version";
import { cn } from "../../utils/cn";

interface AppFooterProps {
  className?: string;
  collapsed?: boolean;
}

export const AppFooter = ({ className = "", collapsed = false }: AppFooterProps) => {
  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center gap-4 text-text-secondary pb-4", className)}>
        <a
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 transition-colors hover:text-yellow-300"
          title="Buy me a coffee"
        >
          <FontAwesomeIcon icon="mug-hot" className="text-xl" />
        </a>
        <a
          href={GITHUB_RELEASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] transition-colors hover:text-white"
          title={`SpotiArr v${APP_VERSION}`}
        >
          v{APP_VERSION}
        </a>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-text-secondary whitespace-nowrap overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <a
          href={GITHUB_RELEASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm transition-colors hover:text-white"
        >
          <span className="md:hidden">SpotiArr </span>v{APP_VERSION}
        </a>
        <span className="text-white/20">|</span>
        <a
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-yellow-400 transition-colors hover:text-yellow-300"
        >
          <FontAwesomeIcon icon="mug-hot" />
          <span className="text-sm font-medium">Buy me a coffee</span>
        </a>
      </div>
    </div>
  );
};
