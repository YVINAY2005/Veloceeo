// src/api/product/product.service.ts
import { prisma, Prisma } from '../../lib/prisma';
import AppError from '../../utils/AppError';

interface ProductImageInput {
  url: string;
  is_primary: boolean;
  display_order: number;
}

interface CreateProductInput {
  store_id: number;
  category_id?: number | null;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  price_cents: number;
  currency?: string;
  stock_quantity?: number;
  brand?: string | null;
  images?: ProductImageInput[];
  is_active?: boolean;
}

/**
 * Create a new product
 */
export const createProduct = async (input: CreateProductInput, sellerId?: string) => {
  // Verify store exists
  const store = await prisma.store.findUnique({ where: { id: input.store_id } });
  if (!store) throw new AppError('Store not found', 404);

  // If sellerId is provided, verify they own the store
  if (sellerId && store.seller_id !== sellerId) {
    throw new AppError('You do not have permission to add products to this store', 403);
  }

  // Check for duplicate slug
  const existingSlug = await prisma.product.findUnique({ where: { slug: input.slug } });
  if (existingSlug) throw new AppError('Product slug already exists', 400);

  // Check for duplicate SKU
  const existingSku = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existingSku) throw new AppError('Product SKU already exists', 400);

  // Verify category if provided
  if (input.category_id) {
    const category = await prisma.category.findUnique({ where: { id: input.category_id } });
    if (!category) throw new AppError('Category not found', 404);
  }

  const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const p = await tx.product.create({
      data: {
        store_id: input.store_id,
        category_id: input.category_id ?? null,
        name: input.name,
        slug: input.slug,
        sku: input.sku,
        description: input.description ?? null,
        price_cents: input.price_cents,
        currency: input.currency ?? 'INR',
        stock_quantity: input.stock_quantity ?? 0,
        brand: input.brand ?? null,
        images: {
          create: input.images?.map(img => ({
            url: img.url,
            is_primary: img.is_primary,
            display_order: img.display_order
          })) ?? []
        },
        is_active: input.is_active ?? true,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            seller_id: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log the action
    await tx.auditLog.create({
      data: {
        action: 'CREATE_PRODUCT',
        entity_type: 'PRODUCT',
        entity_id: String(p.id),
        seller_id: sellerId,
        details: { name: p.name, price: p.price_cents, stock: p.stock_quantity },
      },
    });

    return p;
  });

  return product;
};

/**
 * Get all products for a specific store
 */
export const getProductsByStore = async (store_id: number) => {
  const store = await prisma.store.findUnique({ where: { id: store_id } });
  if (!store) throw new AppError('Store not found', 404);

  return prisma.product.findMany({
    where: { store_id },
    orderBy: { created_at: 'desc' },
    include: {
      images: {
        orderBy: { display_order: 'asc' },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

export const getProductsByStoreSlug = async (slug: string) => {
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) throw new AppError('Store not found', 404);
  return prisma.product.findMany({
    where: { store_id: store.id },
    orderBy: { created_at: 'desc' },
    include: {
      images: {
        orderBy: { display_order: 'asc' },
      },
      category: {
        select: { id: true, name: true },
      },
    },
  });
};

/**
 * Get a single product by ID
 */
export const getProductById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { display_order: 'asc' },
      },
      store: {
        select: {
          id: true,
          name: true,
          seller_id: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      reviews: true,
    },
  });

  if (!product) throw new AppError('Product not found', 404);
  return {
    ...product,
    image: product.images.find(img => img.is_primary)?.url || product.images[0]?.url || null
  };
};

/**
 * Search products with filters
 */
export const searchProductsByName = async (
  name: string,
  filters: {
    minPrice?: number;
    maxPrice?: number;
    brands?: string[];
    categories?: number[];
    storeId?: number;
  } = {}
) => {
  const query = (name || '').trim();
  const where: Prisma.ProductWhereInput = {
    is_active: true,
  };

  if (filters.storeId) {
    where.store_id = filters.storeId;
  }

  if (query.length > 0) {
    where.name = { contains: query, mode: 'insensitive' };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price_cents = {};
    if (filters.minPrice !== undefined) where.price_cents.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.price_cents.lte = filters.maxPrice;
  }

  if (filters.brands && filters.brands.length > 0) {
    where.brand = { in: filters.brands };
  }

  if (filters.categories && filters.categories.length > 0) {
    // Get all subcategory IDs for the selected categories to support hierarchical filtering
    const allCategoryIds = new Set<number>(filters.categories);
    const categories = await prisma.category.findMany({
      where: { id: { in: filters.categories } },
      include: { subcategories: true },
    });

    interface CategoryWithSubs {
      id: number;
      subcategories?: CategoryWithSubs[];
    }

    const addChildren = (cats: CategoryWithSubs[]) => {
      for (const cat of cats) {
        allCategoryIds.add(cat.id);
        if (cat.subcategories && cat.subcategories.length > 0) {
          addChildren(cat.subcategories);
        }
      }
    };
    
    // For a real implementation, we'd need a recursive CTE or fetch all categories
    // For now, let's fetch one level deeper or just use the provided IDs if we want to keep it simple
    // A better way is to fetch all categories and build the tree in memory or use a recursive query
    const allCats = await prisma.category.findMany();
    const getSubIds = (parentId: number) => {
      const children = allCats.filter(c => c.parent_id === parentId);
      let ids: number[] = [parentId];
      for (const child of children) {
        ids = [...ids, ...getSubIds(child.id)];
      }
      return ids;
    };

    const expandedIds = filters.categories.flatMap(id => getSubIds(id));
    where.category_id = { in: Array.from(new Set(expandedIds)) };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 20,
    include: {
      images: {
        where: { is_primary: true },
        take: 1,
      },
      store: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          parent_id: true,
        },
      },
    },
  });

  return products.map(p => {
    // Use cached fields from Product model
    const { ...rest } = p;
    return {
      ...rest,
      avgRating: p.averageRating,
      reviewCount: p.totalRatings,
      image: p.images?.[0]?.url || null,
    };
  });
};

/**
 * Get all available brands
 */
export const getAllBrands = async () => {
  const products = await prisma.product.findMany({
    where: { is_active: true, brand: { not: null } },
    select: { brand: true },
    distinct: ['brand'],
  });
  return products.map((p) => p.brand).filter(Boolean) as string[];
};

/**
 * Get category hierarchy
 */
export const getCategoryHierarchy = async () => {
  const categories = await prisma.category.findMany({
    include: {
      subcategories: true,
    },
  });

  interface CategoryNode extends Prisma.CategoryGetPayload<{ include: { subcategories: true } }> {
    children: CategoryNode[];
  }

  // Simple hierarchy builder
  const buildTree = (parentId: number | null = null): CategoryNode[] => {
    return categories
      .filter((c) => c.parent_id === parentId)
      .map((c) => ({
        ...(c as Prisma.CategoryGetPayload<{ include: { subcategories: true } }>),
        children: buildTree(c.id),
      }));
  };

  return buildTree(null);
};

/**
 * Update product stock quantity
 */
export const updateProductStock = async (id: number, quantity: number, sellerId?: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.product.update({
      where: { id },
      data: { stock_quantity: quantity },
    });

    // Log the action
    await tx.auditLog.create({
      data: {
        action: 'UPDATE_STOCK',
        entity_type: 'PRODUCT',
        entity_id: String(id),
        seller_id: sellerId,
        details: { old_stock: product.stock_quantity, new_stock: quantity },
      },
    });

    return updated;
  });
};

/**
 * Update product (full update)
 */
export const updateProduct = async (id: number, data: Partial<CreateProductInput>, sellerId?: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);

  // Check slug uniqueness if changing
  if (data.slug && data.slug !== product.slug) {
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (existing) throw new AppError('Product slug already exists', 400);
  }

  // Check SKU uniqueness if changing
  if (data.sku && data.sku !== product.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new AppError('Product SKU already exists', 400);
  }

  const updateData: Prisma.ProductUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price_cents !== undefined) updateData.price_cents = data.price_cents;
  if (data.stock_quantity !== undefined) updateData.stock_quantity = data.stock_quantity;
  if (data.category_id !== undefined && data.category_id !== null) {
    updateData.category = { connect: { id: data.category_id } };
  }
  if (data.brand !== undefined) updateData.brand = data.brand;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // If images are provided, replace them
    if (data.images) {
      if (data.images.length === 0) {
        throw new AppError('At least one product image is required', 400);
      }
      const primaryImages = data.images.filter(img => img.is_primary);
      if (primaryImages.length !== 1) {
        throw new AppError('Exactly one image must be designated as primary', 400);
      }

      // Delete existing images first
      await tx.productImage.deleteMany({
        where: { product_id: id },
      });

      updateData.images = {
        create: data.images.map(img => ({
          url: img.url,
          is_primary: img.is_primary ?? false,
          display_order: img.display_order ?? 0,
        })),
      };
    }

    const updated = await tx.product.update({
      where: { id },
      data: updateData,
    });

    // Log the action
    await tx.auditLog.create({
      data: {
        action: 'UPDATE_PRODUCT',
        entity_type: 'PRODUCT',
        entity_id: String(id),
        seller_id: sellerId,
        details: { fields: Object.keys(updateData) },
      },
    });

    return updated;
  });
};

/**
 * Delete a product
 */
export const deleteProduct = async (id: number, sellerId?: string) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.product.delete({ where: { id } });

    // Log the action
    await tx.auditLog.create({
      data: {
        action: 'DELETE_PRODUCT',
        entity_type: 'PRODUCT',
        entity_id: String(id),
        seller_id: sellerId,
        details: { name: product.name },
      },
    });

    return { message: 'Product deleted successfully' };
  });
};
