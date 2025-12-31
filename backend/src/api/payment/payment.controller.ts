// src/api/payment/payment.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as paymentService from './payment.service';
import AppError from '../../utils/AppError';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const result = await paymentService.createOrderService(payload);
    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new AppError('Invalid id', 400);
    const payment = await paymentService.getPaymentByIdService(id);
    return res.json(payment);
  } catch (err) {
    next(err);
  }
};

export const listPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', status, provider } = req.query;
    const payments = await paymentService.listPaymentsService({
      page: Number(page),
      limit: Number(limit),
      status: status ? String(status) : undefined,
      provider: provider ? String(provider) : undefined,
    });
    return res.json(payments);
  } catch (err) {
    next(err);
  }
};

export const razorpayWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const headers = req.headers;
    const result = await paymentService.handleRazorpayWebhookService(payload, headers);
    // reply 200 to webhook quickly
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
