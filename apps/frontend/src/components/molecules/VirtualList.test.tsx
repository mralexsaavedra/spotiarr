import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { VirtualList } from "./VirtualList";

// react-virtuoso uses IntersectionObserver and ResizeObserver internally
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Virtuoso to render items directly (no virtualization in jsdom)
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

interface Item {
  id: string;
  name: string;
}

const items: Item[] = [
  { id: "1", name: "Item One" },
  { id: "2", name: "Item Two" },
  { id: "3", name: "Item Three" },
];

describe("VirtualList", () => {
  it("renders all items", () => {
    render(
      <VirtualList
        items={items}
        renderItem={(item) => <span>{item.name}</span>}
        itemKey={(item) => item.id}
      />,
    );

    expect(screen.getByText("Item One")).not.toBeNull();
    expect(screen.getByText("Item Two")).not.toBeNull();
    expect(screen.getByText("Item Three")).not.toBeNull();
  });

  it("renders the emptyState when items is empty", () => {
    render(
      <VirtualList
        items={[]}
        renderItem={(item: Item) => <span>{item.name}</span>}
        emptyState={<div>No results</div>}
      />,
    );

    expect(screen.getByText("No results")).not.toBeNull();
  });

  it("does not render emptyState when items is empty but emptyState is not provided", () => {
    const { container } = render(
      <VirtualList items={[]} renderItem={(item: Item) => <span>{item.name}</span>} />,
    );

    expect(container.querySelector("[data-testid='virtuoso']")).not.toBeNull();
  });

  it("renders footer when provided", () => {
    render(
      <VirtualList
        items={items}
        renderItem={(item) => <span>{item.name}</span>}
        footer={<div>Load more</div>}
      />,
    );

    expect(screen.getByText("Load more")).not.toBeNull();
  });

  it("passes index to renderItem", () => {
    const renderItem = vi.fn((item: Item, index: number) => <span>{`${index}:${item.name}`}</span>);
    render(<VirtualList items={[items[0]]} renderItem={renderItem} />);

    expect(screen.getByText("0:Item One")).not.toBeNull();
  });
});
