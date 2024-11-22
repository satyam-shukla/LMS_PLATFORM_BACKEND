import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";

export const ErrorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Something went wrong";

  // Wrong MongoDB Id error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandler(message, 400);
  }

  // JWT expired error
  if (err.name === "TokenExpiredError") {
    const message = "Your token has expired. Please try again.";
    err = new ErrorHandler(message, 401);
  }

  // JWT invalid token error
  if (err.name === "JsonWebTokenError") {
    const message = "Your token is not valid. Please try again.";
    err = new ErrorHandler(message, 401);
  }

  // Generic error for other JWT related issues
  // You can add more specific checks here if necessary.

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
