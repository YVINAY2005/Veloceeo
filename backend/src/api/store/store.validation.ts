// src/api/store/store.validation.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';

const storeSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z0-9-_]+$/, 'Slug must contain only lowercase letters, numbers, hyphens, and underscores'),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const validateStore = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};