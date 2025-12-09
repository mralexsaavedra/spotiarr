import type { ApiErrorCode, ApiErrorShape } from "@spotiarr/shared";
import { Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: ApiErrorCode,
    message?: string,
    public isOperational = true,
  ) {
    super(message || errorCode);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (error: Error | AppError, req: Request, res: Response) => {
  console.error("Error:", error);

  const isAppError = error instanceof AppError;

  const statusCode = isAppError ? error.statusCode : 500;
  const errorCode: ApiErrorCode = isAppError ? error.errorCode : "internal_server_error";
  const message = isAppError ? error.message : "Internal Server Error";

  const shouldIncludeMessage = isAppError && message !== errorCode;

  const payload: ApiErrorShape = {
    error: errorCode,
    ...(shouldIncludeMessage && { message }),
    ...(!isAppError && { message: "Internal Server Error" }),
  };

  res.status(statusCode).json(payload);
};
