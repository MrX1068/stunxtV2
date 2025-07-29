import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "validator.swagger.io", "res.cloudinary.com", "*.amazonaws.com"],
        scriptSrc: ["'self'"],
        manifestSrc: ["'self'"],
        frameSrc: ["'self'"],
      },
    },
  }));

  // Compression middleware
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-File-Name', 'X-File-Size'],
  });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('StuntX File Service API')
    .setDescription('Enterprise file management service with multi-provider support')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('files', 'File operations')
    .addTag('upload', 'File upload operations')
    .addTag('processing', 'File processing operations')
    .addTag('storage', 'Storage management')
    .addTag('analytics', 'File analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const port = configService.get('PORT', 3003);
  await app.listen(port);

  console.log(`🚀 File Service running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
