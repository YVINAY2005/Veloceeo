// src/api/admin/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service';
import AppError from '../../utils/AppError';
import { SESSION_COOKIE_NAME } from '../../utils/session';

/**
 * NOTE:
 * Using explicit RequestHandler signatures avoids TS mismatches with custom catchAsync typings.
 * Each handler catches sync/async errors and forwards them to next(err).
 */

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.signupService(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, expiresAt, user } = await adminService.loginService({
      ...req.body,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return res.json({ token, expiresAt, user });
  } catch (err) {
    return next(err);
  }
};

export const logout = async (req: Request & { sessionId?: string }, res: Response, next: NextFunction) => {
  try {
    await adminService.logoutService(req.sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const aid = Number(req.userId);
    if (!aid || isNaN(aid)) throw new AppError('Not authenticated', 401);
    const user = await adminService.getMeService(aid);
    return res.json(user);
  } catch (err) {
    return next(err);
  }
};

// Seller management
export const createSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = Number(req.userId);
    const seller = await adminService.createSellerService(req.body, adminId);
    return res.status(201).json(seller);
  } catch (err) {
    return next(err);
  }
};

export const listSellers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sellers = await adminService.listSellersService();
    return res.json(sellers);
  } catch (err) {
    return next(err);
  }
};

export const getSellerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seller = await adminService.getSellerByIdService(req.params.id);
    return res.json(seller);
  } catch (err) {
    return next(err);
  }
};

export const updateSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = Number(req.userId);
    const updated = await adminService.updateSellerService(req.params.id, req.body, adminId);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
};

// User management
export const listUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await adminService.listUsersService();
    return res.json(users);
  } catch (err) {
    return next(err);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = Number(req.userId);
    const { id } = req.params;
    const { role, ...payload } = req.body;
    const updated = await adminService.updateUserService(id, role, payload, adminId);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = Number(req.userId);
    const { id } = req.params;
    const { role } = req.query; // Expecting role in query string
    await adminService.deleteUserService(id, String(role), adminId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

export const deleteSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = Number(req.userId);
    console.log(`🗑️ [ADMIN] Deleting seller: ${req.params.id} by Admin: ${adminId}`);
    await adminService.deleteSellerService(req.params.id, adminId);
    return res.status(204).send();
  } catch (err) {
    console.error(`❌ [ADMIN] Error deleting seller:`, err);
    return next(err);
  }
};

// Analytics & orders/payments
export const getAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await adminService.getAnalyticsService();
    return res.json(analytics);
  } catch (err) {
    return next(err);
  }
};

// Demo helper: create seller without auth in non-production
export const demoCreateSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Demo endpoint disabled in production' });
    }
    const seller = await adminService.createSellerService(req.body);
    return res.status(201).json(seller);
  } catch (err) {
    return next(err);
  }
};

export const demoLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Demo endpoint disabled in production' });
    }
    const { token, expiresAt, user } = await adminService.demoLoginService({
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      expires: expiresAt,
    });

    return res.json({ token, expiresAt, user });
  } catch (err) {
    return next(err);
  }
};

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, provider, from, to, page = '1', limit = '50' } = req.query;
    const orders = await adminService.getOrdersService({
      status: status ? String(status) : undefined,
      provider: provider ? String(provider) : undefined,
      from: from ? String(from) : undefined,
      to: to ? String(to) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
};
