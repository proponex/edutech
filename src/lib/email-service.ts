import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user || 'no-reply@prepnx.com';
  const fromName = process.env.SMTP_FROM_NAME || 'Prepnx Education';

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    fromName,
  };
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
}

function getPrepnxEmailTemplate(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #F8F6FF;
      color: #1E1035;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 24px auto;
      background: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(98, 68, 166, 0.08);
      border: 1px solid #DCCFFF;
    }
    .header {
      background: linear-gradient(135deg, #1E1035 0%, #2A174E 50%, #3D1E6D 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin: 0;
      color: #FFFFFF;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #DCCFFF;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .content {
      padding: 32px 28px;
    }
    .otp-box {
      background: linear-gradient(135deg, #F8F6FF 0%, #EEE8FF 100%);
      border: 2px dashed #6244A6;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #1E1035;
      margin: 0;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      color: #6244A6;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .footer {
      background-color: #FAF8FF;
      border-top: 1px solid #EEE8FF;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #68647D;
    }
    .security-notice {
      background-color: #FFF9EB;
      border: 1px solid #FFE6A5;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 12px;
      color: #8C5900;
      margin-top: 24px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="brand-title">PREPNX</h1>
      <div class="brand-sub">Digital Classroom &bull; Verification Service</div>
    </div>
    <div class="content">
      ${contentHtml}
      <div class="security-notice">
        <strong>Security Tip:</strong> Never share this code with anyone. Prepnx staff will never ask for your verification code. If you did not initiate this request, your account may be secure, but you should disregard this email.
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Prepnx Education Platform. All rights reserved.<br>
      Empowering learners across Kindergarten to Class 12.
    </div>
  </div>
</body>
</html>
  `;
}

export async function sendOtpEmail({
  to,
  name,
  otp,
  purpose,
}: {
  to: string;
  name?: string;
  otp: string;
  purpose: 'signup' | 'password_reset' | 'email_verification';
}): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const config = getSmtpConfig();
  const greeting = name ? `Hello ${name},` : 'Hello,';

  let subject = 'Your Prepnx Verification Code';
  let intro = 'Thank you for registering with Prepnx. Use the 6-digit verification code below to verify your email address and activate your account.';

  if (purpose === 'password_reset') {
    subject = 'Reset Your Prepnx Password — Verification Code';
    intro = 'We received a request to reset the password for your Prepnx account. Use the 6-digit verification code below to proceed with resetting your password.';
  }

  const contentHtml = `
    <h2 style="font-size: 20px; font-weight: 800; color: #1E1035; margin-top: 0;">${greeting}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #4B465C; margin: 12px 0;">${intro}</p>
    
    <div class="otp-box">
      <div class="otp-label">Verification Code</div>
      <div class="otp-code">${otp}</div>
    </div>

    <p style="font-size: 13px; color: #68647D; text-align: center; margin: 0;">
      This code is single-use and will expire in <strong>5 minutes</strong>.
    </p>
  `;

  const html = getPrepnxEmailTemplate(subject, contentHtml);
  const text = `
${greeting}

${intro}

YOUR PREPNX VERIFICATION CODE:
${otp}

This code is single-use and will expire in 5 minutes.
Never share this code with anyone.

If you did not request this, please disregard this email.
© ${new Date().getFullYear()} Prepnx Education Platform
  `.trim();

  if (!config) {
    // Graceful development mode fallback
    console.log('\n=============================================================');
    console.log(`[Prepnx Email Service - Dev Mode]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Purpose: ${purpose}`);
    console.log('=============================================================\n');
    return { success: true, simulated: true };
  }

  try {
    const transporter = createTransporter(config);
    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Prepnx Email Service] SMTP Delivery Error:', error);
    // In dev/test environments, log the OTP so testing isn't blocked by invalid test credentials
    console.log(`[Prepnx Email Service - Fallback Log] Target: ${to} | OTP: ${otp}`);
    return { success: false };
  }
}

export async function sendPasswordResetSuccessEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}): Promise<{ success: boolean }> {
  const config = getSmtpConfig();
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const subject = 'Your Prepnx Password Has Been Changed';

  const contentHtml = `
    <h2 style="font-size: 20px; font-weight: 800; color: #1E1035; margin-top: 0;">${greeting}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #4B465C; margin: 12px 0;">
      The password for your Prepnx account was successfully updated. You can now log in using your new password.
    </p>
    <p style="font-size: 13px; color: #DC2626; margin-top: 20px;">
      If you did not make this change, please contact our support team immediately at <a href="mailto:support@edutech.internal" style="color: #6244A6; font-weight: bold;">support@edutech.internal</a>.
    </p>
  `;

  const html = getPrepnxEmailTemplate(subject, contentHtml);
  const text = `
${greeting}

The password for your Prepnx account was successfully updated.

If you did not make this change, please contact support immediately at support@edutech.internal.
  `.trim();

  if (!config) {
    console.log(`[Prepnx Email Service - Dev Mode] Password Reset Confirmation sent to: ${to}`);
    return { success: true };
  }

  try {
    const transporter = createTransporter(config);
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('[Prepnx Email Service] Error sending password change notice:', error);
    return { success: false };
  }
}
