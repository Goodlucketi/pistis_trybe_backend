import { Request, Response, NextFunction, ErrorRequestHandler } from "express";

export interface CustomError extends Error {
  status?: number;
  code?: string;
}

export const createError = (
  message: string,
  statusCode: number,
  specialCodeMessage?: string[],
) => ({
  message,
  statusCode,
  specialCodeMessage,
  timestamp: new Date(),
  isOperational: true,
});

export const createUnknownError = (error: any) => ({
  message: `Something went wrong: ${error.message || "Unknown error"}`,
  statusCode: error.statusCode || 500,
  timestamp: new Date(),
  details: error.stack || error.message,
  isOperational: false,
});

export const withControllerErrorHandling = (
  fn: (...args: any[]) => Promise<any>,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

export const withServiceErrorHandling = (
  fn: (...args: any[]) => Promise<any>,
) => {
  return async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      console.error("Service error:", error.message);
      throw error;
    }
  };
};

// Normalize known error types into clean operational errors
const normalizeError = (err: any): any => {
  // Already a clean operational error
  if (err.isOperational) return err;

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    return createError(
      `Invalid value for field "${err.path}". Please check your request.`,
      400,
    );
  }

  // Mongoose ValidationError
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    return createError(messages.join(", "), 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return createError(
      `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`,
      409,
    );
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return createError("Invalid token. Please login again.", 401);
  }
  if (err.name === "TokenExpiredError") {
    return createError("Session expired. Please login again.", 401);
  }

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return createError("File too large. Maximum size is 10MB.", 400);
  }

  // Generic fallback
  return createUnknownError(err);
};

export const globalErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): any => {
  const normalizedError = normalizeError(err);

  if (!normalizedError.isOperational) {
    console.error("❌ Unexpected Error:", err);
  }

  return res.status(normalizedError.statusCode || 500).json({
    status: "error",
    message: normalizedError.message,
    timestamp: normalizedError.timestamp || new Date(),
    ...(normalizedError.specialCodeMessage && {
      specialCodeMessage: normalizedError.specialCodeMessage,
    }),
  });
};

export const processErrorHandler = () => {
  process.on("uncaughtException", (err) => {
    console.error("💥 UNCAUGHT EXCEPTION:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("💥 UNHANDLED REJECTION:", reason);
  });
};