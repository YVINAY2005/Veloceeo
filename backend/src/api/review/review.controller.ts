import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import reviewService from './review.service';
import AppError from '../../utils/AppError';

class ReviewController {
  addReview = catchAsync(async (req: Request, res: Response) => {
    const customerId = req.userId as number;
    const { productId } = req.params;
    const { rating, review_text } = req.body;

    const review = await reviewService.addReview(
      customerId,
      parseInt(productId, 10),
      rating,
      review_text
    );

    res.status(201).json({
      status: 'success',
      data: {
        review,
      },
    });
  });

  updateReview = catchAsync(async (req: Request, res: Response) => {
    const customerId = req.userId as number;
    const { reviewId } = req.params;
    const { rating, review_text } = req.body;

    const review = await reviewService.updateReview(
      parseInt(reviewId, 10),
      customerId,
      rating,
      review_text
    );

    res.status(200).json({
      status: 'success',
      data: {
        review,
      },
    });
  });

  deleteReview = catchAsync(async (req: Request, res: Response) => {
    const customerId = req.userId as number;
    const { reviewId } = req.params;

    await reviewService.deleteReview(parseInt(reviewId, 10), customerId);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

  getReviewsForProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const pid = parseInt(productId, 10);
    
    if (isNaN(pid)) {
      throw new AppError('Invalid product ID', 400);
    }
    
    const reviews = await reviewService.getReviewsForProduct(pid);

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
      },
    });
  });

  getSellerReviews = catchAsync(async (req: Request, res: Response) => {
    const sellerId = req.userId as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const { reviews, totalPages, totalCount } = await reviewService.getSellerReviews(
      sellerId,
      page,
      limit
    );

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        page,
        totalPages,
        totalCount,
      },
    });
  });
}

export default new ReviewController();
