import { PrismaClient , store , seller } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function seedSettingsData() {
  try {
    console.log('🔧 Starting Settings & Management data seeding...');

    // Get existing sellers for seeding
   const sellers = await prisma.seller.findMany({
    include: { store: true }
  });

    if (sellers.length === 0) {
      console.log('❌ No sellers found. Please run the main seed first.');
      return;
    }

    // 1. Create bank accounts for sellers
    console.log('🏦 Creating bank accounts...');
    const bankAccounts = await Promise.all([
      prisma.seller_bank_account.create({
        data: {
          seller_id: sellers[0]!.id,
          account_holder_name: 'Rajesh Kumar',
          bank_name: 'HDFC Bank',
          account_number: '50100123456789',
          ifsc_code: 'HDFC0001234',
          branch_name: 'Mumbai Central',
          account_type: 'BUSINESS',
          is_primary: true,
          is_verified: true,
          verification_date: new Date('2024-05-15T10:30:00Z')
        }
      }),
      prisma.seller_bank_account.create({
        data: {
          seller_id: sellers[0]!.id,
          account_holder_name: 'Rajesh Kumar',
          bank_name: 'State Bank of India',
          account_number: '30123456789012',
          ifsc_code: 'SBIN0001234',
          branch_name: 'Andheri West',
          account_type: 'SAVINGS',
          is_primary: false,
          is_verified: false
        }
      }),
      ...(sellers.length > 1 ? [
        prisma.seller_bank_account.create({
          data: {
            seller_id: sellers[1]!.id,
            account_holder_name: 'Priya Sharma',
            bank_name: 'ICICI Bank',
            account_number: '001401234567',
            ifsc_code: 'ICIC0001234',
            branch_name: 'Bangalore HSR Layout',
            account_type: 'CURRENT',
            is_primary: true,
            is_verified: true,
            verification_date: new Date('2024-05-20T14:15:00Z')
          }
        })
      ] : [])
    ]);

    console.log(`✅ Created ${bankAccounts.length} bank accounts`);

    // 2. Create staff members for stores
    console.log('👥 Creating staff members...');
    const staffMembers = [];
    
    for (const seller of sellers) {
      if (seller.store.length > 0) {
        const storeStaff = await Promise.all([
          prisma.store_staff.create({
            data: {
              store_id: seller.store[0]!.id,
              seller_id: seller.id,
              staff_name: 'Amit Patel',
              staff_email: `amit.patel.${seller.id}@store.com`,
              staff_phone: '+91-9876543210',
              role: 'MANAGER',
              permissions: {
                can_manage_inventory: true,
                can_process_orders: true,
                can_view_analytics: true,
                can_manage_staff: false
              },
              created_by: seller.id,
              last_login: new Date('2024-06-25T09:30:00Z')
            }
          }),
          prisma.store_staff.create({
            data: {
              store_id: seller.store[0]!.id,
              seller_id: seller.id,
              staff_name: 'Sneha Reddy',
              staff_email: `sneha.reddy.${seller.id}@store.com`,
              staff_phone: '+91-9876543211',
              role: 'CASHIER',
              permissions: {
                can_manage_inventory: false,
                can_process_orders: true,
                can_view_analytics: false,
                can_manage_staff: false
              },
              created_by: seller.id,
              last_login: new Date('2024-06-25T10:15:00Z')
            }
          })
        ]);
        staffMembers.push(...storeStaff);
      }
    }

    console.log(`✅ Created ${staffMembers.length} staff members`);

    // 3. Create profile update records
    console.log('📝 Creating profile update history...');
    const profileUpdates = await Promise.all([
      prisma.seller_profile_update.create({
        data: {
          seller_id: sellers[0]!.id,
          field_name: 'phone',
          old_value: '+91-9876543200',
          new_value: '+91-9876543201',
          update_reason: 'Updated contact number',
          requires_verification: true,
          is_verified: true,
          verified_at: new Date('2024-06-20T10:30:00Z'),
          verified_by: 'system'
        }
      }),
      prisma.seller_profile_update.create({
        data: {
          seller_id: sellers[0]!.id,
          field_name: 'business_license',
          old_value: 'BL123456789',
          new_value: 'BL987654321',
          update_reason: 'Updated business license number',
          requires_verification: true,
          is_verified: false
        }
      }),
      ...(sellers.length > 1 ? [
        prisma.seller_profile_update.create({
          data: {
            seller_id: sellers[1]!.id,
            field_name: 'tax_id',
            old_value: 'TAX123456789',
            new_value: 'TAX987654321',
            update_reason: 'Updated GST number',
            requires_verification: true,
            is_verified: true,
            verified_at: new Date('2024-06-22T11:00:00Z'),
            verified_by: 'admin_001'
          }
        })
      ] : [])
    ]);

    console.log(`✅ Created ${profileUpdates.length} profile update records`);

    // 4. Create active sessions
    console.log('🔐 Creating seller sessions...');
    const sessions = await Promise.all([
      prisma.seller_session.create({
        data: {
          seller_id: sellers[0]!.id,
          user_id: sellers[0]!.id, // Using seller_id as user_id since seller doesn't have separate user_id
          device_info: 'Chrome 126.0.6478.127 on Windows 10',
          ip_address: '192.168.1.100',
          login_time: new Date('2024-06-26T08:00:00Z'),
          last_activity: new Date('2024-06-26T12:30:00Z'),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      }),
      prisma.seller_session.create({
        data: {
          seller_id: sellers[0]!.id,
          user_id: sellers[0]!.id, // Using seller_id as user_id since seller doesn't have separate user_id
          device_info: 'Mobile Safari on iPhone 15',
          ip_address: '192.168.1.101',
          login_time: new Date('2024-06-26T07:30:00Z'),
          last_activity: new Date('2024-06-26T11:45:00Z'),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }),
      ...(sellers.length > 1 ? [
        prisma.seller_session.create({
          data: {
            seller_id: sellers[1]!.id,
            user_id: sellers[1]!.id, // Using seller_id as user_id since seller doesn't have separate user_id
            device_info: 'Firefox 127.0 on macOS Sonoma',
            ip_address: '192.168.1.102',
            login_time: new Date('2024-06-26T09:15:00Z'),
            last_activity: new Date('2024-06-26T13:00:00Z'),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        })
      ] : [])
    ]);

    console.log(`✅ Created ${sessions.length} seller sessions`);

    // 5. Update store hours for all stores
    console.log('🕐 Creating store hours...');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    for (const seller of sellers) {
      for (const store of seller.store as store[]) {
        // Delete existing hours first
        await prisma.store_hours.deleteMany({
          where: { store_id: store.id }
        });

        // Create new hours
        const storeHours = await Promise.all(
          days.map((day: string, index: number) => 
            prisma.store_hours.create({
              data: {
                store_id: store.id,
                day: day,
                open_time: index === 6 ? null : '09:00', // Sunday closed
                close_time: index === 6 ? null : '21:00',
                is_closed: index === 6 // Sunday closed
              }
            })
          )
        );
        console.log(`   ✅ Created hours for store ${store.name}`);
      }
    }

    // 6. Create some expired sessions for testing
    console.log('📅 Creating expired sessions for testing...');
    await Promise.all([
      prisma.seller_session.create({
        data: {
          seller_id: sellers[0]!.id,
          user_id: sellers[0]!.id, // Using seller_id as user_id since seller doesn't have separate user_id
          device_info: 'Chrome 125.0 on Windows 10',
          ip_address: '192.168.1.103',
          login_time: new Date('2024-06-20T10:00:00Z'),
          last_activity: new Date('2024-06-20T15:30:00Z'),
          expires_at: new Date('2024-06-21T10:00:00Z'), // Expired
          is_active: false,
          logout_time: new Date('2024-06-20T16:00:00Z'),
          logout_reason: 'manual'
        }
      })
    ]);

    console.log('✅ Settings & Management data seeding completed successfully!');

    // Summary
    console.log('\n📊 SEEDING SUMMARY:');
    console.log(`🏦 Bank Accounts: ${bankAccounts.length}`);
    console.log(`👥 Staff Members: ${staffMembers.length}`);
    console.log(`📝 Profile Updates: ${profileUpdates.length}`);
    console.log(`🔐 Sessions: ${sessions.length}`);
    console.log(`🕐 Store Hours: Created for ${sellers.reduce((acc, s) => acc + s.store.length, 0)} stores`);

  } catch (error) {
    console.error('❌ Error seeding settings data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedSettingsData()
    .then(() => {
      console.log('🎉 Settings data seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Settings data seeding failed:', error);
      process.exit(1);
    });
}

export default seedSettingsData;











