// src/lib/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

export { Prisma };
export const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma;
}

export default prisma;
