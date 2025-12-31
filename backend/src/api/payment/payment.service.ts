// src/api/payment/payment.service.ts
import Razorpay from 'razorpay';
import { config } from '../../config';
import prisma from '../../lib/prisma';
import AppError from '../../utils/AppError';

const razorpayClient = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID as string,
  key_secret: config.RAZORPAY_KEY_SECRET as string,
});

export const createOrderService = async (payload: {
  totalAmount: number;
  items?: any[];
  customer?: { name?: string; phone?: string };
  metadata?: any;
}) => {
  const totalAmount = Number(payload.totalAmount);
  if (!totalAmount || totalAmount <= 0) {
    throw new AppError('Invalid totalAmount', 400);
  }

  const amountPaise = Math.round(totalAmount * 100);

  // create razorpay order
  // NOTE: payment_capture in some typings is boolean; use true to satisfy TS
  const order = (await razorpayClient.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    payment_capture: true, // was `1` before — change to boolean to match typings
  })) as any;

  // create Payment record in DB
  // Avoid casting to Prisma.PaymentStatus (your generated client shape caused errors).
  // Simply write the enum string; Prisma will accept it at runtime.
  const payment = await prisma.payment.create({
    data: {
      amount_cents: amountPaise,
      currency: order.currency ?? 'INR',
      provider: 'razorpay',
      provider_ref_id: order.id,
      status: 'INITIATED', // keep as plain string to avoid mismatched enum typing issues
      metadata: payload.metadata ?? {},
    },
  });

  return {
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config.RAZORPAY_KEY_ID,
    paymentId: payment.id,
  };
};

export const getPaymentByIdService = async (id: number) => {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError('Payment not found', 404);
  return payment;
};

export const listPaymentsService = async ({ page = 1, limit = 50, status, provider }: any) => {
  const where: any = {};
  if (status) where.status = String(status);
  if (provider) where.provider = String(provider);

  const payments = await prisma.payment.findMany({
    where,
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit),
    orderBy: { created_at: 'desc' },
    include: { customer: true, seller: true },
  });

  return payments;
};

export const handleRazorpayWebhookService = async (payload: any, headers: any) => {
  const event = payload.event;
  if (event === 'payment.captured' || event === 'payment.authorized') {
    const razorpayPayment = payload.payload?.payment?.entity;
    if (!razorpayPayment) return { handled: false };

    const providerRef = razorpayPayment.order_id || razorpayPayment.id;
    if (!providerRef) return { handled: false };

    await prisma.payment.updateMany({
      where: { provider_ref_id: providerRef },
      data: { status: 'SUCCESS' },
    });

    return { handled: true };
  }

  if (event === 'payment.failed') {
    const razorpayPayment = payload.payload?.payment?.entity;
    const providerRef = razorpayPayment?.order_id || razorpayPayment?.id;
    if (providerRef) {
      await prisma.payment.updateMany({
        where: { provider_ref_id: providerRef },
        data: { status: 'FAILED' },
      });
    }
    return { handled: true };
  }

  return { handled: false };
};
