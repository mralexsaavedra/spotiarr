import { FC } from "react";

interface SettingToggleProps {
  id: string;
  label: string;
  description: string;
  value: boolean;
  onChange: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
        <div className="text-sm font-semibold mb-1 text-text-primary">{label}</div>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
          value ? "bg-primary" : "bg-text-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
};
