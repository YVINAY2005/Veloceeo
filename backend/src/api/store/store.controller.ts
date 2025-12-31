// src/api/store/store.controller.ts
import { Request, Response } from 'express';
import * as storeService from './store.service';
import { catchAsync } from '../../utils/catchAsync';

/**
 * Create a new store
 * POST /api/stores
 */
export const createStore = catchAsync(async (req: Request, res: Response) => {
  const store = await storeService.createStore(req);
  res.status(201).json({ status: 'success', data: store });
});

/**
 * Get all stores for authenticated seller
 * GET /api/stores
 */
export const getStores = catchAsync(async (req: Request, res: Response) => {
  const sellerId = String(req.userId!);
  const stores = await storeService.getStoresBySeller(sellerId);
  res.json({ status: 'success', data: stores });
});

/**
 * Get single store by ID
 * GET /api/stores/:id
 */
export const getStore = catchAsync(async (req: Request, res: Response) => {
  const sellerId = String(req.userId!);
  const storeId = Number(req.params.id);
  const store = await storeService.getStoreById(storeId, sellerId);
  res.json({ status: 'success', data: store });
});

/**
 * Update a store
 * PATCH /api/stores/:id
 */
export const updateStore = catchAsync(async (req: Request, res: Response) => {
  const sellerId = String(req.userId!);
  const storeId = Number(req.params.id);
  const updated = await storeService.updateStore(storeId, sellerId, req.body);
  res.json({ status: 'success', data: updated });
});

/**
 * Delete a store
 * DELETE /api/stores/:id
 */
export const deleteStore = catchAsync(async (req: Request, res: Response) => {
  const sellerId = String(req.userId!);
  const storeId = Number(req.params.id);
  const result = await storeService.deleteStore(storeId, sellerId);
  res.json({ status: 'success', data: result });
});

export const listPublicStores = catchAsync(async (_req: Request, res: Response) => {
  const stores = await storeService.listPublicActiveStores();
  res.json({ status: 'success', data: { stores } });
});
