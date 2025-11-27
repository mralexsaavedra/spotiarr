import { ChangeEventHandler, FC } from "react";

interface SearchInputProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2.5 rounded-full bg-background-elevated text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-background-hover border border-border transition"
      />
      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs pointer-events-none" />
    </div>
  );
};
