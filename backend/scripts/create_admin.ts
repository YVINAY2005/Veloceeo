// scripts/create_admin.ts (top)
/// <reference types="node" />
import prisma from '../src/lib/prisma'; // <-- reuse the same prisma instance used by the app
import bcrypt from 'bcryptjs';

async function main() {
  const email = (process.env.ALLOWED_ADMIN_EMAIL || 'veloceo69@gmail.com').toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashed = await bcrypt.hash(rawPassword, 12);

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin already exists. id=', existing.id);
    return;
  }

  const admin = await prisma.admin.create({
    data: { email, password: hashed, name: 'Veloceeo Admin', is_super: true },
  });
  console.log('Created admin id:', admin.id, 'plain password:', rawPassword);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
