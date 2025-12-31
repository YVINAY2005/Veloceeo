import { PrismaClient, NotificationCategory, NotificationPriority, NotificationStatus } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function seedNotificationData() {
  console.log('🔔 Starting notification system seed...');

  try {
    // 1. Create notification templates
    console.log('📝 Creating notification templates...');
    
    const templates = [
      // Order templates
      {
        category: NotificationCategory.ORDER,
        type: 'NEW_ORDER',
        title_template: 'New Order #{{order_id}}',
        message_template: 'You have received a new order from {{customer_name}} worth ₹{{amount}}',
        priority: NotificationPriority.HIGH
      },
      {
        category: NotificationCategory.ORDER,
        type: 'ORDER_CANCELLED',
        title_template: 'Order #{{order_id}} Cancelled',
        message_template: 'Order #{{order_id}} has been cancelled by {{customer_name}}',
        priority: NotificationPriority.MEDIUM
      },
      {
        category: NotificationCategory.ORDER,
        type: 'ORDER_UPDATED',
        title_template: 'Order #{{order_id}} Updated',
        message_template: 'Order #{{order_id}} status has been updated to {{status}}',
        priority: NotificationPriority.LOW
      },
      
      // Inventory templates
      {
        category: NotificationCategory.INVENTORY,
        type: 'LOW_STOCK',
        title_template: 'Low Stock Alert!',
        message_template: '{{product_name}} is running low. Current stock: {{current_stock}} (Threshold: {{threshold}})',
        priority: NotificationPriority.MEDIUM
      },
      {
        category: NotificationCategory.INVENTORY,
        type: 'OUT_OF_STOCK',
        title_template: 'Out of Stock Alert!',
        message_template: '{{product_name}} is now out of stock. Please restock immediately.',
        priority: NotificationPriority.HIGH
      },
      {
        category: NotificationCategory.INVENTORY,
        type: 'STOCK_REPLENISHED',
        title_template: 'Stock Replenished',
        message_template: '{{product_name}} has been restocked. New quantity: {{new_stock}}',
        priority: NotificationPriority.LOW
      },
      
      // Payment templates
      {
        category: NotificationCategory.PAYMENT,
        type: 'PAYMENT_RECEIVED',
        title_template: 'Payment Received!',
        message_template: 'Payment of ₹{{amount}} via {{payment_method}} has been received',
        priority: NotificationPriority.HIGH
      },
      {
        category: NotificationCategory.PAYMENT,
        type: 'PAYMENT_FAILED',
        title_template: 'Payment Failed!',
        message_template: 'Payment of ₹{{amount}} has failed. Reason: {{failure_reason}}',
        priority: NotificationPriority.URGENT
      },
      {
        category: NotificationCategory.PAYMENT,
        type: 'SETTLEMENT_COMPLETED',
        title_template: 'Settlement Completed',
        message_template: 'Your settlement of ₹{{amount}} has been processed successfully',
        priority: NotificationPriority.HIGH
      },
      {
        category: NotificationCategory.PAYMENT,
        type: 'WITHDRAWAL_PROCESSED',
        title_template: 'Withdrawal Processed',
        message_template: 'Your withdrawal request of ₹{{amount}} has been processed',
        priority: NotificationPriority.MEDIUM
      },
      
      // Promotion templates
      {
        category: NotificationCategory.PROMOTION,
        type: 'OFFER_REQUEST',
        title_template: 'New Offer Request',
        message_template: '{{customer_name}} wants to buy "{{product_name}}" for ₹{{offered_price}} (Original: ₹{{original_price}})',
        priority: NotificationPriority.MEDIUM
      },
      {
        category: NotificationCategory.PROMOTION,
        type: 'PROMOTION_APPROVED',
        title_template: 'Promotion Approved',
        message_template: 'Your promotion "{{promotion_title}}" has been approved and is now live',
        priority: NotificationPriority.LOW
      },
      {
        category: NotificationCategory.PROMOTION,
        type: 'PROMOTION_REJECTED',
        title_template: 'Promotion Rejected',
        message_template: 'Your promotion "{{promotion_title}}" has been rejected. Reason: {{reason}}',
        priority: NotificationPriority.MEDIUM
      },
      
      // System templates
      {
        category: NotificationCategory.SYSTEM,
        type: 'SYSTEM_MAINTENANCE',
        title_template: 'System Maintenance',
        message_template: 'Scheduled maintenance will occur on {{date}} from {{start_time}} to {{end_time}}',
        priority: NotificationPriority.MEDIUM
      },
      {
        category: NotificationCategory.SYSTEM,
        type: 'POLICY_UPDATE',
        title_template: 'Policy Update',
        message_template: 'Our {{policy_type}} policy has been updated. Please review the changes.',
        priority: NotificationPriority.LOW
      },
      {
        category: NotificationCategory.SYSTEM,
        type: 'FEATURE_ANNOUNCEMENT',
        title_template: 'New Feature Available!',
        message_template: 'Check out our new feature: {{feature_name}}. {{description}}',
        priority: NotificationPriority.LOW
      },
      
      // Review templates
      {
        category: NotificationCategory.REVIEW,
        type: 'NEW_REVIEW',
        title_template: 'New Review Received',
        message_template: '{{customer_name}} left a {{rating}}-star review for your store',
        priority: NotificationPriority.LOW
      },
      {
        category: NotificationCategory.REVIEW,
        type: 'REVIEW_RESPONSE',
        title_template: 'Review Response',
        message_template: 'Your response to {{customer_name}}\'s review has been posted',
        priority: NotificationPriority.LOW
      }
    ];

    for (const template of templates) {
      await prisma.notification_template.upsert({
        where: {
          category_type: {
            category: template.category,
            type: template.type
          }
        },
        update: template,
        create: template
      });
    }

    console.log(`✅ Created ${templates.length} notification templates`);

    // 2. Get existing sellers and stores for creating sample notifications
    const sellers = await prisma.seller.findMany({
      include: {
        store: true
      },
      take: 3
    });

    if (sellers.length === 0) {
      console.log('⚠️ No sellers found. Skipping sample notifications.');
      return;
    }

    // 3. Create default notification preferences for sellers
    console.log('⚙️ Creating default notification preferences...');
    
    for (const seller of sellers) {
      await prisma.seller_notification_preferences.upsert({
        where: { seller_id: seller.id },
        update: {},
        create: {
          seller_id: seller.id,
          store_id: seller.store[0]?.id || null,
          
          // Order notifications
          notify_new_orders: true,
          notify_order_updates: true,
          notify_order_cancellations: true,
          
          // Inventory notifications
          notify_low_stock: true,
          notify_out_of_stock: true,
          notify_stock_alerts: true,
          low_stock_threshold: 10,
          
          // Payment notifications
          notify_payment_updates: true,
          notify_payment_failures: true,
          notify_settlements: true,
          notify_withdrawals: true,
          
          // Promotion notifications
          notify_offer_requests: true,
          notify_promotion_updates: true,
          
          // System notifications
          notify_system_updates: true,
          notify_policy_changes: false,
          
          // Review notifications
          notify_new_reviews: true,
          notify_review_responses: true,
          
          // Delivery preferences
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          in_app_notifications: true,
          
          // Quiet hours
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        }
      });
    }

    console.log(`✅ Created notification preferences for ${sellers.length} sellers`);

    // 4. Create sample notifications for demonstration
    console.log('📱 Creating sample notifications...');
    
    const sampleNotifications = [];
    
    for (const seller of sellers) {
      const store = seller.store[0];
      if (!store) continue;

      // Sample order notifications
      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.ORDER,
        type: 'NEW_ORDER',
        title: 'New Order #1001',
        message: 'You have received a new order from John Doe worth ₹1,250',
        priority: NotificationPriority.HIGH,
        action_url: '/dashboard/orders/1001',
        status: NotificationStatus.UNREAD
      });

      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.ORDER,
        type: 'ORDER_CANCELLED',
        title: 'Order #1002 Cancelled',
        message: 'Order #1002 has been cancelled by the customer',
        priority: NotificationPriority.MEDIUM,
        action_url: '/dashboard/orders/1002',
        status: NotificationStatus.READ,
        read_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });

      // Sample inventory notifications
      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.INVENTORY,
        type: 'LOW_STOCK',
        title: 'Low Stock Alert!',
        message: 'Premium Coffee Beans is running low. Current stock: 5 (Threshold: 10)',
        priority: NotificationPriority.MEDIUM,
        action_url: '/dashboard/products/101',
        status: NotificationStatus.UNREAD
      });

      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.INVENTORY,
        type: 'OUT_OF_STOCK',
        title: 'Out of Stock Alert!',
        message: 'Organic Tea Bags is now out of stock. Please restock immediately.',
        priority: NotificationPriority.HIGH,
        action_url: '/dashboard/products/102',
        status: NotificationStatus.UNREAD
      });

      // Sample payment notifications
      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.PAYMENT,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received!',
        message: 'Payment of ₹2,500 via UPI has been received',
        priority: NotificationPriority.HIGH,
        action_url: '/dashboard/payments',
        status: NotificationStatus.READ,
        read_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      });

      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.PAYMENT,
        type: 'SETTLEMENT_COMPLETED',
        title: 'Settlement Completed',
        message: 'Your settlement of ₹15,750 has been processed successfully',
        priority: NotificationPriority.HIGH,
        action_url: '/dashboard/settlements',
        status: NotificationStatus.UNREAD
      });

      // Sample promotion notifications
      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.PROMOTION,
        type: 'OFFER_REQUEST',
        title: 'New Offer Request',
        message: 'Sarah Kumar wants to buy "Smartphone Case" for ₹450 (Original: ₹599)',
        priority: NotificationPriority.MEDIUM,
        action_url: '/dashboard/offers',
        status: NotificationStatus.UNREAD
      });

      // Sample system notifications
      sampleNotifications.push({
        seller_id: seller.id,
        store_id: null, // System-wide notification
        category: NotificationCategory.SYSTEM,
        type: 'FEATURE_ANNOUNCEMENT',
        title: 'New Feature Available!',
        message: 'Check out our new analytics dashboard with advanced insights!',
        priority: NotificationPriority.LOW,
        action_url: '/dashboard/analytics',
        status: NotificationStatus.UNREAD,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
      });

      // Sample review notification
      sampleNotifications.push({
        seller_id: seller.id,
        store_id: store.id,
        category: NotificationCategory.REVIEW,
        type: 'NEW_REVIEW',
        title: 'New Review Received',
        message: 'Amit Sharma left a 5-star review for your store',
        priority: NotificationPriority.LOW,
        action_url: '/dashboard/reviews',
        status: NotificationStatus.UNREAD
      });
    }

    // Create all sample notifications
    for (const notification of sampleNotifications) {
      await prisma.seller_notification.create({
        data: notification
      });
    }

    console.log(`✅ Created ${sampleNotifications.length} sample notifications`);

    // 5. Create some sample notification deliveries
    console.log('📬 Creating sample notification deliveries...');
    
    const recentNotifications = await prisma.seller_notification.findMany({
      take: 5,
      orderBy: { created_at: 'desc' }
    });

    const deliveryMethods = ['email', 'push', 'in_app', 'sms'];
    const deliveryStatuses = ['sent', 'delivered', 'failed'];

    for (const notification of recentNotifications) {
      for (const method of deliveryMethods) {
        // Skip SMS for demo data
        if (method === 'sms') continue;
        
        const status = method === 'in_app' ? 'delivered' : 
                      (deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)] ?? 'sent');
        
        await prisma.notification_delivery.create({
          data: {
            notification_id: notification.id,
            delivery_method: method,
            delivery_status: status,
            delivery_provider: method === 'email' ? 'sendgrid' : 
                             method === 'push' ? 'firebase' : 
                             method === 'sms' ? 'twilio' : 'internal',
            provider_message_id: `${method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            delivered_at: status === 'delivered' ? new Date() : null,
            error_message: status === 'failed' ? 'Rate limit exceeded' : null
          }
        });
      }
    }

    console.log(`✅ Created notification delivery records`);

    // 6. Summary
    const summary = await prisma.$transaction([
      prisma.notification_template.count(),
      prisma.seller_notification_preferences.count(),
      prisma.seller_notification.count(),
      prisma.notification_delivery.count()
    ]);

    console.log('\n🎉 Notification system seed completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Notification Templates: ${summary[0]}`);
    console.log(`   - Seller Preferences: ${summary[1]}`);
    console.log(`   - Sample Notifications: ${summary[2]}`);
    console.log(`   - Delivery Records: ${summary[3]}`);
    console.log('\n✨ Ready to use the notification system!');

  } catch (error) {
    console.error('❌ Error seeding notification data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedNotificationData()
    .catch((error) => {
      console.error('❌ Notification seed failed:', error);
      process.exit(1);
    });
}


export default seedNotificationData;


