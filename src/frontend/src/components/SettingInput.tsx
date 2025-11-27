import { ChangeEvent, FC } from "react";

interface SettingInputProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: "text" | "number";
  min?: number;
  max?: number;
  description: string;
}

export const SettingInput: FC<SettingInputProps> = ({
  id,
  label,
  value,
  onChange,
  type = "number",
  min,
  max,
  description,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        className="w-full px-4 py-2 rounded-md bg-background-input border-none text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary/20"
        value={value}
        onChange={onChange}
      />
      <p className="text-xs text-text-secondary mt-1">{description}</p>
    </div>
  );
};
