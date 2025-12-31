import { Request, Response } from 'express';
import { cartService } from './cart.service';
import { catchAsync } from '../../utils/catchAsync';
import AppError from '../../utils/AppError';

const getCart = catchAsync(async (req: Request, res: Response) => {
  const customerId = Number(req.userId);
  if (!customerId || isNaN(customerId)) {
    throw new AppError('Not authenticated', 401);
  }
  const cart = await cartService.getCartByCustomerId(customerId);
  res.status(200).json(cart);
});

const addItemToCart = catchAsync(async (req: Request, res: Response) => {
  const customerId = Number(req.userId);
  if (!customerId || isNaN(customerId)) {
    throw new AppError('Not authenticated', 401);
  }
  const { productId, quantity } = req.body;
  const cart = await cartService.addItemToCart(customerId, productId, quantity);
  res.status(200).json(cart);
});

const updateItemQuantity = catchAsync(async (req: Request, res: Response) => {
  const customerId = Number(req.userId);
  if (!customerId || isNaN(customerId)) {
    throw new AppError('Not authenticated', 401);
  }
  const { productId, quantity } = req.body;
  const cart = await cartService.updateItemQuantity(
    customerId,
    productId,
    quantity
  );
  res.status(200).json(cart);
});

const removeItemFromCart = catchAsync(async (req: Request, res: Response) => {
  const customerId = Number(req.userId);
  if (!customerId || isNaN(customerId)) {
    throw new AppError('Not authenticated', 401);
  }
  const productId = parseInt(req.params.productId, 10);
  const cart = await cartService.removeItemFromCart(customerId, productId);
  res.status(200).json(cart);
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  const customerId = Number(req.userId);
  if (!customerId || isNaN(customerId)) {
    throw new AppError('Not authenticated', 401);
  }
  const cart = await cartService.clearCart(customerId);
  res.status(200).json(cart);
});

export const cartController = {
  getCart,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
};