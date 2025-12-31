// src/utils/session.ts
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

export const SESSION_COOKIE_NAME = 'velecceo_session';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const createSession = async (payload: {
  customer_id?: number | null;
  seller_id?: string | null; // Changed to string to match schema
  admin_id?: number | null;
  ip?: string | null;
  user_agent?: string | null;
  ttlMs?: number;
}) => {
  const session_id = crypto.randomBytes(20).toString('hex');
  const expires_at = new Date(Date.now() + (payload.ttlMs ?? SESSION_TTL_MS));
  const data: any = {
    session_id,
    expires_at,
    ip_address: payload.ip ?? null,
    user_agent: payload.user_agent ?? null,
  };
  if (payload.customer_id) data.customer_id = payload.customer_id;
  if (payload.seller_id) data.seller_id = payload.seller_id;
  if (payload.admin_id) data.admin_id = payload.admin_id;

  const session = await prisma.session.create({ data });
  return session;
};

export const renewSession = async (sessionId: string) => {
  const expires_at = new Date(Date.now() + SESSION_TTL_MS);
  return await prisma.session.update({
    where: { session_id: sessionId },
    data: { expires_at }
  });
};
