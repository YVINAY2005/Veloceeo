// src/api/customer/customer.service.ts
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';
import AppError from '../../utils/AppError';
import { notifyPasswordReset } from '../../api/notification/notification.service';
import { createSession, SESSION_TTL_MS } from '../../utils/session';

function signToken(sessionId: string, role: 'admin' | 'seller' | 'customer') {
  return jwt.sign({ session_id: sessionId, role }, config.JWT_SECRET as string, { expiresIn: '24h' });
}

export const signupService = async (payload: any) => {
  const { email, password, name, phone } = payload;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const hashed = await bcrypt.hash(password, 12);

  const customer = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.create({
      data: {
        email,
        password: hashed,
        name: name ?? null,
        phone: phone ?? null,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'CUSTOMER_SIGNUP',
        entity_type: 'CUSTOMER',
        entity_id: String(c.id),
        details: { 
          email: c.email,
          customer_id: c.id 
        },
      },
    });

    return c;
  });

  // 🔥 Send welcome email (async, don't block signup)
  import('../../api/notification/notification.service')
    .then(({ notifyCustomerSignup }) => notifyCustomerSignup(customer.id))
    .catch((err) => console.error('Background email error:', err));

  return { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone };
};

export const loginService = async (payload: any) => {
  const { email, password } = payload;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) throw new AppError('Invalid credentials', 401);

  const match = await bcrypt.compare(password, customer.password);
  if (!match) throw new AppError('Invalid credentials', 401);

  const session = await createSession({
    customer_id: customer.id,
    ip: payload.ip,
    user_agent: payload.userAgent,
  });

  const token = signToken(session.session_id, 'customer');

  return { token, expiresAt: session.expires_at, user: { id: customer.id, email: customer.email, name: customer.name } };
};

export const logoutService = async (sessionId: string | undefined) => {
  if (!sessionId) return;
  await prisma.session.deleteMany({ where: { session_id: sessionId } });
};

export const forgotPasswordService = async (email: string) => {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) {
    throw new AppError('There is no user with that email address.', 404);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const passwordResetToken = await bcrypt.hash(resetToken, 12);
  const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      password_reset_token: passwordResetToken,
      password_reset_expires: passwordResetExpires,
    },
  });

  // Send password reset email
  await notifyPasswordReset(customer.email, resetToken);

  return resetToken;
};

export const resetPasswordService = async (token: string, password: string) => {
  const hashedToken = await bcrypt.hash(token, 12);

  const customer = await prisma.customer.findFirst({
    where: {
      password_reset_token: hashedToken,
      password_reset_expires: { gt: new Date() },
    },
  });

  if (!customer) {
    throw new AppError('Token is invalid or has expired.', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      password: hashedPassword,
      password_reset_token: null,
      password_reset_expires: null,
    },
  });

  return { message: 'Password has been reset successfully.' };
};

export const demoLoginService = async (metadata?: any) => {
  // create or reuse a demo customer
  const email = `demo_${Date.now()}@example.com`;
  const hashed = await bcrypt.hash('demo', 8);
  const customer = await prisma.customer.create({
    data: { email, password: hashed, name: 'Demo User' },
  });
  
  const session = await createSession({
    customer_id: customer.id,
    ip: metadata?.ip,
    user_agent: metadata?.userAgent,
  });

  const token = signToken(session.session_id, 'customer');
  return { token, expiresAt: session.expires_at, user: { id: customer.id, email: customer.email, name: customer.name } };
};
export const getMeService = async (userId: number) => {
  const customer = await prisma.customer.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
};

export const updateMeService = async (userId: number, payload: any) => {
  const allowed: any = {};
  if (payload.name !== undefined) allowed.name = payload.name;
  if (payload.phone !== undefined) allowed.phone = payload.phone;
  if (payload.password !== undefined) {
    allowed.password = await bcrypt.hash(payload.password, 12);
  }

  const updated = await prisma.customer.update({
    where: { id: userId },
    data: allowed,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      is_active: true,
      updated_at: true,
    },
  });

  return updated;
};

/**
 * 🔥 FIXED: seller_id is now String (from Store relation)
 */
export const createOrderService = async (userId: number, payload: any) => {
  const { items, shipping, paymentMethod } = payload;
  if (!Array.isArray(items) || items.length === 0) throw new AppError('No items provided', 400);

  const productIds = items.map((it: any) => it.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { store: true },
  });

  if (products.length !== productIds.length) {
    throw new AppError('One or more products not found', 400);
  }

  let totalCents = 0;
  const itemsDetail: any[] = [];
  
  // 🔥 Get seller_id from the first product's store
  let sellerId: string | null = null;

  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) throw new AppError(`Product ${it.productId} not found`, 400);
    
    const qty = Number(it.quantity || 1);
    if (qty <= 0) throw new AppError('Quantity must be >= 1', 400);
    
    if (p.stock_quantity < qty) {
      throw new AppError(`Insufficient stock for product ${p.id}`, 400);
    }
    
    const lineTotal = p.price_cents * qty;
    totalCents += lineTotal;
    
    // 🔥 Get seller_id from store (store.seller_id is String)
    if (!sellerId && p.store) {
      sellerId = p.store.seller_id;
    }
    
    itemsDetail.push({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      unit_price_cents: p.price_cents,
      quantity: qty,
      line_total_cents: lineTotal,
      storeId: p.store_id,
    });
  }

  // 🔥 seller_id is now String (no conversion needed)
  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        customer_id: userId,
        seller_id: sellerId, // ✅ Now correctly using String seller_id
        amount_cents: totalCents,
        currency: 'INR',
        provider: 'razorpay',
        status: 'INITIATED',
        metadata: {
          items: itemsDetail,
          shipping: shipping ?? null,
          paymentMethod: paymentMethod ?? null,
        },
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        action: 'CREATE_ORDER',
        entity_type: 'PAYMENT',
        entity_id: String(p.id),
        seller_id: sellerId,
        details: { 
          amount: p.amount_cents, 
          itemCount: itemsDetail.length,
          customer_id: userId
        },
      },
    });

    return p;
  });

  return {
    paymentId: payment.id,
    amount_cents: payment.amount_cents,
    currency: payment.currency,
    provider: payment.provider,
    status: payment.status,
    metadata: payment.metadata,
  };
};

export const getOrderService = async (userId: number, paymentId: number) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      customer: true,
      seller: true,
    },
  });
  if (!payment) throw new AppError('Order not found', 404);
  if (payment.customer_id !== userId) throw new AppError('Forbidden', 403);

  return payment;
};
