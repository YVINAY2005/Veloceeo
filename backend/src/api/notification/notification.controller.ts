// src/api/notification/notification.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as service from './notification.service';
import AppError from '../../utils/AppError';

export const createNotification = async (req: Request & { userId?: string | number; role?: string }, res: Response, next: NextFunction) => {
  try {
    const actorId = req.userId;
    if (!actorId) throw new AppError('Not authenticated', 401);

    // body can be { userId?, role?, title, message, type }
    const { userId, role, title, message, type } = req.body;
    if (!title || !message) throw new AppError('title and message are required', 400);

    // Only admin/seller can send notifications (route protected by restrictTo)
    const created = await service.createNotificationService({
      userId: userId ?? null,
      role: role ?? null,
      title,
      message,
      type: type ?? 'system',
      createdBy: actorId,
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
};

export const listNotifications = async (req: Request & { userId?: string | number; role?: string }, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const role = req.role!;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);

    const result = await service.listNotificationsService({ userId, role, page, limit });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

export const markAsRead = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError('Invalid id', 400);

    const updated = await service.markAsReadService(id, userId);
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
};

export const markAllRead = async (req: Request & { userId?: string | number }, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const updatedCount = await service.markAllReadService(userId);
    return res.json({ updated: updatedCount });
  } catch (err) {
    return next(err);
  }
};
