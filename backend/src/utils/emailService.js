import nodemailer from 'nodemailer';

let transporterInstance = null;

const getTransporter = () => {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      pool: true, // Enable connection pooling
      maxConnections: 5,
      maxMessages: 100,
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporterInstance;
};

/**
 * Send password reset link to user
 */
export const sendResetPasswordEmail = async (email, resetUrl) => {
  const transporter = getTransporter();
  
  const mailOptions = {
    from: `"Vanguard Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password | Vanguard Security',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            background-color: #020617;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid #3b82f6;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
          }
          .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #3b82f6;
          }
          .logo-text {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 2px;
            color: #3b82f6;
            text-transform: uppercase;
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
          }
          h2 {
            margin-top: 0;
            color: #3b82f6;
            font-size: 22px;
            text-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }
          .shield-icon {
            display: block;
            margin: 20px auto;
            width: 80px;
            height: 80px;
          }
          p {
            color: #cbd5e1;
            font-size: 16px;
          }
          .btn-container {
            text-align: center;
            margin: 30px 0;
          }
          .btn {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: #ffffff !important;
            padding: 14px 30px;
            font-size: 16px;
            font-weight: bold;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            box-shadow: 0 0 15px rgba(37, 99, 235, 0.4);
            border: 1px solid #60a5fa;
          }
          .footer {
            background-color: #090d16;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid rgba(59, 130, 246, 0.2);
          }
          .warning {
            color: #94a3b8;
            font-size: 13px;
            margin-top: 25px;
            padding: 12px;
            background: rgba(30, 41, 59, 0.5);
            border-left: 3px solid #f59e0b;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">VANGUARD ARC</div>
          </div>
          <div class="content">
            <svg class="shield-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill="#1e293b" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 6V18" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
              <path d="M9 12H15" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <h2>Reset Password Request</h2>
            <p>We received a request to configure system access for your account. Click the button below to establish a new password credential. This link will expire in 15 minutes.</p>
            <div class="btn-container">
              <a class="btn" href="${resetUrl}" target="_blank">Reset Password</a>
            </div>
            <div class="warning">
              If you did not initiate this system access configuration request, please contact your security administrator immediately.
            </div>
          </div>
          <div class="footer">
            &copy; 2026 Vanguard ARC Security Command. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
};

/**
 * Send 6-digit OTP code to user
 */
export const sendOTPEmail = async (email, otpCode) => {
  const transporter = getTransporter();
  
  const mailOptions = {
    from: `"Vanguard Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Security Verification Code | Vanguard Security',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Verification Code</title>
        <style>
          body {
            background-color: #020617;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid #3b82f6;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
          }
          .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #3b82f6;
          }
          .logo-text {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 2px;
            color: #3b82f6;
            text-transform: uppercase;
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
            text-align: center;
          }
          h2 {
            margin-top: 0;
            color: #3b82f6;
            font-size: 22px;
            text-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }
          .shield-icon {
            display: block;
            margin: 20px auto;
            width: 80px;
            height: 80px;
          }
          p {
            color: #cbd5e1;
            font-size: 16px;
          }
          .otp-code {
            font-family: 'Courier New', Courier, monospace;
            font-size: 36px;
            font-weight: bold;
            color: #60a5fa;
            background: #1e293b;
            padding: 15px 30px;
            border-radius: 8px;
            display: inline-block;
            letter-spacing: 6px;
            margin: 20px 0;
            border: 1px solid rgba(59, 130, 246, 0.3);
            text-shadow: 0 0 8px rgba(96, 165, 250, 0.6);
          }
          .footer {
            background-color: #090d16;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid rgba(59, 130, 246, 0.2);
          }
          .expiry-note {
            color: #f59e0b;
            font-size: 14px;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">VANGUARD ARC</div>
          </div>
          <div class="content">
            <svg class="shield-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" fill="#1e293b" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 11V15" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="8" r="1.5" fill="#60a5fa"/>
            </svg>
            <h2>Security Verification</h2>
            <p>You requested access to the Vanguard ARC system via OTP bypass. Enter the following 6-digit verification code on the control panel. This code is valid for 5 minutes.</p>
            <div class="otp-code">${otpCode}</div>
            <div class="expiry-note">
              This code will expire in 5 minutes. Do not share this code with anyone.
            </div>
          </div>
          <div class="footer">
            &copy; 2026 Vanguard ARC Security Command. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
};
