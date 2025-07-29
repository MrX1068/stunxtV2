import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name);

  async testLoginAttempt() {
    this.logger.log('Testing login attempt service...');
    
    // Simple test to see if the service is working
    try {
      // Add your test logic here
      this.logger.log('Test completed successfully');
    } catch (error) {
      this.logger.error('Test failed:', error);
    }
  }
}
