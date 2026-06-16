import { describe, expect, it } from "vitest";
import { AppError } from "./app-error";

describe("AppError", () => {
  it("is an instance of Error", () => {
    const err = new AppError(400, "invalid_spotify_url");
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of AppError", () => {
    const err = new AppError(400, "invalid_spotify_url");
    expect(err).toBeInstanceOf(AppError);
  });

  it("assigns statusCode correctly", () => {
    const err = new AppError(404, "invalid_spotify_url");
    expect(err.statusCode).toBe(404);
  });

  it("assigns errorCode correctly", () => {
    const err = new AppError(400, "internal_server_error");
    expect(err.errorCode).toBe("internal_server_error");
  });

  it("defaults message to errorCode when no message is provided", () => {
    const err = new AppError(400, "invalid_spotify_url");
    expect(err.message).toBe("invalid_spotify_url");
  });

  it("uses the provided message when given", () => {
    const err = new AppError(400, "invalid_spotify_url", "Custom error message");
    expect(err.message).toBe("Custom error message");
  });

  it("defaults isOperational to true", () => {
    const err = new AppError(500, "internal_server_error");
    expect(err.isOperational).toBe(true);
  });

  it("allows isOperational to be set to false", () => {
    const err = new AppError(500, "internal_server_error", "Fatal error", false);
    expect(err.isOperational).toBe(false);
  });

  it("has the standard Error name", () => {
    const err = new AppError(400, "invalid_spotify_url");
    expect(err.name).toBe("Error");
  });
});
