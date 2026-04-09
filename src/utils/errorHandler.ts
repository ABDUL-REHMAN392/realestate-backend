import { Request, Response, NextFunction } from "express";

// =============================================
// Custom Error Class
// =============================================
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================
// Mongoose / JWT Error Converter
// =============================================
export const handleMongooseErrors = (err: AppError): AppError => {
  const e = err as AppError & {
    code?: number;
    keyValue?: Record<string, unknown>;
    name: string;
  };

  if (e.code === 11000 && e.keyValue) {
    const field = Object.keys(e.keyValue)[0];
    return new AppError(`This ${field} is already in use`, 409);
  }
  if (e.name === "ValidationError") return new AppError(e.message, 400);
  if (e.name === "CastError") return new AppError("Invalid ID format", 400);
  if (e.name === "JsonWebTokenError")
    return new AppError("Invalid token. Please log in again", 401);
  if (e.name === "TokenExpiredError")
    return new AppError("Your session has expired. Please log in again", 401);
  return err;
};

// =============================================
// Global Error Handler
// =============================================
export const globalErrorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === "development") {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
    return;
  }

  if (err.isOperational) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  console.error("UNKNOWN ERROR:", err);
  res
    .status(500)
    .json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
};

// =============================================
// Async Wrapper — no try/catch needed
// =============================================
export const catchAsync =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
