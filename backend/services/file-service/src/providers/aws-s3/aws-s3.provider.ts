import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommandInput 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
export class AwsS3Provider extends StorageProviderInterface {
  private readonly logger = new Logger(AwsS3Provider.name);
  private s3Client: S3Client;
  private bucket: string;
  
  readonly provider = StorageProvider.AWS_S3;
  readonly supportedTypes = [FileType.DOCUMENT, FileType.IMAGE, FileType.VIDEO, FileType.AUDIO, FileType.ARCHIVE, FileType.OTHER];
  readonly maxFileSize = 5 * 1024 * 1024 * 1024; // 5GB

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeS3Client();
  }

  private initializeS3Client(): void {
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get('AWS_REGION', 'us-east-1');
    this.bucket = this.configService.get('AWS_S3_BUCKET');

    if (!accessKeyId || !secretAccessKey || !this.bucket) {
    
      return;
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });


  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    this.validateUploadOptions(options);

    try {
      const key = this.generateS3Key(options.fileName, options.folder);
      
      const uploadParams: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
        Body: options.buffer,
        ContentType: options.mimeType,
        ContentLength: options.size,
        Metadata: this.processMetadata(options.metadata),
      };

      // Set ACL based on privacy
      if (options.isPublic) {
        uploadParams.ACL = 'public-read';
      } else {
        uploadParams.ACL = 'private';
      }

      // Add server-side encryption
      uploadParams.ServerSideEncryption = 'AES256';

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      // Generate URL
      const url = options.isPublic 
        ? this.generatePublicUrl(key)
        : await this.generateSignedUrl(key, 3600); // 1 hour for private files

   

      return {
        url,
        publicId: key,
        size: options.size,
        format: this.getFileExtension(options.fileName),
        metadata: {
          bucket: this.bucket,
          key,
          region: this.configService.get('AWS_REGION'),
          isPublic: options.isPublic,
        },
      };

    } catch (error) {

      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async process(fileUrl: string, options: ProcessingOptions): Promise<ProcessingResult> {
    // S3 doesn't have built-in image processing
    // This would typically be handled by a separate service like Lambda with Sharp
    // For now, we'll return the original file
    

    
    try {
      const key = this.extractS3Key(fileUrl);
      const fileInfo = await this.getFileInfo(key);
      
      return {
        url: fileUrl,
        size: fileInfo.ContentLength || 0,
        format: this.getFileExtension(key),
        metadata: {
          message: 'S3 provider does not support built-in processing',
          originalUrl: fileUrl,
          processedBy: 'none',
        },
      };
    } catch (error) {

      throw new Error(`S3 processing failed: ${error.message}`);
    }
  }

  async delete(options: DeleteOptions): Promise<boolean> {
    try {
      let key = options.publicId;

      if (!key && options.url) {
        key = this.extractS3Key(options.url);
      }

      if (!key) {
        throw new Error('Key or valid S3 URL is required for deletion');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      return true;

    } catch (error) {
      
      
      if (options.force) {
        return true; // Return true if force delete is enabled
      }
      
      throw new Error(`S3 deletion failed: ${error.message}`);
    }
  }

  async getFileInfo(publicId: string): Promise<any> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
      });

      const result = await this.s3Client.send(command);
      return result;
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  async generateSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: publicId,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Generate S3 key (path) for the file
   */
  private generateS3Key(fileName: string, folder?: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uniqueFileName = this.generateFileName(fileName);
    
    if (folder) {
      return `${folder}/${timestamp}/${uniqueFileName}`;
    }
    
    return `files/${timestamp}/${uniqueFileName}`;
  }

  /**
   * Generate public URL for S3 file
   */
  private generatePublicUrl(key: string): string {
    const region = this.configService.get('AWS_REGION', 'us-east-1');
    const cdnDomain = this.configService.get('AWS_CDN_DOMAIN');
    
    if (cdnDomain) {
      return `https://${cdnDomain}/${key}`;
    }
    
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Extract S3 key from URL
   */
  private extractS3Key(url: string): string | null {
    try {
      // Handle different S3 URL formats
      if (url.includes('.s3.')) {
        // https://bucket.s3.region.amazonaws.com/key
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1); // Remove leading /
      } else if (url.includes('s3.amazonaws.com')) {
        // https://s3.amazonaws.com/bucket/key
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.substring(1).split('/');
        return pathParts.slice(1).join('/'); // Remove bucket name
      } else if (url.includes('amazonaws.com')) {
        // Custom domain or CDN
        const urlObj = new URL(url);
        return urlObj.pathname.substring(1);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Process metadata for S3 (convert to string values)
   */
  private processMetadata(metadata?: Record<string, any>): Record<string, string> {
    if (!metadata) return {};
    
    const s3Metadata: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // S3 metadata keys must be lowercase and values must be strings
      const s3Key = key.toLowerCase().replace(/[^a-z0-9\-]/g, '-');
      s3Metadata[s3Key] = String(value);
    }
    
    return s3Metadata;
  }

  /**
   * Setup lifecycle policies for cost optimization
   */
  async setupLifecyclePolicies(): Promise<void> {
    // This would set up S3 lifecycle policies to automatically move files to cheaper storage classes
    // Implementation would require additional AWS SDK calls

  }
}
