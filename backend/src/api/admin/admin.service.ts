// src/api/admin/admin.service.ts
import { prisma, Prisma } from '../../lib/prisma';
import { PaymentStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../../config';
import AppError from '../../utils/AppError';
import { createSession, SESSION_TTL_MS } from '../../utils/session';

const ALLOWED_ADMIN_EMAIL = (process.env.ALLOWED_ADMIN_EMAIL || 'veloceo69@gmail.com').replace(/['"]/g, '').toLowerCase();

interface AdminSignupPayload {
  email: string;
  password: string;
  name?: string;
}

interface AdminLoginPayload {
  email: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

interface CreateSellerPayload {
  email: string;
  password: string;
  business_name: string;
  name?: string;
  phone?: string;
  gst_number?: string;
}

interface UpdateSellerPayload {
  name?: string;
  phone?: string;
  business_name?: string;
  gst_number?: string;
  is_verified?: boolean;
  is_active?: boolean;
  password?: string;
}

function signToken(sessionId: string, role: 'admin' | 'seller' | 'customer') {
  return jwt.sign({ session_id: sessionId, role }, config.JWT_SECRET as string, { expiresIn: '24h' });
}

/**
 * Admin signup - creates an admin record (hashes password).
 */
export const signupService = async (payload: AdminSignupPayload) => {
  if (!payload?.email || !payload?.password) {
    throw new AppError('Email and password are required', 400);
  }

  const hashed = await bcrypt.hash(payload.password, 12);

  const admin = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const a = await tx.admin.create({
      data: {
        email: payload.email,
        password: hashed,
        name: payload.name ?? null,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'ADMIN_SIGNUP',
        entity_type: 'ADMIN',
        entity_id: String(a.id),
        admin_id: a.id,
        details: { email: a.email },
      },
    });

    return a;
  });

  return { admin };
};

/**
 * Admin login - ENFORCED: only allowed for ALLOWED_ADMIN_EMAIL
 */
export const loginService = async (payload: AdminLoginPayload) => {
  if (!payload?.email || !payload?.password) {
    throw new AppError('Email and password are required', 400);
  }

  if (String(payload.email).toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
    throw new AppError('Unauthorized: admin login is restricted.', 401);
  }

  const admin = await prisma.admin.findUnique({ where: { email: payload.email } });
  if (!admin) {
    throw new AppError('Invalid credentials', 401);
  }

  const match = await bcrypt.compare(payload.password, admin.password);
  if (!match) throw new AppError('Invalid credentials', 401);

  const session = await createSession({
    admin_id: admin.id,
    ip: payload.ip,
    user_agent: payload.userAgent,
  });

  const token = signToken(session.session_id, 'admin');

  return { token, expiresAt: session.expires_at, user: { id: admin.id, email: admin.email, name: admin.name } };
};

/**
 * Logout - deletes the session row
 */
export const logoutService = async (sessionId: string | undefined) => {
  if (!sessionId) return;
  await prisma.session.deleteMany({ where: { session_id: sessionId } });
};

export const getMeService = async (id: number) => {
  const admin = await prisma.admin.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, is_super: true }
  });
  if (!admin) throw new AppError('Admin not found', 404);
  return admin;
};

export const demoLoginService = async (payload?: { ip?: string; userAgent?: string }) => {
  const email = `admin_${Date.now()}@example.com`;
  const hashed = await bcrypt.hash('demo', 8);
  const admin = await prisma.admin.create({
    data: { email, password: hashed, name: 'Demo Admin' },
  });

  const session = await createSession({
    admin_id: admin.id,
    ip: payload?.ip,
    user_agent: payload?.userAgent,
  });

  const token = signToken(session.session_id, 'admin');
  return { token, expiresAt: session.expires_at, user: { id: admin.id, email: admin.email, name: admin.name } };
};
// ---------------- Seller CRUD ----------------

/**
 * 🔥 FIXED: Seller now uses String ID (friendly ID)
 * Admin should NOT create sellers - sellers self-register
 * This is kept for backward compatibility but should be deprecated
 */
export const createSellerService = async (payload: CreateSellerPayload, adminId?: number) => {
  if (!payload?.email || !payload?.password || !payload?.business_name) {
    throw new AppError('Seller email, password and business_name are required', 400);
  }

  // Generate friendly ID (same logic as seller signup)
  const name = payload.name || payload.business_name;
  const id = `${name.replace(/\s+/g, "_").toLowerCase()}_${Date.now().toString().slice(-5)}`;

  const hashed = await bcrypt.hash(payload.password, 12);

  try {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Check for duplicate email
      const existingEmail = await tx.seller.findUnique({ where: { email: payload.email } });
      if (existingEmail) {
        throw new AppError(`A seller with email ${payload.email} already exists.`, 409);
      }

      // 2. Check for duplicate phone
      if (payload.phone) {
        const existingPhone = await tx.seller.findUnique({ where: { phone: payload.phone } });
        if (existingPhone) {
          throw new AppError(`A seller with phone number ${payload.phone} already exists.`, 409);
        }
      }

      // 3. Check for duplicate business name
      const existingBusiness = await tx.seller.findFirst({ where: { business_name: payload.business_name } });
      if (existingBusiness) {
        throw new AppError(`A seller with business name "${payload.business_name}" already exists.`, 409);
      }

      // 4. Check for duplicate GST number
      if (payload.gst_number) {
        const existingGst = await tx.seller.findUnique({ where: { gst_number: payload.gst_number } });
        if (existingGst) {
          throw new AppError(`A seller with GST number ${payload.gst_number} already exists.`, 409);
        }
      }

      // 5. Create the seller
      const seller = await tx.seller.create({
        data: {
          id,
          email: payload.email,
          password: hashed,
          phone: payload.phone ?? null,
          name: payload.name ?? null,
          business_name: payload.business_name,
          gst_number: payload.gst_number ?? null,
        },
      });

      // 6. Audit log
      if (adminId) {
        await tx.auditLog.create({
          data: {
            action: 'CREATE_SELLER',
            entity_type: 'SELLER',
            entity_id: seller.id,
            admin_id: adminId,
            details: { 
              email: seller.email, 
              business_name: seller.business_name,
              attempt_status: 'SUCCESS'
            },
          },
        });
      }

      return seller;
    });
  } catch (error) {
    const err = error as Error;
    if (adminId) {
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_SELLER_FAILED',
          entity_type: 'SELLER',
          entity_id: 'N/A',
          admin_id: adminId,
          details: { 
            email: payload.email, 
            business_name: payload.business_name,
            error: err.message 
          } as Prisma.InputJsonValue,
        },
      });
    }
    throw error;
  }
};

export const listSellersService = async () => {
  const sellers = await prisma.seller.findMany({
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      business_name: true,
      gst_number: true,
      is_verified: true,
      is_active: true,
      created_at: true,
    },
  });
  return sellers;
};

/**
 * 🔥 FIXED: Seller ID is now String, no need to convert to number
 */
export const getSellerByIdService = async (id: string) => {
  const seller = await prisma.seller.findUnique({ where: { id } });
  if (!seller) throw new AppError('Seller not found', 404);
  return seller;
};

/**
 * 🔥 FIXED: Seller ID is String
 */
export const updateSellerService = async (id: string, payload: UpdateSellerPayload, adminId?: number) => {
  const allowed: Prisma.SellerUpdateInput = {};
  if (payload.name !== undefined) allowed.name = payload.name;
  if (payload.phone !== undefined) allowed.phone = payload.phone;
  if (payload.business_name !== undefined) allowed.business_name = payload.business_name;
  if (payload.gst_number !== undefined) allowed.gst_number = payload.gst_number;
  if (payload.is_verified !== undefined) allowed.is_verified = !!payload.is_verified;
  if (payload.is_active !== undefined) allowed.is_active = !!payload.is_active;
  if (payload.password !== undefined) {
    allowed.password = await bcrypt.hash(payload.password, 12);
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const seller = await tx.seller.update({ where: { id }, data: allowed });

    if (adminId) {
      await tx.auditLog.create({
        data: {
          action: 'UPDATE_SELLER',
          entity_type: 'SELLER',
          entity_id: id,
          admin_id: adminId,
          details: { 
            fields_updated: Object.keys(allowed).filter((k: string) => k !== 'password'),
            business_name: seller.business_name 
          },
        },
      });
    }

    return seller;
  });
};

/**
 * 🔥 FIXED: Seller ID is String
 */
export const deleteSellerService = async (id: string, adminId: number) => {
  console.log(`🔍 [SERVICE] Looking for seller to delete: ${id}`);
  const seller = await prisma.seller.findUnique({ 
    where: { id },
    include: { stores: true, bank_accounts: true }
  });
  
  if (!seller) {
    console.warn(`⚠️ [SERVICE] Seller not found: ${id}`);
    throw new AppError('Seller not found', 404);
  }

  console.log(`✅ [SERVICE] Found seller: ${seller.email}. Proceeding with deletion.`);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Manually delete dependent records to ensure no foreign key violations
    // Some relations might not have Cascade at the DB level even if defined in Prisma
    
    const storeIds = seller.stores.map((s) => s.id);
    
    if (storeIds.length > 0) {
      // 1. Delete all cart items related to products of these stores
      await tx.cartItem.deleteMany({
        where: { product: { store_id: { in: storeIds } } }
      });

      // 2. Delete all reviews related to products of these stores
      await tx.review.deleteMany({
        where: { product: { store_id: { in: storeIds } } }
      });

      // 3. Delete all order items related to products of these stores
      // NOTE: Usually you want to keep these for history, but if Cascade is intended, we do it
      await tx.orderItem.deleteMany({
        where: { product: { store_id: { in: storeIds } } }
      });

      // 4. Delete all products
      await tx.product.deleteMany({
        where: { store_id: { in: storeIds } }
      });

      // 5. Delete all categories
      await tx.category.deleteMany({
        where: { store_id: { in: storeIds } }
      });

      // 6. Delete all stores
      await tx.store.deleteMany({
        where: { id: { in: storeIds } }
      });
    }

    // 7. Delete sessions
    await tx.session.deleteMany({
      where: { seller_id: id }
    });

    // 8. Delete bank accounts
    await tx.bankAccount.deleteMany({
      where: { seller_id: id }
    });

    // 9. Delete notifications (loose relation by user_id string)
    await tx.notification.deleteMany({
      where: { user_id: id, role: 'seller' }
    });

    // 10. Finally delete the seller
    await tx.seller.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        action: 'DELETE_SELLER',
        entity_type: 'SELLER',
        entity_id: id,
        admin_id: adminId,
        details: { email: seller.email, business_name: seller.business_name },
      },
    });
  });
  console.log(`✨ [SERVICE] Successfully deleted seller: ${id}`);
};

// ---------------- Analytics & Payments ----------------

export const getAnalyticsService = async () => {
  const paymentsCount = await prisma.payment.count();
  const sellersCount = await prisma.seller.count();
  const gmvAgg = await prisma.payment.aggregate({ _sum: { amount_cents: true } });

  const totalCents = gmvAgg._sum?.amount_cents ?? 0;
  const gmv = totalCents / 100;

  return {
    paymentsCount,
    sellersCount,
    gmv_cents: totalCents,
    gmv,
  };
};

interface GetOrdersFilters {
  status?: string;
  provider?: string;
  from?: string | Date;
  to?: string | Date;
  page?: number | string;
  limit?: number | string;
}

/**
 * Get payments (orders)
 */
export const getOrdersService = async (filters: GetOrdersFilters = {}) => {
  const { status, provider, from, to, page = 1, limit = 50 } = filters;
  const where: Prisma.PaymentWhereInput = {};
  if (status) where.status = status as PaymentStatus;
  if (provider) where.provider = String(provider);
  
  if (from || to) {
    where.created_at = {};
    if (from) (where.created_at as Prisma.DateTimeFilter).gte = new Date(String(from));
    if (to) (where.created_at as Prisma.DateTimeFilter).lte = new Date(String(to));
  }

  const payments = await prisma.payment.findMany({
    where,
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
    orderBy: { created_at: 'desc' },
    include: {
      customer: true,
      seller: true,
    },
  });

  return payments;
};
