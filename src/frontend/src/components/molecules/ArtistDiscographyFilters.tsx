import { AlbumType } from "@spotiarr/shared";
import { FC, memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms/Button";

export type DiscographyFilter = AlbumType | "all";

interface FilterOption {
  key: DiscographyFilter;
  labelKey: string;
}

const FILTERS: FilterOption[] = [
  { key: "all", labelKey: "all" },
  { key: "album", labelKey: "album" },
  { key: "single", labelKey: "singlesAndEps" },
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
      className={`border whitespace-nowrap transition-all ${
        isActive
          ? "border-white bg-white text-black hover:bg-white/90"
          : "border-white/20 bg-transparent text-white hover:border-white"
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
    const { t } = useTranslation();

    return (
      <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((filter) => (
          <FilterItem
            key={filter.key}
            filterKey={filter.key}
            label={t(`common.cards.albumTypes.${filter.labelKey}`)}
            isActive={currentFilter === filter.key}
            onSelect={onFilterChange}
          />
        ))}
      </div>
    );
  },
);
