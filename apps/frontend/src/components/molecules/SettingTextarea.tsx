import { ChangeEvent, FC } from "react";

interface SettingTextareaProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  description: string;
}

export const SettingTextarea: FC<SettingTextareaProps> = ({
  id,
  label,
  value,
  onChange,
  description,
}) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="bg-background-input text-text-primary focus:ring-text-primary/20 min-h-[120px] w-full rounded-md border-none px-4 py-2 font-mono text-xs focus:ring-2 focus:outline-none"
        value={value}
        onChange={onChange}
        spellCheck={false}
      />
      <p className="text-text-secondary mt-1 text-xs">{description}</p>
    </div>
  );
};
