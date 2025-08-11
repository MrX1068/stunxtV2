import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  context?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    const emailConfig = this.configService.get('email');
    
    // Log the email config for debugging (without sensitive data)

    
    // If no email config, use development mode (logs only)
    if (!emailConfig?.host || !emailConfig?.user || !emailConfig?.password) {
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
        // Additional options for better deliverability
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection (but don't block startup if it fails)
      this.transporter.verify((error, success) => {
        if (error) {
    
          this.transporter = null; // Fall back to logging mode
        } else {
      
        }
      });
    } catch (error) {

      this.transporter = null; // Fall back to logging mode
    }
  }

  /**
   * Send email verification OTP
   */
  async sendEmailVerificationOtp(email: string, otp: string, expirationMinutes: number): Promise<void> {
    const template = this.getEmailVerificationTemplate(otp, expirationMinutes);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });


  }

  /**
   * Send password reset OTP
   */
  async sendPasswordResetOtp(email: string, otp: string, expirationMinutes: number): Promise<void> {
    const template = this.getPasswordResetTemplate(otp, expirationMinutes);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });


  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    const template = this.getWelcomeTemplate(fullName);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });


  }

  /**
   * Send account lockout notification
   */
  async sendAccountLockoutEmail(
    email: string,
    fullName: string,
    lockoutUntil: Date,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const lockoutMinutes = Math.ceil((lockoutUntil.getTime() - Date.now()) / (1000 * 60));
    const template = this.getAccountLockoutTemplate(fullName, lockoutUntil, lockoutMinutes, ipAddress, userAgent);

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });


  }

  /**
   * Send community invite email
   */
  async sendCommunityInviteEmail(
    email: string,
    inviterName: string,
    communityName: string,
    inviteCode: string,
    message?: string
  ): Promise<void> {
    const template = this.getCommunityInviteTemplate(inviterName, communityName, inviteCode, message);

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });


  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(
    email: string, 
    alertType: string, 
    details: Record<string, any>
  ): Promise<void> {
    const template = this.getSecurityAlertTemplate(alertType, details);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

 
  }

  /**
   * Send email (core functionality)
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // Development mode - log only
      if (!this.transporter) {
     
        
        // Extract and display OTP for development
        const otpMatch = options.text?.match(/(\d{6})/);
        if (otpMatch) {
       
        }
        
        // Simulate sending delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return;
      }

      // Production mode - send actual email
      const info = await this.transporter.sendMail({
        from: this.configService.get('email.from'),
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });



    } catch (error) {
  
      
      // Don't throw in development mode
      if (!this.transporter) {

        return;
      }
      
      throw new Error('Failed to send email');
    }
  }

  /**
   * Email verification OTP template
   */
  private getEmailVerificationTemplate(otp: string, expirationMinutes: number): EmailTemplate {
    const formattedOtp = otp.replace(/(.{3})/g, '$1 ').trim();
    
    return {
      subject: 'Verify Your Email - StunxtV2',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              text-align: center; 
              background: white; 
              padding: 20px; 
              margin: 20px 0; 
              border-radius: 8px; 
              letter-spacing: 4px;
              color: #4F46E5;
              border: 2px solid #4F46E5;
            }
            .warning { color: #dc2626; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Welcome to StunxtV2! Please verify your email address by entering the following OTP code:</p>
              
              <div class="otp-code">${formattedOtp}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in <span class="warning">${expirationMinutes} minutes</span></li>
                <li>Enter this code exactly as shown (spaces don't matter)</li>
                <li>If you didn't request this verification, please ignore this email</li>
              </ul>
              
              <p>If you're having trouble, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2025 StunxtV2. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        StunxtV2 - Email Verification
        
        Welcome! Please verify your email address by entering this OTP code:
        
        ${formattedOtp}
        
        This code will expire in ${expirationMinutes} minutes.
        
        If you didn't request this verification, please ignore this email.
        
        © 2025 StunxtV2. All rights reserved.
      `
    };
  }

  /**
   * Password reset OTP template
   */
  private getPasswordResetTemplate(otp: string, expirationMinutes: number): EmailTemplate {
    const formattedOtp = otp.replace(/(.{3})/g, '$1 ').trim();
    
    return {
      subject: 'Password Reset Code - StunxtV2',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .otp-code { 
              font-size: 32px; 
              font-weight: bold; 
              text-align: center; 
              background: white; 
              padding: 20px; 
              margin: 20px 0; 
              border-radius: 8px; 
              letter-spacing: 4px;
              color: #dc2626;
              border: 2px solid #dc2626;
            }
            .warning { color: #dc2626; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 Password Reset</h1>
            </div>
            <div class="content">
              <p>You requested a password reset for your StunxtV2 account. Enter this code to continue:</p>
              
              <div class="otp-code">${formattedOtp}</div>
              
              <p><strong>Security Notice:</strong></p>
              <ul>
                <li>This code will expire in <span class="warning">${expirationMinutes} minutes</span></li>
                <li>Only use this code if you requested a password reset</li>
                <li>If you didn't request this, your account may be at risk</li>
                <li>Consider changing your password and enabling 2FA</li>
              </ul>
              
              <p>If you didn't request this reset, please secure your account immediately.</p>
            </div>
            <div class="footer">
              <p>© 2025 StunxtV2. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        StunxtV2 - Password Reset
        
        You requested a password reset. Enter this code to continue:
        
        ${formattedOtp}
        
        This code will expire in ${expirationMinutes} minutes.
        
        If you didn't request this reset, please secure your account immediately.
        
        © 2025 StunxtV2. All rights reserved.
      `
    };
  }

  /**
   * Welcome email template
   */
  private getWelcomeTemplate(fullName: string): EmailTemplate {
    return {
      subject: 'Welcome to StunxtV2! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to StunxtV2</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .cta-button { 
              display: inline-block; 
              background: #4F46E5; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: bold; 
              margin: 20px 0;
            }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to StunxtV2!</h1>
            </div>
            <div class="content">
              <p>Hi ${fullName},</p>
              
              <p>Welcome to StunxtV2! We're excited to have you join our community platform.</p>
              
              <p><strong>What's next?</strong></p>
              <ul>
                <li>Complete your profile setup</li>
                <li>Join communities that interest you</li>
                <li>Start engaging with other members</li>
                <li>Explore spaces and discussions</li>
              </ul>
              
              <p>If you have any questions, our support team is here to help!</p>
            </div>
            <div class="footer">
              <p>© 2025 StunxtV2. All rights reserved.</p>
              <p>You're receiving this because you signed up for StunxtV2.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to StunxtV2!
        
        Hi ${fullName},
        
        Welcome to StunxtV2! We're excited to have you join our community platform.
        
        What's next?
        - Complete your profile setup
        - Join communities that interest you
        - Start engaging with other members
        - Explore spaces and discussions
        
        If you have any questions, our support team is here to help!
        
        © 2025 StunxtV2. All rights reserved.
      `
    };
  }

  /**
   * Security alert template
   */
  private getSecurityAlertTemplate(alertType: string, details: Record<string, any>): EmailTemplate {
    const alertMessages = {
      'suspicious_login': 'Suspicious login attempt detected',
      'new_device': 'New device login detected',
      'password_changed': 'Password changed successfully',
      'account_locked': 'Account temporarily locked',
      'multiple_failed_attempts': 'Multiple failed login attempts'
    };

    const message = alertMessages[alertType] || 'Security alert';

    return {
      subject: `🔐 Security Alert - ${message}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Security Alert</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Security Alert</h1>
            </div>
            <div class="content">
              <p><strong>${message}</strong></p>
              
              <div class="alert-details">
                <p><strong>Details:</strong></p>
                <ul>
                  ${Object.entries(details).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
                </ul>
              </div>
              
              <p><strong>What should you do?</strong></p>
              <ul>
                <li>Review your account activity</li>
                <li>Change your password if you suspect unauthorized access</li>
                <li>Enable two-factor authentication for added security</li>
                <li>Contact support if you notice anything suspicious</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2025 StunxtV2. All rights reserved.</p>
              <p>This is an automated security alert.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Security Alert: ${message}\n\nDetails:\n${Object.entries(details).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\nWhat should you do?\n- Review your account activity\n- Change your password if you suspect unauthorized access\n- Enable two-factor authentication for added security\n- Contact support if you notice anything suspicious\n\n© 2025 StunxtV2. All rights reserved.\nThis is an automated security alert.`
    };
  }

  /**
   * Account lockout notification template
   */
  private getAccountLockoutTemplate(
    fullName: string, 
    lockoutUntil: Date, 
    lockoutMinutes: number,
    ipAddress: string,
    userAgent: string
  ): EmailTemplate {
    const lockoutTime = lockoutUntil.toLocaleString();
    
    return {
      subject: '🔒 Account Temporarily Locked - StunxtV2',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Account Locked</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .lockout-info { 
              background: white; 
              border-left: 4px solid #dc2626; 
              padding: 20px; 
              margin: 20px 0; 
              border-radius: 0 8px 8px 0;
            }
            .countdown { 
              font-size: 24px; 
              font-weight: bold; 
              text-align: center; 
              color: #dc2626; 
              margin: 15px 0;
            }
            .details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .warning { color: #dc2626; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Account Temporarily Locked</h1>
            </div>
            <div class="content">
              <p>Hello ${fullName},</p>
              
              <div class="lockout-info">
                <p><span class="warning">Your account has been temporarily locked</span> due to multiple failed login attempts.</p>
                
                <div class="countdown">
                  🕒 Locked for ${lockoutMinutes} minutes
                </div>
                
                <p><strong>Your account will automatically unlock at:</strong><br>
                ${lockoutTime}</p>
              </div>
              
              <div class="details">
                <p><strong>Security Details:</strong></p>
                <ul>
                  <li><strong>IP Address:</strong> ${ipAddress}</li>
                  <li><strong>Device:</strong> ${userAgent}</li>
                  <li><strong>Lockout Duration:</strong> 30 minutes</li>
                  <li><strong>Failed Attempts:</strong> 5 or more</li>
                </ul>
              </div>
              
              <p><strong>What you can do:</strong></p>
              <ul>
                <li><strong>Wait:</strong> Your account will unlock automatically in ${lockoutMinutes} minutes</li>
                <li><strong>Reset Password:</strong> If you forgot your password, use the "Forgot Password" option</li>
                <li><strong>Check Security:</strong> If this wasn't you, someone may be trying to access your account</li>
                <li><strong>Contact Support:</strong> If you need immediate assistance</li>
              </ul>
              
              <p><strong>Security Tips:</strong></p>
              <ul>
                <li>Use a strong, unique password</li>
                <li>Enable two-factor authentication</li>
                <li>Don't share your login credentials</li>
                <li>Always log out from shared devices</li>
              </ul>
              
              <p class="warning">If you didn't attempt to log in, please contact our security team immediately.</p>
            </div>
            <div class="footer">
              <p>© 2025 StunxtV2. All rights reserved.</p>
              <p>This is an automated security notification.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Account Temporarily Locked - StunxtV2\n\nHello ${fullName},\n\nYour account has been temporarily locked due to multiple failed login attempts.\n\nLocked for: ${lockoutMinutes} minutes\nUnlock time: ${lockoutTime}\n\nSecurity Details:\n- IP Address: ${ipAddress}\n- Device: ${userAgent}\n- Lockout Duration: 30 minutes\n- Failed Attempts: 5 or more\n\nWhat you can do:\n- Wait: Your account will unlock automatically in ${lockoutMinutes} minutes\n- Reset Password: If you forgot your password, use the "Forgot Password" option\n- Check Security: If this wasn't you, someone may be trying to access your account\n- Contact Support: If you need immediate assistance\n\nSecurity Tips:\n- Use a strong, unique password\n- Enable two-factor authentication\n- Don't share your login credentials\n- Always log out from shared devices\n\nIf you didn't attempt to log in, please contact our security team immediately.\n\n© 2025 StunxtV2. All rights reserved.\nThis is an automated security notification.`
    };
  }

  /**
   * Community invite email template
   */
  private getCommunityInviteTemplate(
    inviterName: string,
    communityName: string,
    inviteCode: string,
    message?: string
  ): EmailTemplate {
    const inviteUrl = `${this.configService.get('frontend.url', 'https://app.stunxt.com')}/invite/${inviteCode}`;

    return {
      subject: `${inviterName} invited you to join ${communityName} on StunxtV2`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Community Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .content { background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
            .invite-button {
              background: #2563eb;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .community-info {
              background: #eff6ff;
              border: 1px solid #dbeafe;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .message-box {
              background: #f0f9ff;
              border-left: 4px solid #0ea5e9;
              padding: 15px;
              margin: 20px 0;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #2563eb;">🎉 You're Invited!</h1>
          </div>

          <div class="content">
            <h2>Hi there!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the <strong>${communityName}</strong> community on StunxtV2.</p>

            ${message ? `
              <div class="message-box">
                <p><strong>Personal message from ${inviterName}:</strong></p>
                <p>"${message}"</p>
              </div>
            ` : ''}

            <div class="community-info">
              <h3>🏘️ About ${communityName}</h3>
              <p>Join this community to connect with like-minded people, share ideas, and participate in engaging discussions.</p>
            </div>

            <div style="text-align: center;">
              <a href="${inviteUrl}" class="invite-button">
                Join ${communityName}
              </a>
            </div>

            <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
            <p><small><a href="${inviteUrl}">${inviteUrl}</a></small></p>

            <p>Welcome to the StunxtV2 community! 🚀</p>
          </div>

          <div class="footer">
            <p>© 2025 StunxtV2. All rights reserved.</p>
            <p>This invitation was sent by ${inviterName}. If you don't want to receive invitations, you can ignore this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        StunxtV2 - Community Invitation

        Hi there!

        ${inviterName} has invited you to join the ${communityName} community on StunxtV2.

        ${message ? `Personal message from ${inviterName}: "${message}"` : ''}

        To join the community, click this link or copy it into your browser:
        ${inviteUrl}

        Welcome to the StunxtV2 community!

        © 2025 StunxtV2. All rights reserved.
        This invitation was sent by ${inviterName}.
      `
    };
  }
}
