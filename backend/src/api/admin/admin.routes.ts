// src/api/admin/admin.routes.ts
import express from 'express';
import * as controller from './admin.controller';
import { validateSignup, validateLogin, validateCreateSeller } from './admin.validation';
import { protect, restrictTo } from '../../middleware/auth.middleware';

const router = express.Router();

// existing auth endpoints
router.post('/signup', validateSignup, controller.signup);
router.post('/login', validateLogin, controller.login);
router.post('/logout', controller.logout);
router.get('/me', protect, controller.getMe);

// ----- Admin-only seller management -----
router.post('/sellers', protect, restrictTo('admin'), validateCreateSeller, controller.createSeller);
router.get('/sellers', protect, restrictTo('admin'), controller.listSellers);
router.get('/sellers/:id', protect, restrictTo('admin'), controller.getSellerById);
router.patch('/sellers/:id', protect, restrictTo('admin'), controller.updateSeller);
router.delete('/sellers/:id', protect, restrictTo('admin'), controller.deleteSeller);

// ----- Admin-only user management -----
router.get('/users', protect, restrictTo('admin'), controller.listUsers);
router.patch('/users/:id', protect, restrictTo('admin'), controller.updateUser);
router.delete('/users/:id', protect, restrictTo('admin'), controller.deleteUser);

// ----- Admin analytics & order listing -----
router.get('/analytics', protect, restrictTo('admin'), controller.getAnalytics);
router.get('/orders', protect, restrictTo('admin'), controller.getOrders); // optional: supports filters via query

// Demo route (non-production): create seller without auth
router.post('/demo/create-seller', controller.demoCreateSeller);
router.post('/demo/login', controller.demoLogin);

export default router;
