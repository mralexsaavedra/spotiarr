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
      <label className="mb-2 block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        className="bg-background-input text-text-primary focus:ring-text-primary/20 w-full rounded-md border-none px-4 py-2 focus:ring-2 focus:outline-none"
        value={value}
        onChange={onChange}
      />
      <p className="text-text-secondary mt-1 text-xs">{description}</p>
    </div>
  );
};
