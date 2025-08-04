import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('brevo')
  @ApiOperation({ summary: 'Handle Brevo email webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleBrevoWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ) {

    
    // TODO: Verify webhook signature for security
    // const signature = headers['x-sib-signature'];
    
    await this.webhookService.handleBrevoWebhook(body);
    return { success: true };
  }

  @Post('fcm')
  @ApiOperation({ summary: 'Handle FCM push notification webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleFCMWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ) {

    
    await this.webhookService.handleFCMWebhook(body);
    return { success: true };
  }

  @Post('twilio')
  @ApiOperation({ summary: 'Handle Twilio SMS webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleTwilioWebhook(
    @Body() body: any,
    @Headers() headers: any,
  ) {

    
    // TODO: Verify webhook signature for security
    // const signature = headers['x-twilio-signature'];
    
    await this.webhookService.handleTwilioWebhook(body);
    return { success: true };
  }
}
