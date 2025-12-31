// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import AppError from '../utils/AppError';
import { config } from '../config';
import { SESSION_COOKIE_NAME, renewSession } from '../utils/session';

interface DecodedToken extends JwtPayload {
  session_id?: string;
  role?: 'customer' | 'seller' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      userId?: number | string;
      role?: 'customer' | 'seller' | 'admin';
      sessionId?: string;
      user?: any;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    
    // Check Authorization header first
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Then check cookies
    else if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
      token = req.cookies[SESSION_COOKIE_NAME];
    }

    if (!token) return next(new AppError('Not logged in. Please login.', 401));

    const decoded = jwt.verify(token, config.JWT_SECRET as string) as DecodedToken;
    if (!decoded?.session_id) return next(new AppError('Invalid token payload', 401));

    const session = await prisma.session.findUnique({ where: { session_id: decoded.session_id } });
    if (!session) return next(new AppError('Invalid session. Please login again.', 401));
    
    if (new Date(session.expires_at) < new Date()) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return next(new AppError('Session expired. Please login again.', 401));
    }

    // --- Session Renewal Mechanism ---
    // If the session is still valid, we extend its expiration by another 24h
    // This keeps active users logged in.
    const updatedSession = await renewSession(session.session_id);
    
    // Update the cookie expiration in the browser
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: updatedSession.expires_at,
    });

    let account: any = null;
    let role: 'customer' | 'seller' | 'admin' = decoded.role ?? 'customer';

    if (session.customer_id) {
      account = await prisma.customer.findUnique({ where: { id: session.customer_id } });
      role = 'customer';
      req.userId = account?.id;
    } else if (session.seller_id) {
      account = await prisma.seller.findUnique({ where: { id: session.seller_id } });
      role = 'seller';
      req.userId = account?.id;
    } else if (session.admin_id) {
      account = await prisma.admin.findUnique({ where: { id: session.admin_id } });
      role = 'admin';
      req.userId = account?.id;
    }

    if (!account) return next(new AppError('Account linked to this session does not exist.', 401));

    req.role = role;
    req.user = account;
    req.sessionId = session.session_id;
    (req as any).sessionData = {
      customer_id: session.customer_id,
      seller_id: session.seller_id,
      admin_id: session.admin_id
    };
    
    // DEBUG: Detailed log for seller routes
    if (req.path.includes('/seller')) {
      console.log(`🔐 [DEBUG AUTH] Path: ${req.path}, Role: ${req.role}, UserId: ${req.userId}, SessionID: ${session.session_id}`);
    } else {
      console.log(`🔐 Auth Success: user=${req.userId}, role=${req.role}, path=${req.path}`);
    }
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return next(new AppError('Invalid token. Please login again.', 401));
    }
    next(err);
  }
};

export const restrictTo = (...roles: Array<'admin' | 'seller' | 'customer'>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.path.includes('/seller')) {
      console.log(`🔐 [DEBUG RESTRICT] Path: ${req.path}, Required: ${roles}, Current Role: ${req.role}`);
    } else {
      console.log(`🔐 Restricting to roles: ${roles}. Current role: ${req.role}`);
    }

    if (!req.role || !roles.includes(req.role)) {
      console.log(`🚫 Access Denied: role=${req.role}, required=${roles}, path=${req.path}`);
      console.log(`🔍 Session Data:`, (req as any).sessionData);
      console.log(`🔍 Headers:`, JSON.stringify(req.headers, null, 2));
      return next(new AppError(`Access denied. Role ${req.role} is not authorized for this resource.`, 403));
    }
    
    if (req.path.includes('/seller')) {
      console.log(`✅ [DEBUG GRANTED] Path: ${req.path}, Role: ${req.role}`);
    } else {
      console.log(`✅ Access Granted for role: ${req.role}`);
    }
    next();
  };
};
