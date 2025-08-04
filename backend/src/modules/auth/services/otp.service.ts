import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface OtpConfig {
  length: number;
  expirationMinutes: number;
  type: 'numeric' | 'alphanumeric';
}

export interface GeneratedOtp {
  code: string;
  expiresAt: Date;
  hashedCode: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate OTP for email verification
   */
  generateEmailVerificationOtp(): GeneratedOtp {
    const config: OtpConfig = {
      length: 6,
      expirationMinutes: this.configService.get<number>('jwt.otpExpiration', 600) / 60, // Convert seconds to minutes
      type: 'numeric',
    };

    return this.generateOtp(config);
  }

  /**
   * Generate OTP for password reset
   */
  generatePasswordResetOtp(): GeneratedOtp {
    const config: OtpConfig = {
      length: 6,
      expirationMinutes: this.configService.get<number>('jwt.otpExpiration', 600) / 60, // Convert seconds to minutes
      type: 'numeric',
    };

    return this.generateOtp(config);
  }

  /**
   * Generate OTP for two-factor authentication
   */
  generate2FAOtp(): GeneratedOtp {
    const config: OtpConfig = {
      length: 6,
      expirationMinutes: 5, // 5 minutes for 2FA
      type: 'numeric',
    };

    return this.generateOtp(config);
  }

  /**
   * Generate OTP with custom configuration
   */
  generateOtp(config: OtpConfig): GeneratedOtp {
    const code = this.generateCode(config.length, config.type);
    const expiresAt = new Date(Date.now() + config.expirationMinutes * 60 * 1000);
    const hashedCode = this.hashOtp(code);



    return {
      code,
      expiresAt,
      hashedCode,
    };
  }

  /**
   * Verify OTP code
   */
  verifyOtp(inputCode: string, hashedCode: string, expiresAt: Date): boolean {
    // Check if OTP has expired
    if (new Date() > expiresAt) {
  
      return false;
    }

    // Verify the code
    const inputHashedCode = this.hashOtp(inputCode);
    const isValid = inputHashedCode === hashedCode;

    if (isValid) {
   
    } else {

    }

    return isValid;
  }

  /**
   * Generate random code
   */
  private generateCode(length: number, type: 'numeric' | 'alphanumeric'): string {
    const characters = type === 'numeric' 
      ? '0123456789'
      : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, characters.length);
      result += characters[randomIndex];
    }

    return result;
  }

  /**
   * Hash OTP for secure storage
   */
  private hashOtp(code: string): string {
    const secret = this.configService.get<string>('otp.secret', 'default-otp-secret');
    return crypto.createHmac('sha256', secret).update(code).digest('hex');
  }

  /**
   * Check if OTP is expired
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Get remaining time for OTP in seconds
   */
  getRemainingTimeSeconds(expiresAt: Date): number {
    const now = new Date();
    const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    return remaining;
  }

  /**
   * Format OTP for display (with spaces for readability)
   */
  formatOtpForDisplay(code: string): string {
    // Add space every 3 digits for readability
    return code.replace(/(.{3})/g, '$1 ').trim();
  }

  /**
   * Generate backup codes for 2FA
   */
  generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric backup code
      const code = this.generateCode(8, 'alphanumeric').toUpperCase();
      // Format as XXXX-XXXX for readability
      const formattedCode = `${code.substring(0, 4)}-${code.substring(4, 8)}`;
      codes.push(formattedCode);
    }

    return codes;
  }

  /**
   * Validate backup code format
   */
  isValidBackupCodeFormat(code: string): boolean {
    // Check if format is XXXX-XXXX
    const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return pattern.test(code);
  }
}
