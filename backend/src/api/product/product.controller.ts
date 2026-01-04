// src/api/product/product.controller.ts
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import * as productService from './product.service';

/**
 * Create a new product
 * POST /api/products
 */
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const sellerId = req.role === 'seller' ? String(req.userId) : undefined;
  const product = await productService.createProduct(req.body, sellerId);
  res.status(201).json({ status: 'success', data: { product } });
});

/**
 * Get all products for a specific store
 * GET /api/products/store/:storeId
 */
export const getProductsByStore = catchAsync(async (req: Request, res: Response) => {
  const storeParam = String(req.params.storeId);
  const num = Number(storeParam);
  const products = Number.isNaN(num)
    ? await productService.getProductsByStoreSlug(storeParam)
    : await productService.getProductsByStore(num);
  res.json({ status: 'success', data: { products } });
});

/**
 * Get a single product by ID
 * GET /api/products/:id
 */
export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const product = await productService.getProductById(id);
  res.json({ status: 'success', data: { product } });
});

/**
 * Search products by name and filters
 * GET /api/products/search?name=query&minPrice=100&maxPrice=1000&brands=apple,samsung&categories=1,2
 */
export const searchProducts = catchAsync(async (req: Request, res: Response) => {
  const { name, minPrice, maxPrice, brands, categories, storeId } = req.query;

  const filters = {
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    brands: brands ? String(brands).split(',') : undefined,
    categories: categories ? String(categories).split(',').map(Number) : undefined,
    storeId: storeId ? Number(storeId) : undefined,
  };

  const products = await productService.searchProductsByName(String(name || ''), filters);
  res.json({ status: 'success', results: products.length, data: { products } });
});

/**
 * Get filter metadata (brands and categories)
 * GET /api/products/filters
 */
export const getFilterMetadata = catchAsync(async (_req: Request, res: Response) => {
  const [brands, categories] = await Promise.all([
    productService.getAllBrands(),
    productService.getCategoryHierarchy(),
  ]);
  res.json({ status: 'success', data: { brands, categories } });
});

/**
 * Create a new category
 * POST /api/product/categories
 */
export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const { name, parentId } = req.body;
  const category = await productService.createCategory(name, parentId);
  res.status(201).json({ status: 'success', data: { category } });
});

/**
 * Delete a category
 * DELETE /api/product/categories/:id
 */
export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await productService.deleteCategory(id);
  res.status(200).json({ status: 'success', data: null });
});

/**
 * Update product stock quantity
 * PATCH /api/products/:id/stock
 */
export const updateStock = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { quantity } = req.body;
  const sellerId = req.role === 'seller' ? String(req.userId) : undefined;
  const product = await productService.updateProductStock(id, quantity, sellerId);
  res.json({ status: 'success', data: { product } });
});

/**
 * Update product details
 * PATCH /api/products/:id
 */
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const sellerId = req.role === 'seller' ? String(req.userId) : undefined;
  const product = await productService.updateProduct(id, req.body, sellerId);
  res.json({ status: 'success', data: { product } });
});

/**
 * Delete a product
 * DELETE /api/products/:id
 */
export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const sellerId = req.role === 'seller' ? String(req.userId) : undefined;
  const result = await productService.deleteProduct(id, sellerId);
  res.json({ status: 'success', data: result });
});
