import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { ResumableUploadService } from './resumable-upload.service';
import { UploadProcessor } from './upload.processor';

import { File } from '../../shared/entities/file.entity';
import { FileVariant } from '../../shared/entities/file-variant.entity';
import { UploadSession } from '../../shared/entities/upload-session.entity';

import { CloudinaryProvider } from '../../providers/cloudinary/cloudinary.provider';
import { AwsS3Provider } from '../../providers/aws-s3/aws-s3.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([File, FileVariant, UploadSession]),
    
    // Queue for background processing
    BullModule.registerQueue({
      name: 'file-upload',
    }),
    BullModule.registerQueue({
      name: 'file-processing',
    }),
    
    // Multer configuration for file uploads
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dest: configService.get('TEMP_DIRECTORY', './uploads/temp'),
        limits: {
          fileSize: parseInt(configService.get('MAX_FILE_SIZE', '104857600')), // 100MB
          files: 10, // Max 10 files per request
        },
        fileFilter: (req, file, callback) => {
          const allowedMimeTypes = configService.get('ALLOWED_MIME_TYPES', 'image/*,video/*,application/pdf').split(',');
          const isAllowed = allowedMimeTypes.some(type => {
            if (type.endsWith('/*')) {
              return file.mimetype.startsWith(type.replace('/*', '/'));
            }
            return file.mimetype === type;
          });
          
          if (isAllowed) {
            callback(null, true);
          } else {
            callback(new Error(`File type ${file.mimetype} is not allowed`), false);
          }
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    ResumableUploadService,
    UploadProcessor,
    CloudinaryProvider,
    AwsS3Provider,
  ],
  exports: [UploadService, ResumableUploadService],
})
export class UploadModule {}
