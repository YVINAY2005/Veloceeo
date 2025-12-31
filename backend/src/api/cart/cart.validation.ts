
import { z } from 'zod';

export const addItemToCartSchema = z.object({
  body: z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  }),
});

export const updateItemQuantitySchema = z.object({
  body: z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().nonnegative(),
  }),
});

export const removeItemFromCartSchema = z.object({
  params: z.object({
    productId: z.string().transform((val) => parseInt(val, 10)),
  }),
});
