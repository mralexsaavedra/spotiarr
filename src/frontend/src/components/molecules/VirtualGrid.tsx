import { ReactNode, useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { useGridColumns } from "../../hooks/useGridColumns";

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  itemKey: (item: T) => string;
  emptyState?: ReactNode;
  footer?: ReactNode;
}

export const VirtualGrid = <T,>({
  items,
  renderItem,
  itemKey,
  emptyState,
  footer,
}: VirtualGridProps<T>) => {
  const columns = useGridColumns();

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const virtuosoComponents = useMemo(
    () => ({
      Footer: footer ? () => <>{footer}</> : undefined,
    }),
    [footer],
  );

  const itemContent = useCallback(
    (_: number, rowItems: T[]) => (
      <div
        className="mb-4 grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {rowItems.map((item) => (
          <div key={itemKey(item)} className="contents">
            {renderItem(item)}
          </div>
        ))}
      </div>
    ),
    [columns, itemKey, renderItem],
  );

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <Virtuoso
      useWindowScroll
      data={rows}
      components={virtuosoComponents}
      itemContent={itemContent}
      overscan={500}
    />
  );
};
