// src/types/express.d.ts (or wherever your type definitions are)

import { Customer, Seller, Admin } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      userId?: string | number;
      role?: 'customer' | 'seller' | 'admin';
      sessionId?: string;
      user?: Customer | Seller | Admin;
      sessionData?: {
        customer_id?: number | null;
        seller_id?: string | null;
        admin_id?: number | null;
      };
    }
  }
}

export {};