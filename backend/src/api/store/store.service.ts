// src/api/store/store.service.ts
import { prisma } from '../../lib/prisma';
import AppError from '../../utils/AppError';
import { Request } from 'express';

/**
 * Create a new store for a seller
 * 🔥 seller_id is now String (friendly ID)
 */
export const createStore = async (req: Request) => {
  const { name, slug, description, address, city, state, country } = req.body;
  
  // 🔥 Ensure sellerId is treated as string
  const sellerId = String(req.userId!);

  if (!name || !slug) {
    throw new AppError('Store name and slug are required', 400);
  }

  // Check if slug already exists
  const existing = await prisma.store.findUnique({ where: { slug } });
  if (existing) {
    throw new AppError('Store slug already exists', 400);
  }

  const store = await prisma.store.create({
    data: {
      seller_id: sellerId,
      name,
      slug,
      description: description ?? null,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      country: country ?? null,
      is_active: true,
    },
  });

  return store;
};

/**
 * Get all stores for a specific seller
 * 🔥 sellerId is String
 */
export const getStoresBySeller = async (sellerId: string) => {
  const stores = await prisma.store.findMany({
    where: { seller_id: sellerId },
    orderBy: { created_at: 'desc' },
    include: {
      seller: {
        select: {
          id: true,
          business_name: true,
          email: true,
        },
      },
      _count: {
        select: {
          products: true,
          categories: true,
        },
      },
    },
  });

  return stores;
};

/**
 * Get a single store by ID
 * Verify ownership by sellerId
 */
export const getStoreById = async (storeId: number, sellerId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      seller: {
        select: {
          id: true,
          business_name: true,
          email: true,
        },
      },
      products: {
        take: 10,
        orderBy: { created_at: 'desc' },
      },
      categories: true,
      _count: {
        select: {
          products: true,
          categories: true,
        },
      },
    },
  });

  if (!store) {
    throw new AppError('Store not found', 404);
  }

  // Verify ownership
  if (store.seller_id !== sellerId) {
    throw new AppError('Access denied: You do not own this store', 403);
  }

  return store;
};

/**
 * Update a store
 * Only the owner can update
 */
export const updateStore = async (storeId: number, sellerId: string, data: any) => {
  // First verify the store exists and belongs to the seller
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  
  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.seller_id !== sellerId) {
    throw new AppError('Access denied: You do not own this store', 403);
  }

  // Prepare update data
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) {
    // Check if new slug already exists (and it's not the current store's slug)
    if (data.slug !== store.slug) {
      const existing = await prisma.store.findUnique({ where: { slug: data.slug } });
      if (existing) {
        throw new AppError('Store slug already exists', 400);
      }
    }
    updateData.slug = data.slug;
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.is_active !== undefined) updateData.is_active = !!data.is_active;

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: updateData,
  });

  return updated;
};

/**
 * Delete a store
 * Only the owner can delete
 * This will cascade delete all products and categories
 */
export const deleteStore = async (storeId: number, sellerId: string) => {
  // First verify the store exists and belongs to the seller
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  
  if (!store) {
    throw new AppError('Store not found', 404);
  }

  if (store.seller_id !== sellerId) {
    throw new AppError('Access denied: You do not own this store', 403);
  }

  // Delete the store (cascade will handle products and categories)
  await prisma.store.delete({ where: { id: storeId } });

  return { message: 'Store deleted successfully' };
};

/**
 * Public: list active stores with minimal fields
 */
export const listPublicActiveStores = async () => {
  const stores = await prisma.store.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      country: true,
    },
  });
  return stores;
};
