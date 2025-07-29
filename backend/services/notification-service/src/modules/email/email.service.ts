import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const SibApiV3Sdk = require('sib-api-v3-sdk');

export interface SendEmailDto {
  to: string;
  subject: string;
  content: string;
  templateId?: string;
  data?: Record<string, any>;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    name: string;
    content: string; // base64 encoded
    contentType: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private apiInstance: any;
  private defaultSender: { email: string; name: string };

  constructor(private readonly configService: ConfigService) {
    this.initializeBrevo();
  }

  /**
   * Initialize Brevo (Sendinblue) API client
   */
  private initializeBrevo(): void {
    const apiKey = this.configService.get('BREVO_API_KEY');
    
    if (!apiKey) {
      this.logger.error('BREVO_API_KEY not configured');
      return;
    }

    // Configure API key authorization
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = apiKey;

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    this.defaultSender = {
      email: this.configService.get('BREVO_SENDER_EMAIL', 'noreply@stunxt.com'),
      name: this.configService.get('BREVO_SENDER_NAME', 'StuntX Platform'),
    };

    this.logger.log('Brevo email service initialized');
  }

  /**
   * Send email using Brevo
   */
  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.apiInstance) {
        throw new Error('Brevo API not initialized');
      }

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      // Set sender
      sendSmtpEmail.sender = dto.from ? 
        { email: dto.from, name: 'StuntX' } : 
        this.defaultSender;

      // Set recipient
      sendSmtpEmail.to = [{ email: dto.to }];

      // Set subject and content
      sendSmtpEmail.subject = dto.subject;
      sendSmtpEmail.htmlContent = dto.content;

      // Set reply-to if provided
      if (dto.replyTo) {
        sendSmtpEmail.replyTo = { email: dto.replyTo };
      }

      // Add custom data for tracking
      if (dto.data) {
        sendSmtpEmail.headers = {
          'X-Mailin-custom': JSON.stringify(dto.data),
        };
      }

      // Add attachments if provided
      if (dto.attachments && dto.attachments.length > 0) {
        sendSmtpEmail.attachment = dto.attachments.map(att => ({
          name: att.name,
          content: att.content,
        }));
      }

      // Send email
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      this.logger.log(`Email sent successfully to ${dto.to}. Message ID: ${response.messageId}`);
      
      return {
        success: true,
        messageId: response.messageId,
      };

    } catch (error) {
      this.logger.error(`Failed to send email to ${dto.to}:`, error);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send template email using Brevo template
   */
  async sendTemplateEmail(
    to: string,
    templateId: number,
    variables: Record<string, any>,
    sender?: { email: string; name: string },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.apiInstance) {
        throw new Error('Brevo API not initialized');
      }

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = sender || this.defaultSender;
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.templateId = templateId;
      sendSmtpEmail.params = variables;

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      this.logger.log(`Template email sent successfully to ${to}. Template ID: ${templateId}, Message ID: ${response.messageId}`);
      
      return {
        success: true,
        messageId: response.messageId,
      };

    } catch (error) {
      this.logger.error(`Failed to send template email to ${to}:`, error);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emails: SendEmailDto[]): Promise<Array<{ email: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];
    
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push({
        email: email.to,
        ...result,
      });
      
      // Add small delay to avoid rate limiting
      await this.delay(100);
    }
    
    return results;
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const welcomeContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to StuntX!</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">Welcome to StuntX! 🚀</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2>Hi ${userName}!</h2>
          <p>Welcome to the StuntX community! We're excited to have you on board.</p>
          
          <p>Here's what you can do next:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Join communities that interest you</li>
            <li>Start connecting with other members</li>
            <li>Share your first post</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${this.configService.get('FRONTEND_URL', 'https://stunxt.com')}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Get Started
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>© 2025 StuntX Platform. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to StuntX! 🚀',
      content: welcomeContent,
      data: { type: 'welcome', userName },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    
    const resetContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc2626;">Password Reset Request</h1>
        </div>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
          <h2>Hi ${userName},</h2>
          <p>We received a request to reset your password for your StuntX account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p><strong>This link will expire in 1 hour.</strong></p>
          
          <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>For security reasons, this link can only be used once.</p>
          <p>© 2025 StuntX Platform. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Reset Your StuntX Password',
      content: resetContent,
      data: { type: 'password_reset', userName, resetToken },
    });
  }

  /**
   * Get email delivery statistics
   */
  async getDeliveryStats(): Promise<any> {
    try {
      if (!this.apiInstance) {
        throw new Error('Brevo API not initialized');
      }

      // Get email statistics from Brevo
      const response = await this.apiInstance.getAccount();
      
      return {
        accountInfo: response,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        blocked: 0,
      };
      
    } catch (error) {
      this.logger.error('Failed to get delivery stats:', error);
      return null;
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
