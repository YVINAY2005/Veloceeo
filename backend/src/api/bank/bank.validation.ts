import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';

const bankSchema = z.object({
  bank_name: z.string().min(3, 'Bank name is required'),
  account_number: z.string().min(5, 'Account number is required'),
  ifsc_code: z.string().min(5, 'IFSC code is required'),
  is_primary: z.boolean().optional(),
});

export const validateBank = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = bankSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};
