// src/api/customer/customer.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as customerService from './customer.service';
import AppError from '../../utils/AppError';
import { SESSION_COOKIE_NAME } from '../../utils/session';

/* 🔥 FIXED: Removed custom type annotations - use global Request type */

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await customerService.signupService(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, expiresAt, user } = await customerService.loginService({
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

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await customerService.logoutService(req.sessionId);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);
    const resetToken = await customerService.forgotPasswordService(email);
    // In a real application, you would send this token via email
    // For now, we'll just return it in the response for testing/development
    return res.status(200).json({ message: 'Password reset token generated', resetToken });
  } catch (err) {
    return next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!token || !password) throw new AppError('Token and new password are required', 400);
    const result = await customerService.resetPasswordService(token, password);
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🔥 Convert to number (customers have numeric IDs)
    const uid = Number(req.userId);
    if (!uid || isNaN(uid)) throw new AppError('Not authenticated', 401);
    const user = await customerService.getMeService(uid);
    return res.json(user);
  } catch (err) {
    return next(err);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🔥 Convert to number (customers have numeric IDs)
    const uid = Number(req.userId);
    if (!uid || isNaN(uid)) throw new AppError('Not authenticated', 401);
    const updated = await customerService.updateMeService(uid, req.body);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
};

// Orders
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🔥 Convert to number (customers have numeric IDs)
    const uid = Number(req.userId);
    if (!uid || isNaN(uid)) throw new AppError('Not authenticated', 401);
    const payload = req.body;
    const result = await customerService.createOrderService(uid, payload);
    // return payment record summary; front-end will use this to initiate payment flow
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 🔥 Convert to number (customers have numeric IDs)
    const uid = Number(req.userId);
    if (!uid || isNaN(uid)) throw new AppError('Not authenticated', 401);
    const paymentId = Number(req.params.id);
    if (Number.isNaN(paymentId)) throw new AppError('Invalid id', 400);
    const payment = await customerService.getOrderService(uid, paymentId);
    return res.json(payment);
  } catch (err) {
    return next(err);
  }
};

// Demo login for customer (non-production)
export const demoLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Demo endpoint disabled in production' });
    }
    const { token, expiresAt, user } = await customerService.demoLoginService({
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

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
