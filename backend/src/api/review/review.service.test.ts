
import reviewService from './review.service';
import { prisma } from '../../lib/prisma';

// Mocking Prisma
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  prisma: {
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
    },
  },
}));

describe('Review Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addReview', () => {
    it('should create a new review and update product stats', async () => {
      const customerId = 1;
      const productId = 1;
      const rating = 5;
      const reviewText = 'Great product!';

      (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({ id: 101 });
      (prisma.review.create as jest.Mock).mockResolvedValue({ 
        id: 1, 
        customer_id: customerId,
        product_id: productId,
        order_id: 101,
        rating,
        review_text: reviewText,
      });
      (prisma.review.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.product.update as jest.Mock).mockResolvedValue({ id: 1 });

      const result = await reviewService.addReview(customerId, productId, rating, reviewText);

      expect(prisma.review.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          customer_id: customerId,
          product_id: productId,
          rating,
          review_text: reviewText,
        })
      }));
      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('getReviewsForProduct', () => {
    it('should return reviews for a product', async () => {
      const mockReviews = [
        { id: 1, rating: 5, review_text: 'Good', product_id: 1, customer_id: 1 }
      ];
      
      (prisma.review.findMany as jest.Mock).mockResolvedValue(mockReviews);

      const result = await reviewService.getReviewsForProduct(1);

      expect(prisma.review.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
