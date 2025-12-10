import { ApiErrorCode } from "@spotiarr/shared";

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
