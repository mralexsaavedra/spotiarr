import { ReactNode, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemKey?: (item: T) => string;
  emptyState?: ReactNode;
}

export const VirtualList = <T,>({
  items,
  renderItem,
  itemKey,
  emptyState,
}: VirtualListProps<T>) => {
  const itemContent = useCallback(
    (index: number, item: T) => (
      <div key={itemKey ? itemKey(item) : index} className="mb-1">
        {renderItem(item, index)}
      </div>
    ),
    [itemKey, renderItem],
  );

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return <Virtuoso useWindowScroll data={items} itemContent={itemContent} overscan={500} />;
};
