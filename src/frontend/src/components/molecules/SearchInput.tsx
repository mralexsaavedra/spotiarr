import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChangeEvent, FC, KeyboardEvent, useCallback } from "react";
import { cn } from "../../utils/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className = "",
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        onSearch();
      }
    },
    [onSearch],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className={cn("relative", className)}>
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="absolute text-xs -translate-y-1/2 pointer-events-none left-3 top-1/2 text-text-secondary"
      />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2.5 rounded-full bg-background-elevated text-text-primary text-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-background-hover border border-border transition"
      />
    </div>
  );
};
