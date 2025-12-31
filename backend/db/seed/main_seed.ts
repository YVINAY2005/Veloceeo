
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // 1. Create an Admin
  const adminEmail = (process.env.ALLOWED_ADMIN_EMAIL || 'veloceo69@gmail.com').replace(/['"]/g, '');
  const adminPassword = (process.env.ADMIN_PASSWORD || 'admin123').replace(/['"]/g, '');
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  
  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { password: hashedAdminPassword },
    create: {
      email: adminEmail,
      password: hashedAdminPassword,
      name: 'Super Admin',
      is_super: true,
    },
  });
  console.log('✅ Admin created');

  // 2. Create a Seller
  const hashedPassword = await bcrypt.hash('password123', 10);
  const seller = await prisma.seller.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      id: 'test_seller_1',
      email: 'seller@example.com',
      password: hashedPassword,
      name: 'Test Seller',
      business_name: 'Veloceeo Store',
      is_verified: true,
    },
  });
  console.log('✅ Seller created');

  // 2. Create a Store
  const store = await prisma.store.upsert({
    where: { slug: 'veloceeo-official' },
    update: {},
    create: {
      seller_id: seller.id,
      name: 'Veloceeo Official Store',
      slug: 'veloceeo-official',
      description: 'The official store for Veloceeo products',
    },
  });
  console.log('✅ Store created');

  // 3. Create Categories
  const categoriesData = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Fashion', slug: 'fashion' },
    { name: 'Home & Kitchen', slug: 'home-kitchen' },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        store_id: store.id,
        name: cat.name,
        slug: cat.slug,
      },
    });
    categories.push(category);
  }
  console.log('✅ Categories created');

  // 4. Create Products
  const productsData = [
    {
      name: 'Smartphone X',
      slug: 'smartphone-x',
      sku: 'PHONE-X-001',
      price_cents: 49900,
      category_id: categories[0].id,
    },
    {
      name: 'Wireless Headphones',
      slug: 'wireless-headphones',
      sku: 'HEAD-001',
      price_cents: 9900,
      category_id: categories[0].id,
    },
    {
      name: 'Classic T-Shirt',
      slug: 'classic-tshirt',
      sku: 'TSHIRT-001',
      price_cents: 1900,
      category_id: categories[1].id,
    },
  ];

  for (const prod of productsData) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        store_id: store.id,
        category_id: prod.category_id,
        name: prod.name,
        slug: prod.slug,
        sku: prod.sku,
        price_cents: prod.price_cents,
        stock_quantity: 100,
      },
    });
  }
  console.log('✅ Products created');

  console.log('🚀 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
