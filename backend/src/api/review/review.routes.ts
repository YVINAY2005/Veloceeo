import { Router } from 'express';
import reviewController from './review.controller';
import { addReviewSchema, updateReviewSchema } from './review.validation';
import { validate } from '../../middleware/validate';
import { protect, restrictTo } from '../../middleware/auth.middleware';

const router = Router();

router.get('/seller/all', protect, restrictTo('seller'), reviewController.getSellerReviews);

router
  .route('/:productId')
  .post(protect, restrictTo('customer'), validate(addReviewSchema), reviewController.addReview)
  .get(reviewController.getReviewsForProduct);

router
  .route('/:reviewId')
  .put(protect, restrictTo('customer'), validate(updateReviewSchema), reviewController.updateReview)
  .delete(protect, restrictTo('customer'), reviewController.deleteReview);

export default router;
