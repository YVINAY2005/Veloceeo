// src/api/payment/payment.service.ts
import Razorpay from 'razorpay';
import { config } from '../../config';
import prisma, { Prisma } from '../../lib/prisma';
import { PaymentStatus } from '@prisma/client';
import AppError from '../../utils/AppError';

interface CreateOrderPayload {
  totalAmount: number;
  items?: unknown[];
  customer?: { name?: string; phone?: string };
  metadata?: Prisma.InputJsonValue;
}

interface ListPaymentsFilters {
  page?: number | string;
  limit?: number | string;
  status?: string;
  provider?: string;
}

const razorpayClient = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID as string,
  key_secret: config.RAZORPAY_KEY_SECRET as string,
});

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export const createOrderService = async (payload: CreateOrderPayload) => {
  const totalAmount = Number(payload.totalAmount);
  if (!totalAmount || totalAmount <= 0) {
    throw new AppError('Invalid totalAmount', 400);
  }

  const amountPaise = Math.round(totalAmount * 100);

  // create razorpay order
  const order = (await razorpayClient.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    payment_capture: true,
  })) as RazorpayOrder;

  // create Payment record in DB
  const payment = await prisma.payment.create({
    data: {
      amount_cents: amountPaise,
      currency: order.currency ?? 'INR',
      provider: 'razorpay',
      provider_ref_id: order.id,
      status: 'INITIATED',
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

export const listPaymentsService = async (filters: ListPaymentsFilters = {}) => {
  const { page = 1, limit = 50, status, provider } = filters;
  const where: Prisma.PaymentWhereInput = {};
  if (status) where.status = status as PaymentStatus;
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

export const handleRazorpayWebhookService = async (payload: { event: string; payload?: { payment?: { entity?: { order_id?: string; status?: string; id?: string } } } }, headers: unknown) => {
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
