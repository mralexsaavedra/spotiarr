import { describe, expect, it } from "vitest";
import { getErrorMessage, isError } from "./error.utils";

describe("isError", () => {
  it("returns true for an Error instance", () => {
    expect(isError(new Error("oops"))).toBe(true);
  });

  it("returns true for a subclass of Error", () => {
    expect(isError(new TypeError("type"))).toBe(true);
    expect(isError(new RangeError("range"))).toBe(true);
  });

  it("returns false for a plain string", () => {
    expect(isError("something went wrong")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isError(42)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isError(undefined)).toBe(false);
  });

  it("returns false for a plain object without prototype chain to Error", () => {
    expect(isError({ message: "not an error" })).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("returns the message from an Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the message from an Error subclass", () => {
    expect(getErrorMessage(new TypeError("bad type"))).toBe("bad type");
  });

  it("returns the string directly when the error is a string", () => {
    expect(getErrorMessage("network failure")).toBe("network failure");
  });

  it("returns the message property from an object that has one", () => {
    expect(getErrorMessage({ message: "custom object error" })).toBe("custom object error");
  });

  it("coerces a non-string message property to string", () => {
    expect(getErrorMessage({ message: 404 })).toBe("404");
  });

  it("returns 'Unknown error' for null", () => {
    expect(getErrorMessage(null)).toBe("Unknown error");
  });

  it("returns 'Unknown error' for undefined", () => {
    expect(getErrorMessage(undefined)).toBe("Unknown error");
  });

  it("returns 'Unknown error' for a number", () => {
    expect(getErrorMessage(42)).toBe("Unknown error");
  });

  it("returns 'Unknown error' for a plain object without a message property", () => {
    expect(getErrorMessage({ code: 500 })).toBe("Unknown error");
  });
});
