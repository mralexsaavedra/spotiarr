import React, { FC } from "react";
import { cn } from "@/utils/cn";
import { formatSeconds } from "@/utils/time";

interface ProgressSliderProps {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  ariaLabel: string;
  variant?: "bar" | "fullscreen";
}

export const ProgressSlider: FC<ProgressSliderProps> = ({
  currentTime,
  duration,
  onSeek,
  ariaLabel,
  variant = "bar",
}) => {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="group flex w-full items-center gap-2">
      <span className="text-text-secondary w-8 shrink-0 text-right text-xs tabular-nums">
        {formatSeconds(currentTime)}
      </span>
      <input
        type="range"
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatSeconds(currentTime)} of ${formatSeconds(duration)}`}
        min={0}
        max={duration || 1}
        step={1}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        className={
          variant === "bar"
            ? cn(
                "h-1 flex-1 cursor-pointer appearance-none rounded-full",
                "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full",
                "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0",
                "[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100",
                "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:opacity-0 group-hover:[&::-moz-range-thumb]:opacity-100",
                "group-hover:[background:linear-gradient(to_right,#1ed760_var(--pct),rgba(255,255,255,0.3)_var(--pct))]",
              )
            : "h-1 flex-1 cursor-pointer appearance-none rounded-full"
        }
        style={
          variant === "bar"
            ? ({
                background: `linear-gradient(to right, white ${pct}%, rgba(255,255,255,0.3) ${pct}%)`,
                "--pct": `${pct}%`,
              } as React.CSSProperties)
            : {
                background: `linear-gradient(to right, white ${pct}%, rgba(255,255,255,0.3) ${pct}%)`,
              }
        }
      />
      <span className="text-text-secondary w-8 shrink-0 text-xs tabular-nums">
        {formatSeconds(duration)}
      </span>
    </div>
  );
};
