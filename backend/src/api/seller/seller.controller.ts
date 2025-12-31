// src/api/seller/seller.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as sellerService from './seller.service';
import AppError from '../../utils/AppError';
import { SESSION_COOKIE_NAME } from '../../utils/session';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sellerService.signupService(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, expiresAt, user } = await sellerService.loginService({
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
    await sellerService.logoutService(req.sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sid = String(req.userId);
    if (!sid) throw new AppError('Not authenticated', 401);
    const user = await sellerService.getMeService(sid);
    return res.json(user);
  } catch (err) {
    return next(err);
  }
};

export const demoLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Demo endpoint disabled in production' });
    }
    const { token, expiresAt, user } = await sellerService.demoLoginService({
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    await sellerService.ensureDefaultStoreForSellerService(user.id);

    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return res.json({ token, expiresAt, user });
  } catch (err) {
    return next(err);
  }
};

// Stores
export const createStore = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    // 🔥 FIXED: Convert to String (sellers have string IDs)
    const sellerId = String(req.userId);
    if (!sellerId) throw new AppError('Not authenticated', 401);
    const store = await sellerService.createStoreService(sellerId, req.body);
    return res.status(201).json(store);
  } catch (err) {
    return next(err);
  }
};

export const listMyStores = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    // 🔥 FIXED: Convert to String
    const sellerId = String(req.userId);
    if (!sellerId) throw new AppError('Not authenticated', 401);
    const stores = await sellerService.listStoresForSellerService(sellerId);
    return res.json(stores);
  } catch (err) {
    return next(err);
  }
};

// Products
export const createProduct = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    // 🔥 FIXED: Convert to String
    const sellerId = String(req.userId);
    if (!sellerId) throw new AppError('Not authenticated', 401);
    const product = await sellerService.createProductService(sellerId, req.body);
    return res.status(201).json(product);
  } catch (err) {
    return next(err);
  }
};

export const listMyProducts = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    // 🔥 FIXED: Convert to String
    const sellerId = String(req.userId);
    if (!sellerId) throw new AppError('Not authenticated', 401);
    const products = await sellerService.listMyProductsService(sellerId);
    return res.json(products);
  } catch (err) {
    return next(err);
  }
};

export const updateProduct = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    // 🔥 FIXED: Convert to String
    const sellerId = String(req.userId);
    if (!sellerId) throw new AppError('Not authenticated', 401);
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) throw new AppError('Invalid product id', 400);
    const updated = await sellerService.updateProductService(sellerId, productId, req.body);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
};

export const deleteProduct = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    // 🔥 FIXED: Convert to String
    const sellerId = String(req.userId);
    if (!sellerId) throw new AppError('Not authenticated', 401);
    const productId = Number(req.params.id);
    if (Number.isNaN(productId)) throw new AppError('Invalid product id', 400);
    const updated = await sellerService.deleteProductService(sellerId, productId);
    return res.json({ message: 'Product deactivated', product: updated });
  } catch (err) {
    return next(err);
  }
};

// Payments/orders for seller
export const listPayments = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    // 🔥 FIXED: Convert to String
    const sellerId = String(req.userId);
    if (!sellerId) throw new AppError('Not authenticated', 401);
    const { status, provider, page = '1', limit = '50' } = req.query;
    const payments = await sellerService.listPaymentsService(sellerId, {
      status: status as string,
      provider: provider as string,
      page: Number(page),
      limit: Number(limit),
    });
    return res.json(payments);
  } catch (err) {
    return next(err);
  }
};
