// src/lib/prisma.ts
import { PrismaClient } from '../../db/generated/prisma';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;
}

export default prisma;
