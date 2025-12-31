import { Router } from 'express';
import { cartController } from './cart.controller';
import { validate } from '../../middleware/validate';
import {
  addItemToCartSchema,
  updateItemQuantitySchema,
  removeItemFromCartSchema,
} from './cart.validation';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/', cartController.getCart);
router.post(
  '/',
  validate(addItemToCartSchema),
  cartController.addItemToCart
);
router.put(
  '/',
  validate(updateItemQuantitySchema),
  cartController.updateItemQuantity
);
router.delete(
  '/:productId',
  validate(removeItemFromCartSchema),
  cartController.removeItemFromCart
);
router.delete('/', cartController.clearCart);

export default router;