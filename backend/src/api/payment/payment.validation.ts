// simple zod validation
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import AppError from '../../utils/AppError';

const initiateSchema = z.object({
  items: z.array(z.object({ productId: z.number(), qty: z.number().int().min(1) })).min(1),
  shipping: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
  paymentMethod: z.string().optional(),
});

function parse(schema: z.ZodSchema, value: unknown) {
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

export const validateInitiatePayment = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parse(initiateSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};
