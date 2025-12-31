// src/utils/email.util.ts
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || config.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || config.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: process.env.SMTP_USER || config.SMTP_USER,
    pass: process.env.SMTP_PASS || config.SMTP_PASS,
  },
} as SMTPTransport.Options);

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP Connection Error:', error.message);
  } else {
    console.log('✅ SMTP Server is ready to send emails');
  }
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) throw new Error('Missing to address for sendEmail');
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || config.EMAIL_FROM || '"Veloceeo" <no-reply@veloceeo.local>',
      to,
      subject,
      html,
    });

    // 🔥 Log successful email send
    console.log('✅ Email sent successfully!');
    console.log('📧 Sent to:', to);
    console.log('📋 Subject:', subject);
    console.log('🆔 Message ID:', info.messageId);
    console.log('📨 Response:', info.response);

    return info;
  } catch (error: any) {
    // 🔥 Log email failure
    console.error('❌ Email send failed!');
    console.error('📧 Attempted to:', to);
    console.error('📋 Subject:', subject);
    console.error('🚨 Error:', error.message);
    
    throw error;
  }
}