import type { ApiErrorCode, ApiErrorShape } from "@spotiarr/shared";
import { NextFunction, Request, Response } from "express";
import { AppError } from "@/domain/errors/app-error";
import { logger } from "@/infrastructure/logging/logger";

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error({ component: "error-handler", err: error }, "Unhandled error");

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
