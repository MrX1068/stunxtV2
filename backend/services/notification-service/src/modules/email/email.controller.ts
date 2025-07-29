import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { EmailService, SendEmailDto } from './email.service';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an email' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(dto);
  }

  @Post('send-template')
  @ApiOperation({ summary: 'Send email using Brevo template' })
  @ApiResponse({ status: 201, description: 'Template email sent successfully' })
  async sendTemplateEmail(
    @Body() body: {
      to: string;
      templateId: number;
      variables: Record<string, any>;
      sender?: { email: string; name: string };
    },
  ) {
    return this.emailService.sendTemplateEmail(
      body.to,
      body.templateId,
      body.variables,
      body.sender,
    );
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send bulk emails' })
  @ApiResponse({ status: 201, description: 'Bulk emails sent successfully' })
  async sendBulkEmails(@Body() body: { emails: SendEmailDto[] }) {
    return this.emailService.sendBulkEmails(body.emails);
  }

  @Post('welcome')
  @ApiOperation({ summary: 'Send welcome email' })
  @ApiResponse({ status: 201, description: 'Welcome email sent successfully' })
  async sendWelcomeEmail(@Body() body: { to: string; userName: string }) {
    return this.emailService.sendWelcomeEmail(body.to, body.userName);
  }

  @Post('password-reset')
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 201, description: 'Password reset email sent successfully' })
  async sendPasswordResetEmail(
    @Body() body: { to: string; resetToken: string; userName: string },
  ) {
    return this.emailService.sendPasswordResetEmail(
      body.to,
      body.resetToken,
      body.userName,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email delivery statistics' })
  @ApiResponse({ status: 200, description: 'Email statistics retrieved successfully' })
  async getDeliveryStats() {
    return this.emailService.getDeliveryStats();
  }
}
