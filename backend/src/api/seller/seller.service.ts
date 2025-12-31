// src/api/seller/seller.service.ts
import { prisma, Prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';
import AppError from '../../utils/AppError';
import { createSession, SESSION_TTL_MS } from '../../utils/session';

function signToken(sessionId: string, role: 'admin' | 'seller' | 'customer') {
  return jwt.sign({ session_id: sessionId, role }, config.JWT_SECRET as string, { expiresIn: '24h' });
}

/**
 * Seller signup - creates Seller record (schema fields)
 */
export const signupService = async (payload: any) => {
  const { email, password, name, phone, business_name, gst_number } = payload;
  if (!email || !password || !business_name) throw new AppError('email, password and business_name required', 400);

  // ensure email uniqueness
  const existing = await prisma.seller.findUnique({ where: { email } });
  if (existing) throw new AppError('Seller with this email already exists', 409);

  // ensure phone uniqueness
  if (phone) {
    const existingPhone = await prisma.seller.findUnique({ where: { phone } });
    if (existingPhone) throw new AppError('Seller with this phone number already exists', 409);
  }

  // ensure business name uniqueness
  const existingBusiness = await prisma.seller.findFirst({ where: { business_name } });
  if (existingBusiness) throw new AppError(`Seller with business name "${business_name}" already exists`, 409);

  // ensure GST uniqueness
  if (gst_number) {
    const existingGst = await prisma.seller.findUnique({ where: { gst_number } });
    if (existingGst) throw new AppError(`Seller with GST number ${gst_number} already exists`, 409);
  }

  const hashed = await bcrypt.hash(password, 12);

  const friendlyId = `${business_name.replace(/\s+/g, "_").toLowerCase()}_${Date.now().toString().slice(-5)}`;

  try {
    const seller = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const s = await tx.seller.create({
        data: {
          id: friendlyId,      // ⭐ now explicitly providing ID
          email,
          password: hashed,
          name: name ?? null,
          phone: phone ?? null,
          business_name,
          gst_number: gst_number ?? null,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'SELLER_SIGNUP',
          entity_type: 'SELLER',
          entity_id: s.id,
          seller_id: s.id,
          details: { email: s.email, business_name: s.business_name, attempt_status: 'SUCCESS' },
        },
      });

      return s;
    });

    // 🔥 Send welcome email to seller (async, don't block signup)
    import('../../api/notification/notification.service')
      .then(({ notifySellerSignup }) => notifySellerSignup(seller.id))
      .catch((err) => console.error('Background email error:', err));

    // 🔥 Notify admins about new seller (async)
    import('../../api/notification/notification.service')
      .then(({ notifyAdminNewSeller }) => notifyAdminNewSeller(seller.id))
      .catch((err) => console.error('Background email error:', err));

    return { id: seller.id, email: seller.email, business_name: seller.business_name, name: seller.name };
  } catch (error: any) {
    // Log failed attempt
    await prisma.auditLog.create({
      data: {
        action: 'SELLER_SIGNUP_FAILED',
        entity_type: 'SELLER',
        entity_id: 'N/A',
        details: { 
          email, 
          business_name, 
          error: error.message || 'Unknown error',
          attempt_status: 'FAILED'
        },
      },
    });
    throw error;
  }
};

/**
 * Seller login - create session, return token
 * Supports ID-only login for simplified authentication
 */
export const loginService = async (payload: any) => {
  const { email, sellerId, password } = payload;
  
  // Requirement: ID-only authentication supported
  // If only sellerId is provided, we skip password check
  const isIdOnlyLogin = !!sellerId && !password && !email;

  if (!email && !sellerId) {
    throw new AppError('Email or Seller ID is required', 400);
  }

  const seller = email 
    ? await prisma.seller.findUnique({ where: { email } })
    : await prisma.seller.findUnique({ where: { id: sellerId } });

  if (!seller) {
    // Audit log failed attempt (async)
    prisma.auditLog.create({
      data: {
        action: 'SELLER_LOGIN_FAILED',
        entity_type: 'SELLER',
        entity_id: sellerId || email || 'UNKNOWN',
        details: { 
          reason: 'Seller not found', 
          ip: payload.ip, 
          method: isIdOnlyLogin ? 'ID_ONLY' : 'TRADITIONAL' 
        },
      },
    }).catch(err => console.error('Audit log error (SELLER_LOGIN_FAILED):', err));
    
    throw new AppError('Invalid credentials', 401);
  }

  // If password is provided OR it's not an ID-only login attempt, validate password
  if (password || !isIdOnlyLogin) {
    if (!password) throw new AppError('Password is required for traditional login', 400);
    const match = await bcrypt.compare(password, seller.password);
    if (!match) {
      // Audit log failed attempt (async)
      prisma.auditLog.create({
        data: {
          action: 'SELLER_LOGIN_FAILED',
          entity_type: 'SELLER',
          entity_id: seller.id,
          seller_id: seller.id,
          details: { 
            reason: 'Invalid password', 
            ip: payload.ip,
            method: 'TRADITIONAL'
          },
        },
      }).catch(err => console.error('Audit log error (SELLER_LOGIN_FAILED):', err));
      
      throw new AppError('Invalid credentials', 401);
    }
  }

  const session = await createSession({
    seller_id: seller.id,
    ip: payload.ip,
    user_agent: payload.userAgent,
  });

  const token = signToken(session.session_id, 'seller');

  // Audit log (async)
  prisma.auditLog.create({
    data: {
      action: 'SELLER_LOGIN',
      entity_type: 'SELLER',
      entity_id: seller.id,
      seller_id: seller.id,
      details: { 
        ip: payload.ip, 
        userAgent: payload.userAgent,
        method: isIdOnlyLogin ? 'ID_ONLY' : 'TRADITIONAL'
      },
    },
  }).catch(err => console.error('Audit log error (SELLER_LOGIN):', err));

  return { token, expiresAt: session.expires_at, user: { id: seller.id, email: seller.email, name: seller.name, business_name: seller.business_name } };
};

export const logoutService = async (sessionId: string | undefined) => {
  if (!sessionId) return;
  await prisma.session.deleteMany({ where: { session_id: sessionId } });
};

export const getMeService = async (id: string) => {
  const seller = await prisma.seller.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, business_name: true, is_verified: true, is_active: true }
  });
  if (!seller) throw new AppError('Seller not found', 404);
  return seller;
};

export const demoLoginService = async (metadata?: any) => {
  const friendlyId = `seller_${Date.now().toString().slice(-6)}`;
  const email = `${friendlyId}@example.com`;
  const hashed = await bcrypt.hash('demo', 8);
  const seller = await prisma.seller.create({
    data: {
      id: friendlyId,
      email,
      password: hashed,
      business_name: friendlyId,
      name: 'Demo Seller',
    },
  });
  
  const session = await createSession({
    seller_id: seller.id,
    ip: metadata?.ip,
    user_agent: metadata?.userAgent,
  });

  const token = signToken(session.session_id, 'seller');
  return { token, expiresAt: session.expires_at, user: { id: seller.id, email: seller.email, name: seller.name, business_name: seller.business_name } };
};

export const ensureDefaultStoreForSellerService = async (sellerId: string) => {
  const existing = await prisma.store.findFirst({ where: { seller_id: sellerId } });
  if (existing) return existing;
  const slug = `${sellerId}-default`;
  const store = await prisma.store.create({
    data: {
      seller_id: sellerId,
      name: 'Default Store',
      slug,
      is_active: true,
    },
  });
  return store;
};
/**
 * Stores
 */
export const createStoreService = async (sellerId: string, payload: any) => {
  const { name, slug, description, address, city, state, country } = payload;
  if (!name || !slug) throw new AppError('name and slug required', 400);

  // Ensure slug unique
  const existing = await prisma.store.findUnique({ where: { slug } });
  if (existing) throw new AppError('Store slug already exists', 409);

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const store = await tx.store.create({
      data: {
        seller_id: sellerId,
        name,
        slug,
        description: description ?? null,
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        country: country ?? null,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'CREATE_STORE',
        entity_type: 'STORE',
        entity_id: String(store.id),
        seller_id: sellerId,
        details: { name: store.name, slug: store.slug },
      },
    });

    return store;
  });
};

export const listStoresForSellerService = async (sellerId: string) => {
  const stores = await prisma.store.findMany({
    where: { seller_id: sellerId },
    orderBy: { created_at: 'desc' },
  });
  return stores;
};

/**
 * Products (ensure seller owns the store)
 */
export const createProductService = async (sellerId: string, payload: any) => {
  const {
    store_id,
    name,
    slug,
    sku,
    description,
    price_cents,
    currency = 'INR',
    stock_quantity = 0,
    is_active = true,
    category_id,
  } = payload;

  if (!store_id) throw new AppError('store_id is required', 400);
  if (!name) throw new AppError('Product name is required', 400);
  if (!slug) throw new AppError('Product slug is required', 400);
  if (!sku) throw new AppError('Product sku is required', 400);

  // ensure store belongs to seller
  const store = await prisma.store.findUnique({ where: { id: Number(store_id) } });
  if (!store) throw new AppError('Store not found', 404);
  if (store.seller_id !== sellerId) throw new AppError('Forbidden: not your store', 403);

  // ensure SKU & slug unique (avoid P2002)
  const existingSku = await prisma.product.findUnique({ where: { sku } }).catch(() => null);
  if (existingSku) throw new AppError('Product with this SKU already exists', 409);
  const existingSlug = await prisma.product.findUnique({ where: { slug } }).catch(() => null);
  if (existingSlug) throw new AppError('Product with this slug already exists', 409);

  // create product
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.product.create({
      data: {
        store_id: store.id,
        category_id: category_id ? Number(category_id) : null,
        name,
        slug,
        sku,
        description: description ?? null,
        price_cents,
        currency,
        stock_quantity,
        is_active,
        brand: payload.brand ?? null,
        images: {
          create: (payload.images || []).map((img: any) => ({
            url: img.url,
            is_primary: !!img.is_primary,
            display_order: Number(img.display_order || 0)
          }))
        },
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'CREATE_PRODUCT',
        entity_type: 'PRODUCT',
        entity_id: String(product.id),
        seller_id: sellerId,
        details: { name: product.name, price_cents: product.price_cents },
      },
    });

    return product;
  });
};

export const listMyProductsService = async (sellerId: string) => {
  // fetch products across seller's stores
  const stores = await prisma.store.findMany({ where: { seller_id: sellerId }, select: { id: true } });
  const storeIds = stores.map((s) => s.id);
  if (storeIds.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { store_id: { in: storeIds } },
    orderBy: { created_at: 'desc' },
    include: {
      images: {
        where: { is_primary: true },
        take: 1
      }
    }
  });
  return products.map(p => ({
    ...p,
    image: p.images?.[0]?.url || null
  }));
};

export const updateProductService = async (sellerId: string, productId: number, payload: any) => {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) throw new AppError('Product not found', 404);

  // ensure product belongs to seller
  const store = await prisma.store.findUnique({ where: { id: product.store_id } });
  if (!store || store.seller_id !== sellerId) throw new AppError('Forbidden: not your product', 403);

  // build update object
  const data: any = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.price_cents !== undefined) data.price_cents = Number(payload.price_cents);
  if (payload.stock_quantity !== undefined) data.stock_quantity = Number(payload.stock_quantity);
  if (payload.is_active !== undefined) data.is_active = !!payload.is_active;
  if (payload.category_id !== undefined) data.category_id = payload.category_id ? Number(payload.category_id) : null;
  if (payload.brand !== undefined) data.brand = payload.brand;
  if (payload.images !== undefined) {
    data.images = {
      deleteMany: {},
      create: (payload.images || []).map((img: any) => ({
        url: img.url,
        is_primary: !!img.is_primary,
        display_order: Number(img.display_order || 0)
      }))
    };
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.product.update({ where: { id: Number(productId) }, data });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'UPDATE_PRODUCT',
        entity_type: 'PRODUCT',
        entity_id: String(updated.id),
        seller_id: sellerId,
        details: { 
          fields_updated: Object.keys(data),
          name: updated.name 
        },
      },
    });

    return updated;
  });
};

export const deleteProductService = async (sellerId: string, productId: number) => {
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) throw new AppError('Product not found', 404);
  const store = await prisma.store.findUnique({ where: { id: product.store_id } });
  if (!store || store.seller_id !== sellerId) throw new AppError('Forbidden: not your product', 403);

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // We'll do a hard delete as per general "delete" expectations in this project
    // But first delete related records like reviews and cart items
    await tx.cartItem.deleteMany({ where: { product_id: Number(productId) } });
    await tx.review.deleteMany({ where: { product_id: Number(productId) } });
    
    await tx.product.delete({ where: { id: Number(productId) } });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'DELETE_PRODUCT',
        entity_type: 'PRODUCT',
        entity_id: String(productId),
        seller_id: sellerId,
        details: { name: product.name },
      },
    });

    return { success: true };
  });
};

/**
 * List payments (orders) for seller across all their stores
 */
export const listPaymentsForSellerService = async (sellerId: string, { status, provider, page = 1, limit = 50 }: any) => {
  const where: any = { seller_id: sellerId };
  if (status) where.status = String(status);
  if (provider) where.provider = String(provider);

  const payments = await prisma.payment.findMany({
    where,
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
    orderBy: { created_at: 'desc' },
    include: { customer: true },
  });

  return payments;
};
