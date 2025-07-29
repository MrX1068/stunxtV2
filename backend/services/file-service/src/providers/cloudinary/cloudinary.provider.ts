import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import { 
  StorageProviderInterface, 
  UploadOptions, 
  UploadResult, 
  ProcessingOptions, 
  ProcessingResult,
  DeleteOptions 
} from '../abstract/storage-provider.interface';
import { FileType, StorageProvider } from '../../shared/enums/file.enum';

@Injectable()
export class CloudinaryProvider extends StorageProviderInterface {
  private readonly logger = new Logger(CloudinaryProvider.name);
  
  readonly provider = StorageProvider.CLOUDINARY;
  readonly supportedTypes = [FileType.IMAGE, FileType.VIDEO];
  readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeCloudinary();
  }

  private initializeCloudinary(): void {
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Cloudinary credentials not configured properly');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.logger.log('Cloudinary provider initialized successfully');
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    this.validateUploadOptions(options);

    try {
      const folder = this.configService.get('CLOUDINARY_FOLDER', 'stunxt');
      const fileName = this.generateFileName(options.fileName, folder);

      const uploadOptions: UploadApiOptions = {
        public_id: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        folder: folder,
        resource_type: 'auto',
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        metadata: options.metadata,
      };

      // Set access mode based on privacy
      if (options.isPublic) {
        uploadOptions.type = 'upload';
        uploadOptions.access_mode = 'public';
      } else {
        uploadOptions.type = 'private';
        uploadOptions.access_mode = 'authenticated';
      }

      // Convert buffer to base64 for Cloudinary
      const base64 = `data:${options.mimeType};base64,${options.buffer.toString('base64')}`;

      const result: UploadApiResponse = await cloudinary.uploader.upload(base64, uploadOptions);

      this.logger.log(`File uploaded to Cloudinary: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        metadata: {
          width: result.width,
          height: result.height,
          resourceType: result.resource_type,
          createdAt: result.created_at,
          version: result.version,
        },
      };

    } catch (error) {
      this.logger.error('Failed to upload file to Cloudinary:', error);
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
  }

  async process(fileUrl: string, options: ProcessingOptions): Promise<ProcessingResult> {
    try {
      // Extract public ID from Cloudinary URL
      const publicId = this.extractPublicId(fileUrl);
      if (!publicId) {
        throw new Error('Invalid Cloudinary URL provided');
      }

      // Build transformation parameters
      const transformations: any = {};

      if (options.width || options.height) {
        transformations.width = options.width;
        transformations.height = options.height;
        transformations.crop = 'fill';
      }

      if (options.quality) {
        transformations.quality = options.quality;
      }

      if (options.format) {
        transformations.format = options.format;
      }

      if (options.progressive) {
        transformations.flags = 'progressive';
      }

      // Generate the transformed URL
      const transformedUrl = cloudinary.url(publicId, transformations);

      // Get image info to return metadata
      const info = await cloudinary.api.resource(publicId);

      return {
        url: transformedUrl,
        width: transformations.width || info.width,
        height: transformations.height || info.height,
        size: info.bytes,
        format: options.format || info.format,
        metadata: {
          transformation: transformations,
          originalInfo: info,
        },
      };

    } catch (error) {
      this.logger.error('Failed to process file with Cloudinary:', error);
      throw new Error(`Cloudinary processing failed: ${error.message}`);
    }
  }

  async delete(options: DeleteOptions): Promise<boolean> {
    try {
      let publicId = options.publicId;

      if (!publicId && options.url) {
        publicId = this.extractPublicId(options.url);
      }

      if (!publicId) {
        throw new Error('Public ID or valid Cloudinary URL is required for deletion');
      }

      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        this.logger.log(`File deleted from Cloudinary: ${publicId}`);
        return true;
      } else {
        this.logger.warn(`Failed to delete file from Cloudinary: ${publicId} - ${result.result}`);
        return false;
      }

    } catch (error) {
      this.logger.error('Failed to delete file from Cloudinary:', error);
      
      if (options.force) {
        return true; // Return true if force delete is enabled
      }
      
      throw new Error(`Cloudinary deletion failed: ${error.message}`);
    }
  }

  async getFileInfo(publicId: string): Promise<any> {
    try {
      const info = await cloudinary.api.resource(publicId);
      return info;
    } catch (error) {
      this.logger.error('Failed to get file info from Cloudinary:', error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  async generateSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const timestamp = Math.round(Date.now() / 1000) + expiresIn;
      
      const signedUrl = cloudinary.url(publicId, {
        type: 'private',
        sign_url: true,
        auth_token: {
          duration: expiresIn,
        },
      });

      return signedUrl;
    } catch (error) {
      this.logger.error('Failed to generate signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  private extractPublicId(url: string): string | null {
    try {
      // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/filename.jpg
      const matches = url.match(/\/v\d+\/(.+?)(?:\.[^.]*)?$/);
      return matches ? matches[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate automatic variants for uploaded images
   */
  async generateAutoVariants(publicId: string): Promise<Record<string, string>> {
    const variants = {};

    const variantConfigs = [
      { name: 'thumbnail', width: 150, height: 150, crop: 'fill' },
      { name: 'small', width: 300, height: 300, crop: 'limit' },
      { name: 'medium', width: 600, height: 600, crop: 'limit' },
      { name: 'large', width: 1200, height: 1200, crop: 'limit' },
      { name: 'webp', format: 'webp', quality: 90 },
    ];

    for (const config of variantConfigs) {
      try {
        const url = cloudinary.url(publicId, config);
        variants[config.name] = url;
      } catch (error) {
        this.logger.warn(`Failed to generate ${config.name} variant:`, error);
      }
    }

    return variants;
  }
}
