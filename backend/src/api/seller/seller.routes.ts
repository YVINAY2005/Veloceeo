// src/api/seller/seller.routes.ts
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './seller.controller';
import { validateSignup, validateLogin, validateCreateStore, validateCreateProduct, validateUpdateProduct } from './seller.validation';
import { protect, restrictTo } from '../../middleware/auth.middleware';

const router = express.Router();

// Specific rate limiter for login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// public auth
router.post('/signup', validateSignup, controller.signup);
router.post('/login', loginLimiter, validateLogin, controller.login);

// protected
router.post('/logout', controller.logout);
router.get('/me', protect, controller.getMe);

// Demo login (non-production)
router.post('/demo/login', controller.demoLogin);

// seller-only routes
router.use(protect, restrictTo('seller'));

// Stores
router.post('/stores', validateCreateStore, controller.createStore);
router.get('/stores', controller.listMyStores);

// Products
router.post('/products', validateCreateProduct, controller.createProduct);
router.get('/products', controller.listMyProducts);
router.patch('/products/:id', validateUpdateProduct, controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

// Payments / Orders for seller
router.get('/payments', controller.listPayments);

export default router;
