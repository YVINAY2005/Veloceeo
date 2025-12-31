#!/usr/bin/env ts-node

/**
 * Support Ticket Seed Script
 * 
 * This script seeds the database with comprehensive support ticket and mail system data.
 * Run this script to populate your database with sample tickets, templates, responses, and email logs.
 * 
 * Usage:
 *   npm run seed:support-tickets
 *   OR
 *   bun run seed:support-tickets
 *   OR
 *   ts-node seed_support_tickets.ts
 */

import { seedSupportTicketData, cleanupSupportTicketData } from './seed_support_ticket_data.js';

async function main() {
  const command = process.argv[2];
  
  console.log('🎫 Support Ticket & Mail System Seeder');
  console.log('=====================================\n');

  try {
    switch (command) {
      case 'clean':
        console.log('🧹 Cleaning up existing support ticket data...\n');
        await cleanupSupportTicketData();
        console.log('\n✅ Cleanup completed successfully!');
        break;
        
      case 'reset':
        console.log('🔄 Resetting support ticket data (clean + seed)...\n');
        await cleanupSupportTicketData();
        console.log('\n🌱 Now seeding fresh data...\n');
        await seedSupportTicketData();
        console.log('\n✅ Reset completed successfully!');
        break;
        
      default:
        console.log('🌱 Seeding support ticket data...\n');
        await seedSupportTicketData();
        console.log('\n✅ Seeding completed successfully!');
        break;
    }
    
    console.log('\n📚 Available commands:');
    console.log('  npm run seed:support-tickets        - Seed data (default)');
    console.log('  npm run seed:support-tickets clean  - Clean existing data');
    console.log('  npm run seed:support-tickets reset  - Clean and reseed data');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


export default main;
