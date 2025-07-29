import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface SendSmsDto {
  to: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any;
  private fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client
   */
  private async initializeTwilio(): Promise<void> {
    try {
      const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
      this.fromNumber = this.configService.get('TWILIO_PHONE_NUMBER');

      if (!accountSid || !authToken || !this.fromNumber) {
        this.logger.warn('Twilio credentials not configured, SMS service disabled');
        return;
      }

      this.twilioClient = new Twilio(accountSid, authToken);

      this.logger.log('Twilio SMS service initialized');

    } catch (error) {
      this.logger.error('Failed to initialize Twilio:', error);
    }
  }

  /**
   * Send SMS using Twilio
   */
  async sendSms(dto: SendSmsDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.twilioClient) {
        // Try to initialize if not already done
        await this.initializeTwilio();
        if (!this.twilioClient) {
          throw new Error('Twilio not initialized');
        }
      }

      // Format phone number (ensure it starts with +)
      const formattedNumber = dto.to.startsWith('+') ? dto.to : `+${dto.to}`;

      const message = await this.twilioClient.messages.create({
        body: dto.message,
        from: this.fromNumber,
        to: formattedNumber,
      });

      this.logger.log(`SMS sent successfully to ${formattedNumber}. Message SID: ${message.sid}`);

      return {
        success: true,
        messageId: message.sid,
      };

    } catch (error) {
      this.logger.error(`Failed to send SMS to ${dto.to}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Your StuntX verification code is: ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
      data: { type: 'verification_code', code },
    });
  }

  /**
   * Send 2FA code SMS
   */
  async send2FACode(phoneNumber: string, code: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Your StuntX 2FA code is: ${code}. This code will expire in 5 minutes.`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
      data: { type: '2fa_code', code },
    });
  }

  /**
   * Send security alert SMS
   */
  async sendSecurityAlert(phoneNumber: string, alertType: string, details: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `StuntX Security Alert: ${alertType}. ${details}. If this wasn't you, please secure your account immediately.`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
      data: { type: 'security_alert', alertType, details },
    });
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetSms(phoneNumber: string, resetCode: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Your StuntX password reset code is: ${resetCode}. This code will expire in 15 minutes. Do not share this code.`;
    
    return this.sendSms({
      to: phoneNumber,
      message,
      data: { type: 'password_reset', resetCode },
    });
  }

  /**
   * Send bulk SMS (with rate limiting)
   */
  async sendBulkSms(messages: SendSmsDto[]): Promise<Array<{ phone: string; success: boolean; messageId?: string; error?: string }>> {
    const results = [];
    
    for (const smsDto of messages) {
      const result = await this.sendSms(smsDto);
      results.push({
        phone: smsDto.to,
        ...result,
      });
      
      // Add delay to respect rate limits (Twilio allows 1 SMS per second for trial accounts)
      await this.delay(1100);
    }
    
    return results;
  }

  /**
   * Get SMS delivery status
   */
  async getMessageStatus(messageSid: string): Promise<{ status: string; error?: string }> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not initialized');
      }

      const message = await this.twilioClient.messages(messageSid).fetch();

      return {
        status: message.status,
        // Possible statuses: queued, sending, sent, failed, delivered, undelivered, receiving, received
      };

    } catch (error) {
      this.logger.error(`Failed to get message status for ${messageSid}:`, error);
      return {
        status: 'unknown',
        error: error.message,
      };
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): { valid: boolean; formatted?: string; error?: string } {
    try {
      // Basic phone number validation
      const cleaned = phoneNumber.replace(/[^\d+]/g, '');
      
      if (cleaned.length < 10) {
        return { valid: false, error: 'Phone number too short' };
      }
      
      if (cleaned.length > 15) {
        return { valid: false, error: 'Phone number too long' };
      }
      
      // Ensure it starts with + for international format
      const formatted = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
      
      return { valid: true, formatted };
      
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check Twilio account balance (for monitoring)
   */
  async getAccountBalance(): Promise<{ balance?: string; currency?: string; error?: string }> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not initialized');
      }

      const account = await this.twilioClient.api.accounts(this.configService.get('TWILIO_ACCOUNT_SID')).fetch();

      return {
        balance: account.balance,
        currency: account.currency || 'USD',
      };

    } catch (error) {
      this.logger.error('Failed to get Twilio account balance:', error);
      return {
        error: error.message,
      };
    }
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio not initialized');
      }

      const options: any = {};
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;

      const usage = await this.twilioClient.usage.records.list({
        category: 'sms',
        ...options,
      });

      return usage.map(record => ({
        category: record.category,
        description: record.description,
        count: record.count,
        usage: record.usage,
        price: record.price,
        priceUnit: record.priceUnit,
        startDate: record.startDate,
        endDate: record.endDate,
      }));

    } catch (error) {
      this.logger.error('Failed to get SMS usage stats:', error);
      return [];
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
