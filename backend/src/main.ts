import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    cors: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const env = configService.get<string>('app.env', 'development');

  // Global middleware for correlation IDs
  // app.use(new CorrelationIdMiddleware().use);

  // Global exception filter for standardized error handling
  // app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: env === 'production',
    }),
  );

  // Global response transformation
  app.useGlobalInterceptors(new TransformInterceptor());

  // API prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'metrics'],
  });

  // Swagger documentation
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('StunxtV2 API')
      .setDescription('The StunxtV2 Community Platform API')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Users', 'User management')
      .addTag('Communities', 'Community management')
      .addServer(`http://localhost:${port}`, 'Development server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
      },
    });

    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
  }

  // Health check endpoint
  app.use('/health', (req: any, res: any) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env,
      version: '2.0.0',
    });
  });

  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${env}`);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
