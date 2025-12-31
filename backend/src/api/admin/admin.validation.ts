// src/api/admin/admin.validation.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import AppError from '../../utils/AppError';

/**
 * Schemas aligned to your Prisma schema:
 * - Admin: { email, password, name? }
 * - Seller: { email, password, business_name, name?, phone?, gst_number? }
 */

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).optional(),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const createSellerSchema = z.object({
  // Seller model requires email and password and business_name per schema
  email: z.string().email({ message: 'Invalid seller email' }),
  password: z.string().min(6, { message: 'Seller password must be at least 6 characters' }),
  business_name: z.string().min(1, { message: 'Business name is required' }),
  // optional profile fields
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  gst_number: z.string().optional(),
});

/**
 * Helper: parse zod schema and throw AppError on failure
 */
function parseZod(schema: z.ZodSchema, value: unknown) {
  try {
    return schema.parse(value);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.errors.map((e) => e.message).join('. ');
      throw new AppError(messages || 'Invalid input', 400);
    }
    throw err;
  }
}

/**
 * Express middlewares
 */
export const validateSignup = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(signupSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateLogin = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(loginSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateCreateSeller = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(createSellerSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};
