// src/api/notification/notification.service.ts
import { prisma } from '../../lib/prisma';
import AppError from '../../utils/AppError';
import { sendEmail } from '../../utils/email.util';

type CreatePayload = {
  userId?: string | number | null; // 🔥 Support both string and number
  role?: string | null;
  title: string;
  message: string;
  type?: string;
  createdBy?: string | number | null;
};

export const createNotificationService = async (payload: CreatePayload) => {
  const { userId, role, title, message, type = 'system', createdBy = null } = payload;

  if (!title || !message) throw new AppError('title and message required', 400);

  if (userId) {
    const created = await prisma.notification.create({
      data: {
        user_id: String(userId), // 🔥 Convert to string (works for both numbers and strings)
        role: role ?? 'customer',
        title,
        message,
        type,
        is_read: false,
      },
    });

    if (type === 'email') {
      try {
        let email: string | null = null;

        // Try to find user by ID (handle both number and string IDs)
        const numericId = Number(userId);
        if (!isNaN(numericId)) {
          const cust = await prisma.customer.findUnique({ where: { id: numericId } });
          if (cust && cust.email) email = cust.email;

          if (!email) {
            const admin = await prisma.admin.findUnique({ where: { id: numericId } });
            if (admin && admin.email) email = admin.email;
          }
        }

        // Try seller with string ID
        if (!email && typeof userId === 'string') {
          const seller = await prisma.seller.findUnique({ where: { id: userId } });
          if (seller && seller.email) email = seller.email;
        }

        if (email) {
          await sendEmail(email, title, `<p>${message}</p>`);
        }
      } catch (e) {
        console.error('Email send failed', e);
      }
    }

    return created;
  }

  if (role) {
    let usersData: Array<{ id: string; email?: string | null }> = [];
    
    if (role === 'customer') {
      const customers = await prisma.customer.findMany({ select: { id: true, email: true } });
      usersData = customers.map(c => ({ id: String(c.id), email: c.email }));
    } else if (role === 'seller') {
      const sellers = await prisma.seller.findMany({ select: { id: true, email: true } });
      usersData = sellers.map(s => ({ id: s.id, email: s.email })); // Already strings
    } else if (role === 'admin') {
      const admins = await prisma.admin.findMany({ select: { id: true, email: true } });
      usersData = admins.map(a => ({ id: String(a.id), email: a.email }));
    } else {
      throw new AppError('Unsupported role broadcast', 400);
    }

    if (usersData.length === 0) return [];

    const createData = usersData.map((u) => ({
      user_id: u.id,
      role,
      title,
      message,
      type,
      is_read: false,
    }));

    const created = await prisma.notification.createMany({ data: createData });

    if (type === 'email') {
      (async () => {
        for (const u of usersData) {
          if (u.email) {
            try {
              await sendEmail(u.email, title, `<p>${message}</p>`);
            } catch (e) {
              console.error('Email send failed for', u.email, e);
            }
          }
        }
      })();
    }

    return created;
  }

  throw new AppError('Either userId or role must be specified', 400);
};

export const listNotificationsService = async ({
  userId,
  role,
  page = 1,
  limit = 50,
}: {
  userId: string | number; // 🔥 Support both
  role: string;
  page?: number;
  limit?: number;
}) => {
  const skip = (page - 1) * limit;
  const userIdStr = String(userId);
  
  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where: { user_id: userIdStr },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip,
    }),
    prisma.notification.count({ where: { user_id: userIdStr } }),
  ]);

  return {
    total,
    page,
    limit,
    data: rows,
  };
};

export const markAsReadService = async (notificationId: number, userId: string | number) => {
  const userIdStr = String(userId);
  const noti = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!noti) throw new AppError('Notification not found', 404);
  if (noti.user_id !== userIdStr) throw new AppError('Forbidden', 403);

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { is_read: true },
  });
  return updated;
};

export const markAllReadService = async (userId: string | number) => {
  const userIdStr = String(userId);
  const result = await prisma.notification.updateMany({
    where: { user_id: userIdStr, is_read: false },
    data: { is_read: true },
  });
  return result.count;
};

export const notifyOrderPlaced = async (paymentId: number) => {
  const p = await prisma.payment.findUnique({ 
    where: { id: paymentId }, 
    include: { customer: true, seller: true } 
  });
  if (!p) throw new AppError('Payment not found', 404);

  if (p.seller_id) {
    await prisma.notification.create({
      data: {
        user_id: String(p.seller_id), // 🔥 Convert to string
        role: 'seller',
        title: `New order #${p.id}`,
        message: `New order placed for ₹${(p.amount_cents / 100).toFixed(2)}. Please check orders.`,
        type: 'system',
        is_read: false,
      },
    });
  }

  if (p.customer_id) {
    await prisma.notification.create({
      data: {
        user_id: String(p.customer_id), // 🔥 Convert to string
        role: 'customer',
        title: `Order received (#${p.id})`,
        message: `Thanks for your order of ₹${(p.amount_cents / 100).toFixed(2)}. We will notify you with updates.`,
        type: 'system',
        is_read: false,
      },
    });
  }
};

export const notifyCustomerSignup = async (customerId: number) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, email: true, name: true },
    });

    if (!customer || !customer.email) {
      console.warn('⚠️ Customer not found or no email for ID:', customerId);
      return;
    }

    console.log(`📧 Sending welcome email to customer: ${customer.email}`);

    await prisma.notification.create({
      data: {
        user_id: String(customer.id), // 🔥 Convert to string
        role: 'customer',
        title: 'Welcome to Veloceeo! 🎉',
        message: `Hi ${customer.name || 'there'}! Thanks for signing up. Start exploring our products and enjoy shopping!`,
        type: 'email',
        is_read: false,
      },
    });

    await sendEmail(
      customer.email,
      'Welcome to Veloceeo! 🎉',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #4CAF50; margin-bottom: 20px;">Welcome to Veloceeo! 🎉</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi <strong>${customer.name || 'there'}</strong>!
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Thanks for signing up with Veloceeo. We're excited to have you on board!
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              You can now:
            </p>
            <ul style="font-size: 16px; color: #333; line-height: 1.8;">
              <li>Browse thousands of products</li>
              <li>Add items to your cart</li>
              <li>Track your orders</li>
              <li>Save your favorite products</li>
            </ul>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666;">
                Best regards,<br>
                <strong>The Veloceeo Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    );

    console.log(`✅ Welcome email sent successfully to customer: ${customer.email}`);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to send welcome email to customer:', err.message);
  }
};

export const notifyPasswordReset = async (customerEmail: string, resetToken: string) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { email: customerEmail },
      select: { id: true, email: true, name: true },
    });

    if (!customer || !customer.email) {
      console.warn('⚠️ Customer not found or no email for:', customerEmail);
      return;
    }

    const resetUrl = `${process.env.CORS_ORIGIN?.split(',')[0]}/reset-password/${resetToken}`;

    console.log(`📧 Sending password reset email to: ${customer.email}`);

    await prisma.notification.create({
      data: {
        user_id: String(customer.id),
        role: 'customer',
        title: 'Password Reset Request',
        message: `Hi ${customer.name || 'there'}! You have requested a password reset. Click the link to reset your password: ${resetUrl}`,
        type: 'email',
        is_read: false,
      },
    });

    await sendEmail(
      customer.email,
      'Your Password Reset Token (Valid for 10 minutes)',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #FFC107; margin-bottom: 20px;">Password Reset Request</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi <strong>${customer.name || 'there'}</strong>!
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              You have requested to reset your password. Please click on the link below to reset your password.
              This link is valid for only 10 minutes.
            </p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #007bff; color: #ffffff; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-size: 16px;">
                Reset Your Password
              </a>
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              If you did not request a password reset, please ignore this email.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666;">
                Best regards,<br>
                <strong>The Veloceeo Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    );

    console.log(`✅ Password reset email sent successfully to: ${customer.email}`);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to send password reset email to:', err.message);
  }
};

// 🔥 No conversion needed - seller.id is already a string!
export const notifySellerSignup = async (sellerId: string) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, email: true, business_name: true, name: true },
    });

    if (!seller || !seller.email) {
      console.warn('⚠️ Seller not found or no email for ID:', sellerId);
      return;
    }

    console.log(`📧 Sending welcome email to seller: ${seller.email}`);

    await prisma.notification.create({
      data: {
        user_id: seller.id, // ✅ Already a string, no conversion needed!
        role: 'seller',
        title: 'Welcome to Veloceeo Seller Dashboard! 🚀',
        message: `Welcome ${seller.business_name || seller.name || 'Seller'}! Your seller account is ready. Start listing your products and grow your business.`,
        type: 'email',
        is_read: false,
      },
    });

    await sendEmail(
      seller.email,
      'Welcome to Veloceeo Seller Dashboard! 🚀',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #2196F3; margin-bottom: 20px;">Welcome to Veloceeo Seller Dashboard! 🚀</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi <strong>${seller.business_name || seller.name || 'Seller'}</strong>!
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Your seller account has been created successfully. You're all set to start selling!
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              <strong>What you can do now:</strong>
            </p>
            <ul style="font-size: 16px; color: #333; line-height: 1.8;">
              <li>✅ Create your store</li>
              <li>✅ Add products with images and descriptions</li>
              <li>✅ Manage inventory and pricing</li>
              <li>✅ Track orders and sales</li>
              <li>✅ View analytics and reports</li>
            </ul>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666;">
                Best regards,<br>
                <strong>The Veloceeo Team</strong>
              </p>
            </div>
          </div>
        </div>
      `
    );

    console.log(`✅ Welcome email sent successfully to seller: ${seller.email}`);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to send welcome email to seller:', err.message);
  }
};

export const notifyAdminNewSeller = async (sellerId: string) => {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, email: true, business_name: true, name: true, phone: true, gst_number: true },
    });

    if (!seller) {
      console.warn('⚠️ Seller not found for ID:', sellerId);
      return;
    }

    console.log(`📧 Notifying admins about new seller: ${seller.business_name}`);

    const admins = await prisma.admin.findMany({
      select: { id: true, email: true, name: true },
    });

    if (admins.length === 0) {
      console.warn('⚠️ No admins found to notify');
      return;
    }

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];

      await prisma.notification.create({
        data: {
          user_id: String(admin.id), // 🔥 Convert admin ID to string
          role: 'admin',
          title: 'New Seller Registration',
          message: `New seller "${seller.business_name}" (${seller.email}) has signed up. Please review their account.`,
          type: 'email',
          is_read: false,
        },
      });

      if (admin.email) {
        try {
          await sendEmail(
            admin.email,
            '🔔 New Seller Registration - Action Required',
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <h2 style="color: #FF9800; margin-bottom: 20px;">🔔 New Seller Registration</h2>
                  <p style="font-size: 16px; color: #333;">A new seller has registered on Veloceeo:</p>
                  
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 10px 0;"><strong>Business Name:</strong> ${seller.business_name}</p>
                    <p style="margin: 10px 0;"><strong>Contact Person:</strong> ${seller.name || 'N/A'}</p>
                    <p style="margin: 10px 0;"><strong>Email:</strong> ${seller.email}</p>
                    <p style="margin: 10px 0;"><strong>Phone:</strong> ${seller.phone || 'N/A'}</p>
                    <p style="margin: 10px 0;"><strong>GST Number:</strong> ${seller.gst_number || 'N/A'}</p>
                    <p style="margin: 10px 0;"><strong>Seller ID:</strong> ${seller.id}</p>
                  </div>

                  <p style="font-size: 16px; color: #333; margin-top: 20px;">
                    Please review and approve/reject this seller account in the admin dashboard.
                  </p>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="font-size: 14px; color: #666;">
                      Best regards,<br>
                      <strong>Veloceeo System</strong>
                    </p>
                  </div>
                </div>
              </div>
            `
          );
          console.log(`✅ Admin notification sent to: ${admin.email}`);
          
          if (i < admins.length - 1) {
            console.log(`⏳ Waiting 2 seconds before next admin email...`);
            await delay(2000);
          }
        } catch (error) {
          const err = error as Error;
          console.error(`❌ Failed to email admin ${admin.email}:`, err.message);
        }
      }
    }

    console.log(`✅ All admins notified about new seller: ${seller.business_name}`);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to notify admins about new seller:', err.message);
  }
};