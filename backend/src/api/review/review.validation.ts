import { z } from 'zod';

export const addReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    review_text: z.string().optional(),
  }),
});

export const updateReviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    review_text: z.string().optional(),
  }),
});
