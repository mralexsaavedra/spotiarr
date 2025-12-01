import { ReactNode, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { useGridColumns } from "../../hooks/useGridColumns";

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  itemKey: (item: T) => string;
  emptyState?: ReactNode;
}

export const VirtualGrid = <T,>({
  items,
  renderItem,
  itemKey,
  emptyState,
}: VirtualGridProps<T>) => {
  const columns = useGridColumns();

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <Virtuoso
      useWindowScroll
      data={rows}
      itemContent={(_, rowItems) => (
        <div
          className="grid gap-4 mb-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {rowItems.map((item) => (
            <div key={itemKey(item)} className="contents">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    />
  );
};
