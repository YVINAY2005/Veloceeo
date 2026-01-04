// src/api/product/product.routes.ts
import express from 'express';
import * as controller from './product.controller';
import { protect, restrictTo } from '../../middleware/auth.middleware';
import { validateCreateProduct, validateUpdateStock, validateUpdateProduct } from './product.validation';

const router = express.Router();

// Public routes (search and view products)
router.get('/search', controller.searchProducts); // ?name=query
router.get('/filters', controller.getFilterMetadata);
router.get('/store/:storeId', controller.getProductsByStore);
router.get('/:id', controller.getProductById);

// Category management (Admin only)
router.post('/categories', protect, restrictTo('admin'), controller.createCategory);
router.delete('/categories/:id', protect, restrictTo('admin'), controller.deleteCategory);

// Protected routes (requires authentication)
router.use(protect);

// Seller/Admin only routes
router.post(
  '/',
  restrictTo('seller', 'admin'),
  validateCreateProduct,
  controller.createProduct
);

router.patch(
  '/:id',
  restrictTo('seller', 'admin'),
  validateUpdateProduct,
  controller.updateProduct
);

router.patch(
  '/:id/stock',
  restrictTo('seller', 'admin'),
  validateUpdateStock,
  controller.updateStock
);

router.delete(
  '/:id',
  restrictTo('seller', 'admin'),
  controller.deleteProduct
);

export default router;