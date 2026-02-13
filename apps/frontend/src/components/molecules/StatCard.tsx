import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, memo } from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: IconProp;
  className?: string;
}

export const StatCard: FC<StatCardProps> = memo(({ label, value, icon, className }) => {
  return (
    <div
      className={`bg-card w-full rounded-lg border border-white/5 p-4 shadow-sm backdrop-blur-sm sm:flex-1 ${className || ""}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-text-secondary text-sm font-medium">{label}</div>
          <div className="text-text-primary mt-1 text-2xl font-bold">{value}</div>
        </div>
        {icon && <FontAwesomeIcon icon={icon} className="text-brand-primary text-xl" />}
      </div>
    </div>
  );
});

StatCard.displayName = "StatCard";
