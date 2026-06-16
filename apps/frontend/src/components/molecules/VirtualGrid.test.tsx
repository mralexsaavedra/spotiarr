import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VirtualGrid } from "./VirtualGrid";

// react-virtuoso uses ResizeObserver internally
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Virtuoso to render rows directly (no virtualization in jsdom)
vi.mock("react-virtuoso", () => ({
  Virtuoso: <T,>({
    data,
    itemContent,
    components,
  }: {
    data: T[];
    itemContent: (index: number, item: T) => ReactNode;
    components?: { Footer?: () => ReactNode };
  }) => (
    <div data-testid="virtuoso">
      {data.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
      {components?.Footer && <components.Footer />}
    </div>
  ),
}));

// useGridColumns uses window.innerWidth — default jsdom width is 0 → MOBILE columns (2)
vi.mock("@/hooks/useGridColumns", () => ({
  useGridColumns: () => 2,
}));

interface Item {
  id: string;
  name: string;
}

const items: Item[] = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
  { id: "3", name: "Gamma" },
  { id: "4", name: "Delta" },
];

describe("VirtualGrid", () => {
  it("renders all items", () => {
    render(
      <VirtualGrid
        items={items}
        renderItem={(item) => <span>{item.name}</span>}
        itemKey={(item) => item.id}
      />,
    );

    expect(screen.getByText("Alpha")).not.toBeNull();
    expect(screen.getByText("Beta")).not.toBeNull();
    expect(screen.getByText("Gamma")).not.toBeNull();
    expect(screen.getByText("Delta")).not.toBeNull();
  });

  it("renders the emptyState when items is empty", () => {
    render(
      <VirtualGrid
        items={[]}
        renderItem={(item: Item) => <span>{item.name}</span>}
        itemKey={(item: Item) => item.id}
        emptyState={<div>Nothing here</div>}
      />,
    );

    expect(screen.getByText("Nothing here")).not.toBeNull();
  });

  it("does not render emptyState when items are present", () => {
    render(
      <VirtualGrid
        items={items}
        renderItem={(item) => <span>{item.name}</span>}
        itemKey={(item) => item.id}
        emptyState={<div>Nothing here</div>}
      />,
    );

    expect(screen.queryByText("Nothing here")).toBeNull();
  });

  it("renders the footer when provided", () => {
    render(
      <VirtualGrid
        items={items}
        renderItem={(item) => <span>{item.name}</span>}
        itemKey={(item) => item.id}
        footer={<div>Load more</div>}
      />,
    );

    expect(screen.getByText("Load more")).not.toBeNull();
  });

  it("groups items into rows based on column count", () => {
    // With 2 columns and 4 items, we expect 2 rows (grid divs)
    const { container } = render(
      <VirtualGrid
        items={items}
        renderItem={(item) => <span>{item.name}</span>}
        itemKey={(item) => item.id}
      />,
    );

    const rows = container.querySelectorAll(".grid");
    expect(rows.length).toBe(2);
  });
});
