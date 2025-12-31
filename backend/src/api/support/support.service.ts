// src/api/support/support.service.ts
import AppError from '../../utils/AppError';
import { prisma } from '../../lib/prisma';
import { Prisma, TicketStatus } from '@prisma/client';

export interface ConversationEntry {
  sender_type: 'customer' | 'seller' | 'admin';
  message: string;
  timestamp: string;
}

interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: string | null;
  customer_id?: number | null;
  seller_id?: string | null; // 🔥 FIXED: Changed from number to string
  admin_id?: number | null;
}

export const createTicket = async (data: CreateTicketInput) => {
  if (!data.customer_id && !data.seller_id && !data.admin_id) {
    throw new AppError('A valid user must be associated with a ticket.', 400);
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      subject: data.subject,
      description: data.description,
      priority: data.priority ?? null,
      status: 'OPEN',
      customer_id: data.customer_id ?? null,
      seller_id: data.seller_id ?? null, // ✅ Now correctly typed as string | null
      admin_id: data.admin_id ?? null,
      conversation: [],
    },
  });

  return ticket;
};

export const addConversationMessage = async (ticketId: number, message: ConversationEntry) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError('Support ticket not found', 404);

  const conversation = (ticket.conversation as ConversationEntry[] | null) ?? [];
  conversation.push(message);

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { conversation: conversation as unknown as Prisma.InputJsonValue },
  });

  return updated;
};

export const getTickets = async (filter?: {
  customer_id?: number;
  seller_id?: string; // 🔥 FIXED: Changed from number to string
  admin_id?: number;
  status?: string;
}) => {
  const where: Prisma.SupportTicketWhereInput = {};
  if (filter?.customer_id) where.customer_id = filter.customer_id;
  if (filter?.seller_id) where.seller_id = filter.seller_id;
  if (filter?.admin_id) where.admin_id = filter.admin_id;
  if (filter?.status) where.status = filter.status as TicketStatus;

  return prisma.supportTicket.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
};

export const getTicketById = async (id: number) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw new AppError('Ticket not found', 404);
  return ticket;
};

export const updateTicketStatus = async (id: number, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') => {
  const updated = await prisma.supportTicket.update({
    where: { id },
    data: { status },
  });
  return updated;
};

export const deleteTicket = async (id: number) => {
  await prisma.supportTicket.delete({ where: { id } });
  return { message: 'Ticket deleted successfully' };
};