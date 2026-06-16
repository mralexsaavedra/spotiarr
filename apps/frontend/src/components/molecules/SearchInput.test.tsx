import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders with the provided value", () => {
    render(<SearchInput value="hello" onChange={vi.fn()} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("hello");
  });

  it("renders with the default placeholder", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("Search...")).not.toBeNull();
  });

  it("renders with a custom placeholder", () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Find an artist..." />);

    expect(screen.getByPlaceholderText("Find an artist...")).not.toBeNull();
  });

  it("calls onChange with the new value when the input changes", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "daft punk" } });

    expect(onChange).toHaveBeenCalledWith("daft punk");
  });

  it("calls onSearch when Enter key is pressed and onSearch is provided", () => {
    const onSearch = vi.fn();
    render(<SearchInput value="query" onChange={vi.fn()} onSearch={onSearch} />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("does not throw when Enter is pressed without onSearch", () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    const input = screen.getByRole("textbox");
    expect(() => fireEvent.keyDown(input, { key: "Enter" })).not.toThrow();
  });

  it("does not call onSearch when a key other than Enter is pressed", () => {
    const onSearch = vi.fn();
    render(<SearchInput value="" onChange={vi.fn()} onSearch={onSearch} />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "a" });

    expect(onSearch).not.toHaveBeenCalled();
  });
});
