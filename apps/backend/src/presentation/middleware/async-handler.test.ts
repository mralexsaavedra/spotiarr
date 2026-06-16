import type { NextFunction, Request, Response } from "express";
import { describe, it, expect, vi } from "vitest";
import { asyncHandler } from "./async-handler";

function makeTriple() {
  const req = {} as Request;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe("asyncHandler", () => {
  it("invokes the wrapped handler with req, res, next", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { req, res, next } = makeTriple();

    await asyncHandler(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it("does not call next when handler resolves successfully", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const { req, res, next } = makeTriple();

    await asyncHandler(handler)(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });

  it("forwards rejection to next when handler rejects", async () => {
    const error = new Error("async failure");
    const handler = vi.fn().mockRejectedValue(error);
    const { req, res } = makeTriple();

    // The wrapper catches the rejection and calls next — no unhandled rejection
    await new Promise<void>((resolve) => {
      const wrappedNext = vi.fn((err) => {
        expect(err).toBe(error);
        resolve();
      }) as unknown as NextFunction;

      asyncHandler(handler)(req, res, wrappedNext);
    });
  });

  it("forwards rejection to next for custom error types", async () => {
    class CustomError extends Error {
      statusCode = 422;
    }
    const error = new CustomError("validation failed");
    const handler = vi.fn().mockRejectedValue(error);
    const { req, res } = makeTriple();

    await new Promise<void>((resolve) => {
      const wrappedNext = vi.fn((err) => {
        expect(err).toBeInstanceOf(CustomError);
        expect(err.statusCode).toBe(422);
        resolve();
      }) as unknown as NextFunction;

      asyncHandler(handler)(req, res, wrappedNext);
    });
  });
});
