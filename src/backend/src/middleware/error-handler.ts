import type { ApiErrorCode, ApiErrorShape } from "@spotiarr/shared";
import { Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (error: Error | AppError, req: Request, res: Response) => {
  console.error("Error:", error);

  const isAppError = error instanceof AppError;

  const statusCode =
    isAppError && (error as AppError).statusCode ? (error as AppError).statusCode : 500;

  let errorCode: ApiErrorCode;
  let message: string | undefined;

  if (isAppError) {
    errorCode = (error.message as ApiErrorCode) || "internal_server_error";
  } else {
    errorCode = "internal_server_error";
    message = "Internal Server Error";
  }

  const payload: ApiErrorShape = {
    error: errorCode,
    ...(message && { message }),
  };

  res.status(statusCode).json(payload);
};
