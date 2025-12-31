// src/api/customer/customer.routes.ts
import express from 'express';
import * as controller from './customer.controller';
import { validateSignup, validateLogin, validateUpdateMe, validateCreateOrder } from './customer.validation';
import { protect } from '../../middleware/auth.middleware';

const router = express.Router();

// Public
router.post('/signup', validateSignup, controller.signup);
router.post('/login', validateLogin, controller.login);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password/:token', controller.resetPassword);

// Protected
router.post('/logout', controller.logout);
router.get('/me', protect, controller.getMe);
router.patch('/me', protect, validateUpdateMe, controller.updateMe);

// Orders (use Payment model as order store)
router.post('/orders/create', protect, validateCreateOrder, controller.createOrder);
router.get('/orders/:id', protect, controller.getOrder);

// Demo login (non-production)
router.post('/demo/login', controller.demoLogin);

export default router;
