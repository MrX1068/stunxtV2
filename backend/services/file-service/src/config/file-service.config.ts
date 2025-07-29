import { ConfigService } from '@nestjs/config';

export interface FileServiceConfig {
  // Upload limits
  maxFileSize: number;
  maxDailyUploads: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  
  // Processing
  imageQuality: number;
  videoQuality: string;
  thumbnailSize: { width: number; height: number };
  
  // Storage
  tempDirectory: string;
  enableVirusScanning: boolean;
  encryptFiles: boolean;
  
  // Providers
  providers: {
    cloudinary: CloudinaryConfig;
    aws: AwsConfig;
    local: LocalConfig;
  };
  
  // CDN
  cdn: CdnConfig;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset?: string;
  folder: string;
}

export interface AwsConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  cdnDomain?: string;
}

export interface LocalConfig {
  storagePath: string;
  baseUrl: string;
}

export interface CdnConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'custom';
  domain: string;
  apiToken?: string;
  zoneId?: string;
}

export const fileServiceConfig = () => {
  const configService = new ConfigService();
  return {
  // Upload limits
  maxFileSize: parseInt(configService.get('MAX_FILE_SIZE', '104857600')), // 100MB
  maxDailyUploads: parseInt(configService.get('MAX_DAILY_UPLOADS', '1000')),
  allowedMimeTypes: configService.get('ALLOWED_MIME_TYPES', 'image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
  allowedExtensions: configService.get('ALLOWED_EXTENSIONS', '.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.pdf,.doc,.docx').split(','),
  
  // Processing
  imageQuality: parseInt(configService.get('IMAGE_QUALITY', '90')),
  videoQuality: configService.get('VIDEO_QUALITY', 'auto'),
  thumbnailSize: {
    width: parseInt(configService.get('THUMBNAIL_WIDTH', '300')),
    height: parseInt(configService.get('THUMBNAIL_HEIGHT', '300')),
  },
  
  // Storage
  tempDirectory: configService.get('TEMP_DIRECTORY', './uploads/temp'),
  enableVirusScanning: configService.get('VIRUS_SCAN_ENABLED', 'false') === 'true',
  encryptFiles: configService.get('ENCRYPT_FILES', 'true') === 'true',
  
  // Providers
  providers: {
    cloudinary: {
      cloudName: configService.get('CLOUDINARY_CLOUD_NAME'),
      apiKey: configService.get('CLOUDINARY_API_KEY'),
      apiSecret: configService.get('CLOUDINARY_API_SECRET'),
      uploadPreset: configService.get('CLOUDINARY_UPLOAD_PRESET'),
      folder: configService.get('CLOUDINARY_FOLDER', 'stunxt'),
    },
    aws: {
      accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      region: configService.get('AWS_REGION', 'us-east-1'),
      bucket: configService.get('AWS_S3_BUCKET'),
      cdnDomain: configService.get('AWS_CDN_DOMAIN'),
    },
    local: {
      storagePath: configService.get('LOCAL_STORAGE_PATH', './uploads'),
      baseUrl: configService.get('LOCAL_BASE_URL', 'http://localhost:3003'),
    },
  },
  
  // CDN
  cdn: {
    enabled: configService.get('CDN_ENABLED', 'true') === 'true',
    provider: configService.get('CDN_PROVIDER', 'cloudflare') as 'cloudflare' | 'aws' | 'custom',
    domain: configService.get('CDN_DOMAIN'),
    apiToken: configService.get('CLOUDFLARE_API_TOKEN'),
    zoneId: configService.get('CLOUDFLARE_ZONE_ID'),
  },
  };
};
