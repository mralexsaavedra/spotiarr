import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChangeEvent, FC } from "react";

interface SettingSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  description: string;
  formatLabel?: (option: string) => string;
}

export const SettingSelect: FC<SettingSelectProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  description,
  formatLabel,
}) => {
  const defaultFormatLabel = (option: string) => option.charAt(0).toUpperCase() + option.slice(1);

  return (
    <div>
      <label className="block text-sm font-semibold mb-2" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className="w-full px-4 py-2 pr-10 rounded-md bg-background-input border-none text-text-primary focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
          value={value}
          onChange={onChange}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {formatLabel ? formatLabel(option) : defaultFormatLabel(option)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary">
          <FontAwesomeIcon icon={faChevronDown} className="text-text-secondary text-sm" />
        </div>
      </div>
      <p className="text-xs text-text-secondary mt-1">{description}</p>
    </div>
  );
};
