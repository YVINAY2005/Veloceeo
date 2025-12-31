import prisma from '../../lib/prisma';
import AppError from '../../utils/AppError';
import { Review } from './review.types';

class ReviewService {
  /**
   * Add a review for a product.
   * @param customerId The ID of the customer adding the review.
   * @param productId The ID of the product to review.
   * @param rating The rating given to the product (1-5).
   * @param reviewText Optional text for the review.
   * @returns The created review.
   */
  async addReview(
    customerId: number,
    productId: number,
    rating: number,
    reviewText?: string
  ): Promise<Review> {
    const existingReview = await prisma.review.findFirst({
      where: {
        customer_id: customerId,
        product_id: productId,
      },
    });

    if (existingReview) {
      throw new AppError('You have already reviewed this product.', 400);
    }

    const order = await prisma.order.findFirst({
      where: {
        customer_id: customerId,
        status: 'DELIVERED',
        items: {
          some: {
            product_id: productId,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(
        'You can only review products you have purchased and that have been delivered.',
        400
      );
    }

    const review = await prisma.review.create({
      data: {
        customer_id: customerId,
        product_id: productId,
        order_id: order.id,
        rating,
        review_text: reviewText,
      },
    });

    await this.updateProductRating(productId);

    return review as Review;
  }

  async updateProductRating(productId: number): Promise<void> {
    const reviews = await prisma.review.findMany({
      where: { product_id: productId },
    });

    const totalRatings = reviews.length;
    const averageRating =
      totalRatings > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalRatings
        : 0;

    const ratingBreakdown: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    for (const review of reviews) {
      const ratingStr = review.rating.toString();
      if (ratingBreakdown.hasOwnProperty(ratingStr)) {
        ratingBreakdown[ratingStr]++;
      }
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating,
        totalRatings,
        ratingBreakdown: ratingBreakdown as any,
      },
    });
  }

  /**
   * Update an existing review.
   * @param reviewId The ID of the review to update.
   * @param customerId The ID of the customer who owns the review.
   * @param rating Optional new rating.
   * @param reviewText Optional new review text.
   * @returns The updated review.
   */
  async updateReview(
    reviewId: number,
    customerId: number,
    rating?: number,
    reviewText?: string
  ): Promise<Review> {
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        customer_id: customerId,
      },
    });

    if (!review) {
      throw new AppError('Review not found or you do not have permission to update it.', 404);
    }

    const updatedReview = await prisma.review.update({
      where: {
        id: reviewId,
      },
      data: {
        rating: rating !== undefined ? rating : review.rating,
        review_text: reviewText !== undefined ? reviewText : review.review_text,
      },
    });

    await this.updateProductRating(review.product_id);

    return updatedReview as Review;
  }

  /**
   * Delete a review.
   * @param reviewId The ID of the review to delete.
   * @param customerId The ID of the customer who owns the review.
   */
  async deleteReview(reviewId: number, customerId: number): Promise<void> {
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        customer_id: customerId,
      },
    });

    if (!review) {
      throw new AppError('Review not found or you do not have permission to delete it.', 404);
    }

    await prisma.review.delete({
      where: {
        id: reviewId,
      },
    });

    await this.updateProductRating(review.product_id);
  }

  /**
   * Get all reviews for a product.
   * @param productId The ID of the product.
   * @returns A list of reviews.
   */
  async getReviewsForProduct(productId: number): Promise<Review[]> {
    const reviews = await prisma.review.findMany({
      where: {
        product_id: productId,
      },
    });

    return reviews as Review[];
  }

  /**
   * Get all reviews for a seller's products.
   * @param sellerId The ID of the seller.
   * @param page The page number for pagination.
   * @param limit The number of reviews per page.
   * @returns A list of reviews and pagination info.
   */
  async getSellerReviews(
    sellerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ reviews: Review[]; totalPages: number; totalCount: number }> {
    const skip = (page - 1) * limit;

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: {
          product: {
            store: {
              seller_id: sellerId,
            },
          },
        },
        include: {
          product: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.review.count({
        where: {
          product: {
            store: {
              seller_id: sellerId,
            },
          },
        },
      }),
    ]);

    return {
      reviews: reviews as any[],
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
    };
  }
}

export default new ReviewService();
