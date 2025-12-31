// // src/api/support/support.validation.ts
// import { z } from 'zod';

// export const createTicketSchema = z.object({
//   body: z.object({
//     subject: z
//       .string({ required_error: 'Subject is required' })
//       .min(1, 'Subject cannot be empty'),
//     description: z
//       .string({ required_error: 'Description is required' })
//       .min(1, 'Description cannot be empty'),
//     contact_email: z
//       .string({ required_error: 'Contact email is required' })
//       .email('Invalid email address'),
//     category: z.enum(['Technical', 'Billing', 'Other'], {
//       required_error: 'Category is required',
//     }),
//     priority: z.enum(['Low', 'Medium', 'High']).optional(),
//     contact_name: z.string().optional(),
//     contact_phone: z.string().optional(),
//     // Add other optional fields here
//   }),
// });
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';

const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject is required'),
  description: z.string().min(5, 'Description is required'),
  priority: z.string().optional(),
});

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
});

const statusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const validateCreateTicket = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};

export const validateMessage = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};

export const validateStatusUpdate = (req: Request, _res: Response, next: NextFunction) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join('; ');
    return next(new AppError(msg, 400));
  }
  next();
};
