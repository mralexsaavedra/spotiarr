import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { APP_VERSION } from "../../constants/version";
import { cn } from "../../utils/cn";

interface AppFooterProps {
  className?: string;
}

export const AppFooter = ({ className = "" }: AppFooterProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-text-secondary",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <a
          href={`https://github.com/mralexsaavedra/spotiarr/releases/tag/v${APP_VERSION}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm transition-colors hover:text-white"
        >
          <span className="md:hidden">SpotiArr </span>v{APP_VERSION}
        </a>
        <span className="text-white/20">|</span>
        <a
          href="https://buymeacoffee.com/mralexsaavedra"
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
