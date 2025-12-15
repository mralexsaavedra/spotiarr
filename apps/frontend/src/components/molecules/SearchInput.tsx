import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChangeEvent, FC, KeyboardEvent, useCallback } from "react";
import { cn } from "@/utils/cn";

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
        className="text-text-secondary pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs"
      />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="bg-background-elevated text-text-primary placeholder-text-secondary focus:bg-background-hover border-border w-full rounded-full border py-2.5 pr-3 pl-9 text-sm transition focus:ring-2 focus:ring-white/20 focus:outline-none"
      />
    </div>
  );
};
