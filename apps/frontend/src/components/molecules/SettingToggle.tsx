import { FC, MouseEvent } from "react";

interface SettingToggleProps {
  id: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (event: MouseEvent<HTMLButtonElement>) => void;
}

export const SettingToggle: FC<SettingToggleProps> = ({
  id,
  label,
  description,
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <div className="text-text-primary mb-1 text-sm font-semibold">{label}</div>
        <p className="text-text-secondary text-xs">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
          value ? "bg-primary" : "bg-text-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};
