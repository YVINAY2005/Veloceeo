// src/api/bank/bank.controller.ts
import { Request, Response } from 'express';
import * as bankService from './bank.service';
import { catchAsync } from '../../utils/catchAsync';

export const addBankAccount = catchAsync(async (req: Request, res: Response) => {
  // 🔥 FIXED: Convert to string (sellers have string IDs)
  const sellerId = String(req.userId!);
  const bank = await bankService.addBankAccount(sellerId, req.body);

  res.status(201).json({ status: 'success', data: bank });
});

export const getBankAccounts = catchAsync(async (req: Request, res: Response) => {
  // 🔥 FIXED: Convert to string
  const sellerId = String(req.userId!);
  const accounts = await bankService.getAllBankAccounts(sellerId);
  res.json({ status: 'success', data: accounts });
});

export const getPrimaryBank = catchAsync(async (req: Request, res: Response) => {
  // 🔥 FIXED: Convert to string
  const sellerId = String(req.userId!);
  const primary = await bankService.getPrimaryBank(sellerId);
  res.json({ status: 'success', data: primary });
});

export const updateBankAccount = catchAsync(async (req: Request, res: Response) => {
  // 🔥 FIXED: Convert to string
  const sellerId = String(req.userId!);
  const bankId = Number(req.params.id);

  const updated = await bankService.updateBankAccount(sellerId, bankId, req.body);
  res.json({ status: 'success', data: updated });
});

export const deleteBankAccount = catchAsync(async (req: Request, res: Response) => {
  // 🔥 FIXED: Convert to string
  const sellerId = String(req.userId!);
  const bankId = Number(req.params.id);

  const result = await bankService.deleteBankAccount(sellerId, bankId);
  res.json({ status: 'success', data: result });
});

export const getBankAccount = catchAsync(async (req: Request, res: Response) => {
  // 🔥 FIXED: Convert to string
  const sellerId = String(req.userId!);
  const bankId = Number(req.params.id);

  const account = await bankService.getBankAccount(sellerId, bankId);

  res.json({ status: 'success', data: account });
});