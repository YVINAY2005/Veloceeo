// src/api/seller/seller.validation.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import AppError from '../../utils/AppError';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  business_name: z.string().min(1, { message: 'business_name required' }),
  gst_number: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email' }).optional(),
  sellerId: z.string().optional(),
  password: z.string().optional(),
}).refine(data => {
  // If email is provided, password must be provided
  if (data.email) return !!data.password;
  // If sellerId is provided, password is optional (ID-only login)
  if (data.sellerId) return true;
  return false;
}, {
  message: "Either email with password or sellerId must be provided",
  path: ["email"]
});

const createStoreSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

const productImageSchema = z.object({
  url: z.string().url('Invalid image URL').or(z.string().startsWith('data:image/', 'Invalid base64 image')),
  is_primary: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
});

const createProductSchema = z.object({
  store_id: z.number(),
  name: z.string().min(2),
  slug: z.string().min(2),
  sku: z.string().min(1),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().min(0),
  currency: z.string().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  category_id: z.number().optional().nullable(),
  images: z.array(productImageSchema).min(1, 'At least one image is required'),
  brand: z.string().optional().nullable(),
});

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().min(0).optional(),
  stock_quantity: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  category_id: z.number().optional().nullable(),
  images: z.array(productImageSchema).min(1).optional(),
  brand: z.string().optional().nullable(),
});

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

export const validateCreateStore = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(createStoreSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateCreateProduct = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(createProductSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateUpdateProduct = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(updateProductSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};
