// src/api/notification/notification.routes.ts
import express from 'express';
import * as controller from './notification.controller';
import { protect, restrictTo } from '../../middleware/auth.middleware';

const router = express.Router();

// Create notification (admin or seller) -- create for a specific user or role
router.post('/', protect, restrictTo('admin', 'seller'), controller.createNotification);

// Get notifications for current user (customer | seller | admin)
router.get('/', protect, controller.listNotifications);

// Mark single notification as read
router.patch('/:id/read', protect, controller.markAsRead);

// Mark all notifications as read
router.patch('/read-all', protect, controller.markAllRead);

export default router;
