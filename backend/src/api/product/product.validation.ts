// src/api/product/product.validation.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';

const productImageSchema = z.object({
  url: z.string().url('Invalid image URL').or(z.string().startsWith('data:image/', 'Invalid base64 image')),
  is_primary: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
});

const createProductSchema = z.object({
  store_id: z.number().int().positive('Store ID is required'),
  category_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(1, 'Price must be at least 1 cent'),
  currency: z.string().default('INR').optional(),
  stock_quantity: z.number().int().min(0, 'Stock quantity cannot be negative').optional(),
  brand: z.string().nullable().optional(),
  images: z.array(productImageSchema).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed'),
  is_active: z.boolean().default(true).optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/).optional(),
  sku: z.string().min(3).optional(),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().min(1).optional(),
  stock_quantity: z.number().int().min(0).optional(),
  category_id: z.number().int().positive().nullable().optional(),
  brand: z.string().nullable().optional(),
  images: z.array(productImageSchema).min(1).max(10).optional(),
  is_active: z.boolean().optional(),
});

const updateStockSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

export const validateCreateProduct = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};

export const validateUpdateProduct = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};

export const validateUpdateStock = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = updateStockSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};