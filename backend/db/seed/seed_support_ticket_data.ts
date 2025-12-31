import { PrismaClient, TicketCategory, TicketPriority, TicketStatus , user } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function seedSupportTicketData() {
  console.log('🎫 Seeding Support Ticket & Mail system data...');

  try {
    // 1. Create ticket templates for common issues
    console.log('📋 Creating ticket templates...');
    const templates = await Promise.all([
      prisma.ticket_template.upsert({
        where: { id: 1 },
        update: {},
        create: {
          name: 'Product Not Working',
          category: 'PRODUCT',
          subject_template: 'Product Issue: {{product_name}}',
          body_template: `Dear Customer,

Thank you for contacting us regarding the product issue with {{product_name}}.

We understand your frustration and are here to help resolve this matter quickly.

To better assist you, please provide:
1. Order number
2. Product details
3. Description of the issue
4. Any photos or videos of the problem

Our team will review your case and respond within 24 hours.

Best regards,
Customer Support Team`,
          is_active: true
        }
      }),
      prisma.ticket_template.upsert({
        where: { id: 2 },
        update: {},
        create: {
          name: 'Order Delivery Issue',
          category: 'ORDER',
          subject_template: 'Order Delivery Problem: {{order_number}}',
          body_template: `Dear Customer,

We apologize for the delivery issue with your order {{order_number}}.

We are actively investigating this matter and will provide you with:
1. Updated tracking information
2. Expected delivery timeline
3. Resolution options if applicable

Our logistics team is working to resolve this as quickly as possible.

Thank you for your patience.

Best regards,
Customer Support Team`,
          is_active: true
        }
      }),
      prisma.ticket_template.upsert({
        where: { id: 3 },
        update: {},
        create: {
          name: 'Payment Issue',
          category: 'PAYMENT',
          subject_template: 'Payment Problem Resolution',
          body_template: `Dear Customer,

Thank you for reporting the payment issue. We take payment security and accuracy very seriously.

Our billing team will:
1. Review your payment transaction
2. Verify all charges
3. Process any necessary refunds
4. Update your account accordingly

We will resolve this within 3-5 business days and keep you updated throughout the process.

Best regards,
Customer Support Team`,
          is_active: true
        }
      }),
      prisma.ticket_template.upsert({
        where: { id: 4 },
        update: {},
        create: {
          name: 'Account Access Problem',
          category: 'ACCOUNT',
          subject_template: 'Account Access Assistance',
          body_template: `Dear Customer,

We understand you're having trouble accessing your account. Account security is our priority.

To restore your account access, we may need to:
1. Verify your identity
2. Reset your password
3. Update your security settings
4. Review recent account activity

Please provide any additional information that might help us assist you better.

Best regards,
Customer Support Team`,
          is_active: true
        }
      }),
      prisma.ticket_template.upsert({
        where: { id: 5 },
        update: {},
        create: {
          name: 'Technical Issue',
          category: 'TECHNICAL_ISSUE',
          subject_template: 'Technical Support Required',
          body_template: `Dear Customer,

Thank you for reporting this technical issue. Our technical team is here to help.

To troubleshoot effectively, please provide:
1. Device and browser information
2. Steps to reproduce the issue
3. Error messages (if any)
4. Screenshots or screen recordings

Our technical team will investigate and provide a solution within 24-48 hours.

Best regards,
Technical Support Team`,
          is_active: true
        }
      }),
      prisma.ticket_template.upsert({
        where: { id: 6 },
        update: {},
        create: {
          name: 'Feature Request',
          category: 'FEATURE_REQUEST',
          subject_template: 'Feature Request: {{feature_name}}',
          body_template: `Dear Customer,

Thank you for your feature request. We value customer feedback and suggestions.

Your request for {{feature_name}} has been logged and will be:
1. Reviewed by our product team
2. Evaluated for feasibility
3. Prioritized based on customer demand
4. Added to our development roadmap if approved

We'll keep you updated on the status of your request.

Best regards,
Product Team`,
          is_active: true
        }
      })
    ]);
    
    console.log(`✅ Created ${templates.length} ticket templates`);

    // 2. Create some users for testing (if they don't exist)
    console.log('👥 Creating test users...');
    const testUsers = await Promise.all([
      prisma.user.upsert({
        where: { email: 'customer1@example.com' },
        update: {},
        create: {
          email: 'customer1@example.com',
          password: 'hashedpassword123',
          name: 'Alice Johnson',
          phone: '+1-555-0201',
          latitude: 40.7589,
          longitude: -73.9851
        }
      }),
      prisma.user.upsert({
        where: { email: 'customer2@example.com' },
        update: {},
        create: {
          email: 'customer2@example.com',
          password: 'hashedpassword456',
          name: 'Bob Wilson',
          phone: '+1-555-0202',
          latitude: 34.0522,
          longitude: -118.2437
        }
      }),
      prisma.user.upsert({
        where: { email: 'support@example.com' },
        update: {},
        create: {
          email: 'support@example.com',
          password: 'hashedpassword789',
          name: 'Support Agent',
          phone: '+1-555-0100'
        }
      })
    ]);
    
    console.log(`✅ Created ${testUsers.length} test users`);

    // 3. Create sellers for testing (if they don't exist)
    console.log('👤 Creating test sellers...');
    const supportUser = testUsers.find((u: user) => u.email === 'support@example.com');
    if (!supportUser) throw new Error('Support user not found');
    
    const testSellers = await Promise.all([
      prisma.seller.upsert({
        where: { seller_email: 'techstore@example.com' },
        update: {},
        create: {
          seller_name: 'TechWorld Electronics Owner',
          seller_email: 'techstore@example.com',
          seller_password: 'hashedpassword123',
          seller_phone: '+1-555-0301',
          seller_address: '123 Technology Ave, Silicon Valley, CA 94000',
          seller_latitude: 37.4419,
          seller_longitude: -122.1430,
          business_license: 'BL123456789',
          tax_id: 'TAX123456789',
          is_verified: true,
          verification_date: new Date()
        }
      })
    ]);
    
    console.log(`✅ Created ${testSellers.length} test sellers`);

    // 4. Create stores for testing (if they don't exist)
    console.log('🏪 Creating test stores...');
    
    const testStores = await Promise.all([
      prisma.store.upsert({
        where: { email: 'techstore@example.com' },
        update: {},
        create: {
          name: 'TechWorld Electronics',
          address: '123 Technology Ave, Silicon Valley, CA 94000',
          phone: '+1-555-0301',
          email: 'techstore@example.com',
          latitude: 37.4419,
          longitude: -122.1430,
          user_id: supportUser.id,
          seller_id: testSellers[0]!.id,
          pan_number: 'ABCDE1234F',
          adhar_number: '123456789012',
          gst_number: '12ABCDE1234F1Z5'
        }
      })
    ]);
    
    console.log(`✅ Created ${testStores.length} test stores`);

    // 5. Create sample support tickets
    console.log('🎫 Creating sample support tickets...');
    
    // Generate ticket numbers
    const generateTicketNumber = (index: number) => {
      const year = new Date().getFullYear();
      const paddedIndex = String(index).padStart(6, '0');
      return `TKT-${year}-${paddedIndex}`;
    };

    const currentDate = new Date();
    const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const sampleTickets = [
      // Customer tickets
      {
        ticket_number: generateTicketNumber(1),
        user_id: testUsers.find((u: user)=> u.email === 'customer1@example.com')?.id,
        subject: 'Unable to complete payment for order',
        description: 'I am trying to purchase a laptop but the payment keeps failing. I have tried multiple credit cards but none of them work. The error message says "Payment processing failed" but doesn\'t give more details.',
        category: 'PAYMENT' as TicketCategory,
        priority: 'HIGH' as TicketPriority,
        status: 'OPEN' as TicketStatus,
        contact_name: 'Alice Johnson',
        contact_email: 'customer1@example.com',
        contact_phone: '+1-555-0201',
        browser_info: 'Chrome 120.0.0.0',
        device_info: 'Desktop - Windows 11',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        page_url: 'https://ecommerce.com/checkout',
        created_at: currentDate,
        updated_at: currentDate
      },
      {
        ticket_number: generateTicketNumber(2),
        user_id: testUsers.find((u:user) => u.email === 'customer2@example.com')?.id,
        subject: 'Product received damaged',
        description: 'I ordered a smartphone last week and it arrived today with a cracked screen. The packaging seemed fine but the phone was clearly damaged. I need a replacement or refund.',
        category: 'PRODUCT' as TicketCategory,
        priority: 'MEDIUM' as TicketPriority,
        status: 'IN_PROGRESS' as TicketStatus,
        contact_name: 'Bob Wilson',
        contact_email: 'customer2@example.com',
        contact_phone: '+1-555-0202',
        browser_info: 'Safari 17.1',
        device_info: 'iPhone 15 Pro',
        ip_address: '192.168.1.101',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X)',
        page_url: 'https://ecommerce.com/my-orders',
        assigned_to: 'support@example.com',
        created_at: yesterday,
        updated_at: currentDate,
        last_response_at: currentDate
      },
      {
        ticket_number: generateTicketNumber(3),
        user_id: testUsers.find((u: user) => u.email === 'customer1@example.com')?.id,
        subject: 'Account locked after multiple login attempts',
        description: 'My account has been locked after I forgot my password and tried logging in multiple times. I need help unlocking it and resetting my password.',
        category: 'ACCOUNT' as TicketCategory,
        priority: 'MEDIUM' as TicketPriority,
        status: 'RESOLVED' as TicketStatus,
        contact_name: 'Alice Johnson',
        contact_email: 'customer1@example.com',
        contact_phone: '+1-555-0201',
        browser_info: 'Firefox 121.0',
        device_info: 'Desktop - MacOS Sonoma',
        ip_address: '192.168.1.102',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0)',
        page_url: 'https://ecommerce.com/login',
        assigned_to: 'support@example.com',
        resolution: 'Account unlocked and password reset email sent. Customer was able to access account successfully.',
        resolution_date: currentDate,
        created_at: twoDaysAgo,
        updated_at: currentDate,
        last_response_at: currentDate
      },
      // Anonymous tickets
      {
        ticket_number: generateTicketNumber(4),
        subject: 'Website loading very slow',
        description: 'The website takes forever to load, especially the product pages. Sometimes it times out completely. This has been happening for the past few days.',
        category: 'TECHNICAL_ISSUE' as TicketCategory,
        priority: 'LOW' as TicketPriority,
        status: 'OPEN' as TicketStatus,
        contact_name: 'Anonymous User',
        contact_email: 'anonymous@guest.com',
        contact_phone: null,
        browser_info: 'Edge 120.0.0.0',
        device_info: 'Desktop - Windows 10',
        ip_address: '203.0.113.5',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        page_url: 'https://ecommerce.com/products/electronics',
        created_at: weekAgo,
        updated_at: weekAgo
      },
      // Store-related ticket
      {
        ticket_number: generateTicketNumber(5),
        store_id: testStores[0].id,
        subject: 'Request to add new product category',
        description: 'I would like to request adding a new product category for "Smart Home Devices" as we have many products that don\'t fit well in the current categories.',
        category: 'FEATURE_REQUEST' as TicketCategory,
        priority: 'LOW' as TicketPriority,
        status: 'WAITING_FOR_RESPONSE' as TicketStatus,
        contact_name: 'TechWorld Electronics',
        contact_email: 'techstore@example.com',
        contact_phone: '+1-555-0301',
        browser_info: 'Chrome 120.0.0.0',
        device_info: 'Desktop - Windows 11',
        ip_address: '192.168.1.103',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        page_url: 'https://ecommerce.com/seller/products',
        assigned_to: 'support@example.com',
        created_at: twoDaysAgo,
        updated_at: yesterday,
        last_response_at: yesterday
      }
    ];

    const createdTickets: any[] = [];
    for (const ticketData of sampleTickets as any[]) {
      const ticket = await prisma.support_ticket.create({
        data: ticketData
      });
      createdTickets.push(ticket);
    }
    
    console.log(`✅ Created ${createdTickets.length} sample support tickets`);

    // 6. Create sample ticket responses
    console.log('💬 Creating sample ticket responses...');
    
    if (createdTickets.length < 5) {
      throw new Error('Not enough tickets created for responses');
    }
    
    const sampleResponses = [
      // Responses for ticket 2 (damaged product)
      {
        ticket_id: createdTickets[1]!.id,
        message: 'Thank you for reporting this issue. I sincerely apologize for the damaged smartphone you received. This is definitely not the quality we strive for.\n\nTo process your replacement quickly, could you please:\n1. Take photos of the damaged screen\n2. Provide your order number\n3. Confirm your shipping address\n\nOnce I receive this information, I\'ll immediately arrange for a replacement device to be shipped to you with expedited delivery at no extra cost.',
        is_internal: false,
        is_from_customer: false,
        author_type: 'support',
        author_name: 'Support Agent',
        author_email: 'support@example.com',
        author_id: 'support-001',
        created_at: yesterday,
        updated_at: yesterday
      },
      {
        ticket_id: createdTickets[1]!.id,
        message: 'Hi, thank you for the quick response! Here are the details you requested:\n\nOrder number: ORD-2024-001234\nShipping address: 456 Main St, Los Angeles, CA 90210\n\nI\'ve attached photos of the damaged screen. As you can see, there\'s a large crack across the entire display. The phone powers on but the touch screen doesn\'t work properly.\n\nI appreciate your help with getting this resolved quickly.',
        is_internal: false,
        is_from_customer: true,
        author_type: 'customer',
        author_name: 'Bob Wilson',
        author_email: 'customer2@example.com',
        author_id: testUsers.find((u:user) => u.email === 'customer2@example.com')?.id?.toString(),
        attachments: JSON.stringify([
          { filename: 'damaged_screen_1.jpg', url: '/uploads/tickets/damaged_screen_1.jpg' },
          { filename: 'damaged_screen_2.jpg', url: '/uploads/tickets/damaged_screen_2.jpg' }
        ]),
        created_at: currentDate,
        updated_at: currentDate
      },
      
      // Responses for ticket 3 (account locked - resolved)
      {
        ticket_id: createdTickets[2]!.id,
        message: 'Hello Alice, I can help you with your locked account.\n\nI\'ve reviewed your account and can see that it was automatically locked due to multiple failed login attempts, which is a security measure to protect your account.\n\nI\'ve now unlocked your account and sent you a password reset email. Please check your inbox (including spam folder) for the reset link. The link will be valid for 24 hours.\n\nOnce you reset your password, you should be able to log in normally. Let me know if you encounter any further issues.',
        is_internal: false,
        is_from_customer: false,
        author_type: 'support',
        author_name: 'Support Agent',
        author_email: 'support@example.com',
        author_id: 'support-001',
        created_at: twoDaysAgo,
        updated_at: twoDaysAgo
      },
      {
        ticket_id: createdTickets[2]!.id,
        message: 'Perfect! I received the password reset email and was able to successfully reset my password and log into my account. Everything is working fine now. Thank you so much for the quick help!',
        is_internal: false,
        is_from_customer: true,
        author_type: 'customer',
        author_name: 'Alice Johnson',
        author_email: 'customer1@example.com',
        author_id: testUsers.find((u:user)=> u.email === 'customer1@example.com')?.id?.toString(),
        created_at: currentDate,
        updated_at: currentDate
      },
      {
        ticket_id: createdTickets[2]!.id,
        message: 'Wonderful! I\'m glad we could resolve this quickly for you. Your account is now secure and fully functional. Don\'t hesitate to reach out if you need any assistance in the future. I\'m marking this ticket as resolved.',
        is_internal: false,
        is_from_customer: false,
        author_type: 'support',
        author_name: 'Support Agent',
        author_email: 'support@example.com',
        author_id: 'support-001',
        created_at: currentDate,
        updated_at: currentDate
      },

      // Internal note for ticket 5 (feature request)
      {
        ticket_id: createdTickets[4]!.id,
        message: 'Feature request from TechWorld Electronics for Smart Home Devices category. This is the 3rd similar request this month. Should escalate to product team for evaluation.',
        is_internal: true,
        is_from_customer: false,
        author_type: 'support',
        author_name: 'Support Agent',
        author_email: 'support@example.com',
        author_id: 'support-001',
        created_at: yesterday,
        updated_at: yesterday
      },
      {
        ticket_id: createdTickets[4]!.id,
        message: 'Thank you for your feature request regarding the Smart Home Devices category.\n\nI\'ve forwarded your suggestion to our product team for evaluation. Given the growing popularity of smart home technology, this seems like a valuable addition to our platform.\n\nThe product team typically reviews feature requests on a monthly basis, and I expect to have an update for you within the next 2-3 weeks. I\'ll keep you informed of any progress.\n\nIn the meantime, you can continue listing smart home products under the most relevant existing categories.',
        is_internal: false,
        is_from_customer: false,
        author_type: 'support',
        author_name: 'Support Agent',
        author_email: 'support@example.com',
        author_id: 'support-001',
        created_at: yesterday,
        updated_at: yesterday
      }
    ];

    const createdResponses: any = [];
    for (const responseData of sampleResponses as any[]) {
      const response = await prisma.ticket_response.create({
        data: responseData
      });
      createdResponses.push(response);
    }
    
    console.log(`✅ Created ${createdResponses.length} sample ticket responses`);

    // 7. Create sample email logs
    console.log('📧 Creating sample email logs...');
    
    const sampleEmailLogs = [
      // Email logs for ticket creation
      {
        ticket_id: createdTickets[0]!.id,
        email_type: 'ticket_created',
        recipient_email: 'customer1@example.com',
        recipient_name: 'Alice Johnson',
        subject: 'Support Ticket Created: TKT-2024-000001',
        body: 'Your support ticket has been created successfully. We will respond within 24 hours.',
        status: 'sent',
        sent_at: currentDate,
        message_id: 'msg_001_' + Date.now(),
        provider: 'nodemailer'
      },
      {
        ticket_id: createdTickets[0]!.id,
        email_type: 'ticket_created',
        recipient_email: 'support@example.com',
        recipient_name: 'Support Team',
        subject: 'New Support Ticket: TKT-2024-000001 - Payment Issue',
        body: 'A new support ticket has been created that requires attention.',
        status: 'sent',
        sent_at: currentDate,
        message_id: 'msg_002_' + Date.now(),
        provider: 'nodemailer'
      },
      
      // Email logs for responses
      {
        ticket_id: createdTickets[1]!.id,
        email_type: 'response_added',
        recipient_email: 'customer2@example.com',
        recipient_name: 'Bob Wilson',
        subject: 'Response to Your Support Ticket: TKT-2024-000002',
        body: 'A new response has been added to your support ticket.',
        status: 'sent',
        sent_at: yesterday,
        message_id: 'msg_003_' + Date.now(),
        provider: 'nodemailer'
      },
      {
        ticket_id: createdTickets[1]!.id,
        email_type: 'response_added',
        recipient_email: 'support@example.com',
        recipient_name: 'Support Team',
        subject: 'Customer Response: TKT-2024-000002',
        body: 'The customer has responded to ticket TKT-2024-000002.',
        status: 'sent',
        sent_at: currentDate,
        message_id: 'msg_004_' + Date.now(),
        provider: 'nodemailer'
      },
      
      // Email logs for status changes
      {
        ticket_id: createdTickets[2]!.id,
        email_type: 'status_changed',
        recipient_email: 'customer1@example.com',
        recipient_name: 'Alice Johnson',
        subject: 'Ticket Resolved: TKT-2024-000003',
        body: 'Your support ticket has been resolved. Please let us know if you need further assistance.',
        status: 'sent',
        sent_at: currentDate,
        message_id: 'msg_005_' + Date.now(),
        provider: 'nodemailer'
      },
      
      // Failed email example
      {
        ticket_id: createdTickets[3]!.id,
        email_type: 'ticket_created',
        recipient_email: 'invalid@nonexistent-domain.com',
        recipient_name: 'Anonymous User',
        subject: 'Support Ticket Created: TKT-2024-000004',
        body: 'Your support ticket has been created successfully.',
        status: 'failed',
        sent_at: null,
        error_message: 'Invalid email address - domain does not exist',
        message_id: null,
        provider: 'nodemailer'
      }
    ];

    const createdEmailLogs: any = [];
    for (const emailData of sampleEmailLogs as any[]) {
      const emailLog = await prisma.ticket_email_log.create({
        data: emailData
      });
      createdEmailLogs.push(emailLog);
    }
    
    console.log(`✅ Created ${createdEmailLogs.length} sample email logs`);

    // 8. Update ticket last_response_at for tickets with responses
    console.log('🔄 Updating ticket timestamps...');
    
    await prisma.support_ticket.update({
      where: { id: createdTickets[1]!.id },
      data: { last_response_at: currentDate }
    });
    
    await prisma.support_ticket.update({
      where: { id: createdTickets[2]!.id },
      data: { last_response_at: currentDate }
    });
    
    await prisma.support_ticket.update({
      where: { id: createdTickets[4]!.id },
      data: { last_response_at: yesterday }
    });

    console.log('✅ Updated ticket timestamps');

    // Summary
    console.log('\n🎉 Support Ticket & Mail System Seed Data Complete!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📋 Ticket Templates: ${templates.length}`);
    console.log(`👥 Test Users: ${testUsers.length}`);
    console.log(`👤 Test Sellers: ${testSellers.length}`);
    console.log(`🏪 Test Stores: ${testStores.length}`);
    console.log(`🎫 Support Tickets: ${createdTickets.length}`);
    console.log(`💬 Ticket Responses: ${createdResponses.length}`);
    console.log(`📧 Email Logs: ${createdEmailLogs.length}`);
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📊 Ticket Status Summary:');
    const statusCounts = createdTickets.reduce(
    (acc: Record<string, number>, ticket: { status: string }) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
    },
    {}
  );

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} tickets`);
    });
    
    console.log('\n📈 Ticket Categories:');
    const categoryCounts = createdTickets.reduce((acc, ticket) => {
      acc[ticket.category] = (acc[ticket.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} tickets`);
    });

    console.log('\n✨ Sample ticket numbers created:');
    createdTickets.forEach(ticket => {
      console.log(`   ${ticket.ticket_number} - ${ticket.subject} (${ticket.status})`);
    });

  } catch (error) {
    console.error('❌ Error seeding support ticket data:', error);
    throw error;
  }
}

// Function to clean up seed data (for development/testing)
async function cleanupSupportTicketData() {
  console.log('🧹 Cleaning up support ticket seed data...');
  
  try {
    // Delete in order of dependencies
    await prisma.ticket_email_log.deleteMany({});
    await prisma.ticket_response.deleteMany({});
    await prisma.support_ticket.deleteMany({});
    await prisma.ticket_template.deleteMany({});
    
    console.log('✅ Support ticket seed data cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up support ticket data:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await seedSupportTicketData();
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main();
}


export { seedSupportTicketData, cleanupSupportTicketData };









