// src/api/customer/customer.validation.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import AppError from '../../utils/AppError';

const signupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
});

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.number(),
      quantity: z.number().int().min(1),
    })
  ).min(1),
  shipping: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
  paymentMethod: z.string().optional(), // e.g., 'online' | 'cod'
});

function parseZod(schema: any, value: any) {
  try {
    return schema.parse(value);
  } catch (err: any) {
    const messages = (err?.errors || []).map((e: any) => e.message).join('. ');
    throw new AppError(messages || 'Invalid input', 400);
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

export const validateUpdateMe = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(updateMeSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateCreateOrder = (req: Request, _res: Response, next: NextFunction) => {
  try {
    parseZod(createOrderSchema, req.body);
    next();
  } catch (err) {
    next(err);
  }
};
