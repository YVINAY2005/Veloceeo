// // src/middleware/errorHandler.ts
// import { Request, Response, NextFunction } from 'express';
// import { ZodError } from 'zod';
// import { Prisma } from '@prisma/client';
// import { config } from '../config/index';
// import AppError from '../utils/AppError';

// // Handle Zod validation errors
// const handleZodError = (err: ZodError): AppError => {
//   const errors = err.errors.map((el) => el.message).join('. ');
//   const message = `Invalid input data. ${errors}`;
//   return new AppError(message, 400);
// };

// // Handle Prisma unique constraint errors (P2002)
// const handlePrismaP2002Error = (err: any): AppError => {
//   const field = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(', ') : 'field';
//   const message = `A record with this ${field} already exists.`;
//   return new AppError(message, 409);
// };

// // Handle Prisma "record not found" errors (P2025)
// const handlePrismaP2025Error = (): AppError => {
//   return new AppError('The requested record was not found.', 404);
// };

// // Type guard for Prisma errors
// const isPrismaError = (err: any): err is { code: string; meta?: any } => {
//   return err && typeof err.code === 'string' && err.code.startsWith('P');
// };

// // Global error handler
// export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
//   let error = { ...err };
//   error.message = err.message;

//   if (err instanceof ZodError) {
//     error = handleZodError(err);
//   } else if (isPrismaError(err)) {
//     if (err.code === 'P2002') error = handlePrismaP2002Error(err);
//     if (err.code === 'P2025') error = handlePrismaP2025Error();
//   }

//   const statusCode = error.statusCode || 500;
//   const status = error.status || 'error';

//   console.error('ERROR 💥', error);

//   res.status(statusCode).json({
//     status,
//     message: error.message,
//     ...(config.NODE_ENV === 'development' && { stack: err.stack }),
//   });
// };
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from '../config/index';
import AppError from '../utils/AppError';

// Handle Zod validation errors
const handleZodError = (err: ZodError): AppError => {
  const errors = err.errors.map((el) => el.message).join('. ');
  const message = `Invalid input data. ${errors}`;
  return new AppError(message, 400);
};

// Handle Prisma unique constraint errors (P2002)
const handlePrismaP2002Error = (err: any): AppError => {
  const field = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(', ') : 'field';
  const message = `A record with this ${field} already exists.`;
  return new AppError(message, 409);
};

// Handle Prisma "record not found" errors (P2025)
const handlePrismaP2025Error = (): AppError => {
  return new AppError('The requested record was not found.', 404);
};

// Type guard for Prisma errors
const isPrismaError = (err: any): err is { code: string; meta?: any } => {
  return err && typeof err.code === 'string' && err.code.startsWith('P');
};

// Global error handler
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // DON'T use spread operator - it loses Error properties!
  let error = err;

  // Transform specific error types into AppError
  if (err instanceof ZodError) {
    error = handleZodError(err);
  } else if (isPrismaError(err)) {
    if (err.code === 'P2002') error = handlePrismaP2002Error(err);
    if (err.code === 'P2025') error = handlePrismaP2025Error();
  }

  // Extract status code and status, with defaults
  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  const message = error.message || 'Something went wrong';

  if (statusCode !== 401) {
    console.error('ERROR 💥', {
      statusCode,
      status,
      message,
      isOperational: error.isOperational,
    });
  }

  // ALWAYS return JSON, never HTML
  res.status(statusCode).json({
    status,
    message,
    ...(config.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: {
        name: err.name,
        code: err.code,
      }
    }),
  });
};