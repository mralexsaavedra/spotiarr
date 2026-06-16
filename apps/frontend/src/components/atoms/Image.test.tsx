import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Image } from "./Image";

describe("Image", () => {
  it("renders an img element when src is provided", () => {
    render(<Image src="https://example.com/photo.jpg" alt="Test image" />);
    expect(screen.getByRole("img", { name: "Test image" })).toBeTruthy();
  });

  it("renders fallback icon when src is empty string", () => {
    const { container } = render(<Image src="" alt="No image" />);
    // No img element — renders a div with a FontAwesome svg icon
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders fallback icon when src is undefined", () => {
    const { container } = render(<Image alt="No image" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders fallback icon after image load error", () => {
    const { container } = render(<Image src="https://example.com/broken.jpg" alt="Broken image" />);
    const img = screen.getByRole("img");
    fireEvent.error(img);
    // After error the img is replaced by the fallback div
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("image starts with opacity-0 and becomes opacity-100 after load", () => {
    render(<Image src="https://example.com/photo.jpg" alt="Photo" />);
    const img = screen.getByRole("img");
    expect(img.className).toContain("opacity-0");
    fireEvent.load(img);
    expect(img.className).toContain("opacity-100");
  });

  it("applies className to the img element", () => {
    render(<Image src="https://example.com/photo.jpg" alt="Photo" className="rounded-full" />);
    expect(screen.getByRole("img").className).toContain("rounded-full");
  });

  it("applies wrapperClassName to the wrapper div", () => {
    const { container } = render(
      <Image src="https://example.com/photo.jpg" alt="Photo" wrapperClassName="my-wrapper" />,
    );
    expect(container.firstChild).toBeTruthy();
    expect((container.firstChild as HTMLElement).className).toContain("my-wrapper");
  });
});
