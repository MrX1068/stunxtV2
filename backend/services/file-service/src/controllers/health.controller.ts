import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VirusScannerService } from '../services/virus-scanner.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly virusScannerService: VirusScannerService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'file-service',
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV'),
      features: {
        virusScanning: {
          enabled: this.virusScannerService.isAvailable(),
          version: null,
        },
        storageProviders: {
          cloudinary: this.configService.get('CLOUDINARY_ENABLED', false),
          awsS3: this.configService.get('AWS_S3_ENABLED', false),
        },
      },
    };

    // Get virus scanner version if available
    if (this.virusScannerService.isAvailable()) {
      try {
        const version = await this.virusScannerService.getVersion();
        health.features.virusScanning.version = version;
      } catch (error) {
        this.logger.warn('Could not retrieve virus scanner version:', error.message);
      }
    }

    return health;
  }

  @Get('virus-scanner')
  @ApiOperation({ summary: 'Virus scanner specific health check' })
  @ApiResponse({ status: 200, description: 'Virus scanner status' })
  async getVirusScannerHealth() {
    const isAvailable = this.virusScannerService.isAvailable();
    let version = null;

    if (isAvailable) {
      try {
        version = await this.virusScannerService.getVersion();
      } catch (error) {
        this.logger.warn('Could not retrieve virus scanner version:', error.message);
      }
    }

    return {
      status: isAvailable ? 'available' : 'unavailable',
      enabled: this.configService.get('VIRUS_SCAN_ENABLED', false),
      strictMode: this.configService.get('VIRUS_SCAN_STRICT', false),
      version,
      configuration: {
        clamScanPath: this.configService.get('CLAMSCAN_PATH'),
        clamdHost: this.configService.get('CLAMD_HOST'),
        clamdPort: this.configService.get('CLAMD_PORT'),
        timeout: this.configService.get('CLAMD_TIMEOUT'),
      },
    };
  }
}
