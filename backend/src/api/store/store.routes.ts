// src/api/store/store.routes.ts
import { Router } from 'express';
import { protect, restrictTo } from '../../middleware/auth.middleware';
import { validateStore } from './store.validation';
import * as storeController from './store.controller';

const router = Router();

router.get('/public', storeController.listPublicStores);

// ==================== SELLER ROUTES (Protected) ====================

// Create store
router.post(
  '/',
  protect,
  restrictTo('seller'),
  validateStore,
  storeController.createStore
);

// List stores owned by seller
router.get(
  '/',
  protect,
  restrictTo('seller'),
  storeController.getStores
);

// Get one store (seller only)
router.get(
  '/:id',
  protect,
  restrictTo('seller'),
  storeController.getStore
);

// Update store
router.patch(
  '/:id',
  protect,
  restrictTo('seller'),
  storeController.updateStore
);

// Delete store
router.delete(
  '/:id',
  protect,
  restrictTo('seller'),
  storeController.deleteStore
);

export default router;
