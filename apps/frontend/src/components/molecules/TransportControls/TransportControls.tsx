import {
  faBackwardStep,
  faForwardStep,
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";

export type RepeatMode = "off" | "all" | "one";

export interface TransportControlsProps {
  isPlaying: boolean;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffleToggle: () => void;
  onRepeatCycle: () => void;
  isPrevDisabled?: boolean;
  isNextDisabled?: boolean;
  size?: "sm" | "lg";
  className?: string;
}

export const TransportControls: FC<TransportControlsProps> = ({
  isPlaying,
  shuffleMode,
  repeatMode,
  onPlayPause,
  onPrev,
  onNext,
  onShuffleToggle,
  onRepeatCycle,
  isPrevDisabled = false,
  isNextDisabled = false,
  size,
  className,
}) => {
  const { t } = useTranslation();

  const isLg = size === "lg";
  const controlSize = isLg ? "h-12 w-12" : "h-8 w-8";
  const playSize = isLg ? "h-14 w-14" : "h-10 w-10";
  const iconSize = isLg ? "text-base" : "text-sm";

  return (
    <div
      data-size={size ?? undefined}
      className={cn("flex items-center", isLg ? "gap-6" : "gap-4", className)}
    >
      <button
        type="button"
        aria-label={
          shuffleMode ? t("player.transport.shuffleOn") : t("player.transport.shuffleOff")
        }
        onClick={onShuffleToggle}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          controlSize,
          shuffleMode
            ? "text-green-500"
            : isLg
              ? "text-white/70 hover:text-white"
              : "text-text-secondary hover:text-text-primary",
        )}
      >
        <FontAwesomeIcon icon={faShuffle} className={iconSize} />
      </button>

      <button
        type="button"
        aria-label={t("player.transport.previous")}
        disabled={isPrevDisabled}
        onClick={onPrev}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          controlSize,
          isPrevDisabled
            ? "cursor-not-allowed opacity-40"
            : isLg
              ? "text-white/70 hover:text-white"
              : "text-text-secondary hover:text-text-primary",
        )}
      >
        <FontAwesomeIcon icon={faBackwardStep} className={iconSize} />
      </button>

      <button
        type="button"
        aria-label={isPlaying ? t("player.transport.pause") : t("player.transport.play")}
        aria-pressed={isPlaying}
        onClick={onPlayPause}
        className={cn(
          "flex items-center justify-center rounded-full bg-white text-black shadow transition-transform hover:scale-105",
          playSize,
        )}
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className={iconSize} />
      </button>

      <button
        type="button"
        aria-label={t("player.transport.next")}
        disabled={isNextDisabled}
        onClick={onNext}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          controlSize,
          isNextDisabled
            ? "cursor-not-allowed opacity-40"
            : isLg
              ? "text-white/70 hover:text-white"
              : "text-text-secondary hover:text-text-primary",
        )}
      >
        <FontAwesomeIcon icon={faForwardStep} className={iconSize} />
      </button>

      <button
        type="button"
        aria-label={
          repeatMode === "off"
            ? t("player.transport.repeatEnable")
            : repeatMode === "all"
              ? t("player.queue.repeatAll")
              : t("player.queue.repeatOne")
        }
        onClick={onRepeatCycle}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-colors",
          controlSize,
          repeatMode !== "off"
            ? "text-green-500"
            : isLg
              ? "text-white/70 hover:text-white"
              : "text-text-secondary hover:text-text-primary",
        )}
      >
        <FontAwesomeIcon icon={faRepeat} className={iconSize} />
        {repeatMode === "one" && (
          <sup className="absolute -top-1 -right-1 text-[0.55rem] leading-none font-bold">1</sup>
        )}
      </button>
    </div>
  );
};
