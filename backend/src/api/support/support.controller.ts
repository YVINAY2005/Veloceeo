import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import * as supportService from './support.service';

export const createTicket = catchAsync(async (req: Request, res: Response) => {
  const role = req.role;
  const userId = req.userId;

  const data: {
    subject: string;
    description: string;
    priority: string | null;
    customer_id?: number;
    seller_id?: string;
    admin_id?: number;
  } = {
    subject: req.body.subject,
    description: req.body.description,
    priority: req.body.priority ?? null,
  };

  if (role === 'customer') data.customer_id = Number(userId);
  if (role === 'seller') data.seller_id = String(userId);
  if (role === 'admin') data.admin_id = Number(userId);

  const ticket = await supportService.createTicket(data);
  res.status(201).json({ status: 'success', data: { ticket } });
});

export const addMessage = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const role = req.role;

  const message = {
    sender_type: role as 'customer' | 'seller' | 'admin',
    message: req.body.message,
    timestamp: new Date().toISOString(),
  };

  const updated = await supportService.addConversationMessage(Number(ticketId), message);
  res.json({ status: 'success', data: { ticket: updated } });
});

export const listTickets = catchAsync(async (req: Request, res: Response) => {
  const role = req.role;
  const userId = req.userId;

  const filter: {
    customer_id?: number;
    seller_id?: string;
    admin_id?: number;
    status?: string;
  } = {};

  if (role === 'customer') filter.customer_id = Number(userId);
  if (role === 'seller') filter.seller_id = String(userId);
  if (role === 'admin') filter.admin_id = Number(userId);
  if (req.query.status) filter.status = String(req.query.status);

  const tickets = await supportService.getTickets(filter);
  res.json({ status: 'success', data: { tickets } });
});

export const getTicketById = catchAsync(async (req: Request, res: Response) => {
  const ticket = await supportService.getTicketById(Number(req.params.id));
  res.json({ status: 'success', data: { ticket } });
});

export const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await supportService.updateTicketStatus(Number(id), status);
  res.json({ status: 'success', data: { ticket: updated } });
});

export const deleteTicket = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await supportService.deleteTicket(Number(id));
  res.json({ status: 'success', data: result });
});
