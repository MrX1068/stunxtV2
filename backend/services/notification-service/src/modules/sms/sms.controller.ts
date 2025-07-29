import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { SmsService, SendSmsDto } from './sms.service';

@ApiTags('SMS')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send SMS message' })
  @ApiResponse({ status: 201, description: 'SMS sent successfully' })
  async sendSms(@Body() dto: SendSmsDto) {
    return this.smsService.sendSms(dto);
  }

  @Post('verification-code')
  @ApiOperation({ summary: 'Send verification code SMS' })
  @ApiResponse({ status: 201, description: 'Verification code sent successfully' })
  async sendVerificationCode(
    @Body() body: { phoneNumber: string; code: string },
  ) {
    return this.smsService.sendVerificationCode(body.phoneNumber, body.code);
  }

  @Post('2fa-code')
  @ApiOperation({ summary: 'Send 2FA code SMS' })
  @ApiResponse({ status: 201, description: '2FA code sent successfully' })
  async send2FACode(
    @Body() body: { phoneNumber: string; code: string },
  ) {
    return this.smsService.send2FACode(body.phoneNumber, body.code);
  }

  @Post('security-alert')
  @ApiOperation({ summary: 'Send security alert SMS' })
  @ApiResponse({ status: 201, description: 'Security alert sent successfully' })
  async sendSecurityAlert(
    @Body() body: { 
      phoneNumber: string; 
      alertType: string; 
      details: string; 
    },
  ) {
    return this.smsService.sendSecurityAlert(
      body.phoneNumber,
      body.alertType,
      body.details,
    );
  }

  @Post('password-reset')
  @ApiOperation({ summary: 'Send password reset SMS' })
  @ApiResponse({ status: 201, description: 'Password reset SMS sent successfully' })
  async sendPasswordResetSms(
    @Body() body: { phoneNumber: string; resetCode: string },
  ) {
    return this.smsService.sendPasswordResetSms(body.phoneNumber, body.resetCode);
  }

  @Post('bulk-send')
  @ApiOperation({ summary: 'Send bulk SMS messages' })
  @ApiResponse({ status: 201, description: 'Bulk SMS sent successfully' })
  async sendBulkSms(@Body() body: { messages: SendSmsDto[] }) {
    return this.smsService.sendBulkSms(body.messages);
  }

  @Get('status/:messageSid')
  @ApiOperation({ summary: 'Get SMS delivery status' })
  @ApiResponse({ status: 200, description: 'SMS status retrieved successfully' })
  async getMessageStatus(@Param('messageSid') messageSid: string) {
    return this.smsService.getMessageStatus(messageSid);
  }

  @Post('validate-phone')
  @ApiOperation({ summary: 'Validate phone number format' })
  @ApiResponse({ status: 200, description: 'Phone number validation completed' })
  async validatePhoneNumber(@Body('phoneNumber') phoneNumber: string) {
    return this.smsService.validatePhoneNumber(phoneNumber);
  }

  @Get('account/balance')
  @ApiOperation({ summary: 'Get Twilio account balance' })
  @ApiResponse({ status: 200, description: 'Account balance retrieved successfully' })
  async getAccountBalance() {
    return this.smsService.getAccountBalance();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get SMS usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  async getUsageStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.smsService.getUsageStats(start, end);
  }
}
