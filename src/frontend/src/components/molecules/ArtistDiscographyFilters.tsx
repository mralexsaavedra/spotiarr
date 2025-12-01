import { AlbumType } from "@spotiarr/shared";
import { FC, memo, useCallback } from "react";
import { Button } from "../atoms/Button";

export type DiscographyFilter = AlbumType | "all";

interface FilterOption {
  key: DiscographyFilter;
  label: string;
}

const FILTERS: FilterOption[] = [
  { key: "all", label: "All" },
  { key: "album", label: "Albums" },
  { key: "single", label: "Singles & EPs" },
  { key: "compilation", label: "Compilations" },
];

interface FilterItemProps {
  filterKey: DiscographyFilter;
  label: string;
  isActive: boolean;
  onSelect: (key: DiscographyFilter) => void;
}

const FilterItem: FC<FilterItemProps> = memo(({ filterKey, label, isActive, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(filterKey);
  }, [filterKey, onSelect]);

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="ghost"
      className={`whitespace-nowrap border transition-all ${
        isActive
          ? "bg-white text-black border-white hover:bg-white/90"
          : "bg-transparent text-white border-white/20 hover:border-white"
      }`}
    >
      {label}
    </Button>
  );
});

interface ArtistDiscographyFiltersProps {
  currentFilter: DiscographyFilter;
  onFilterChange: (filter: DiscographyFilter) => void;
}

export const ArtistDiscographyFilters: FC<ArtistDiscographyFiltersProps> = memo(
  ({ currentFilter, onFilterChange }) => {
    return (
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map((filter) => (
          <FilterItem
            key={filter.key}
            filterKey={filter.key}
            label={filter.label}
            isActive={currentFilter === filter.key}
            onSelect={onFilterChange}
          />
        ))}
      </div>
    );
  },
);
