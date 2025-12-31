
import { prisma } from '../src/lib/prisma';

async function main() {
  const sessions = await prisma.session.findMany({
    take: 10,
    orderBy: { created_at: 'desc' }
  });
  console.log('Last 10 sessions:', JSON.stringify(sessions, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
