// src/types/express.d.ts (or wherever your type definitions are)

import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string | number; // 🔥 FIXED: Support both string (seller) and number (customer/admin)
    role?: 'customer' | 'seller' | 'admin';
    sessionId?: string;
  }
}