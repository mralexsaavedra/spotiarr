import type { NextFunction, Request, Response } from "express";
import { describe, it, expect, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { errorHandler } from "./error-handler";

function makeRes(): Response {
  const json = vi.fn().mockReturnThis();
  const status = vi.fn().mockReturnThis();
  return { json, status } as unknown as Response;
}

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

describe("errorHandler", () => {
  describe("AppError instances", () => {
    it("uses AppError.statusCode and errorCode in the response", () => {
      const error = new AppError(422, "validation_error", "Field is required");
      const res = makeRes();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "validation_error", message: "Field is required" }),
      );
    });

    it("omits message when it equals the errorCode", () => {
      // AppError with no explicit message defaults to errorCode as the message
      const error = new AppError(404, "playlist_not_found");
      const res = makeRes();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      const payload = vi.mocked(res.json).mock.calls[0][0];
      expect(payload.error).toBe("playlist_not_found");
      // message should NOT be present (shouldIncludeMessage = false because message === errorCode)
      expect(payload).not.toHaveProperty("message");
    });

    it("includes message when it differs from errorCode", () => {
      const error = new AppError(403, "playlist_not_accessible", "You cannot access this resource");
      const res = makeRes();

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "You cannot access this resource" }),
      );
    });

    it("maps a 503 AppError correctly", () => {
      const error = new AppError(503, "circuit_open", "Downstream service down");
      const res = makeRes();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "circuit_open" }));
    });
  });

  describe("generic Error (non-AppError)", () => {
    it("uses status 500 and internal_server_error code", () => {
      const error = new Error("unexpected crash");
      const res = makeRes();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "internal_server_error",
        message: "Internal Server Error",
      });
    });

    it("returns the same 500 shape for unknown thrown values coerced to Error", () => {
      const error = Object.assign(new Error("boom"), { extra: "data" });
      const res = makeRes();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      const payload = vi.mocked(res.json).mock.calls[0][0];
      expect(payload.error).toBe("internal_server_error");
      expect(payload.message).toBe("Internal Server Error");
    });
  });
});
