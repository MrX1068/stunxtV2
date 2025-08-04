import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

import { File } from '../../shared/entities/file.entity';
import { FileVariant } from '../../shared/entities/file-variant.entity';
import { 
  FileType as FileTypeEnum, 
  FileStatus, 
  StorageProvider, 
  FileCategory, 
  FilePrivacy 
} from '../../shared/enums/file.enum';
import { UploadFileDto } from '../../shared/dto/file.dto';
import { VirusScannerService } from '../../services/virus-scanner.service';

import { CloudinaryProvider } from '../../providers/cloudinary/cloudinary.provider';
import { AwsS3Provider } from '../../providers/aws-s3/aws-s3.provider';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    
    @InjectRepository(FileVariant)
    private readonly variantRepository: Repository<FileVariant>,
    
    @InjectQueue('file-upload')
    private readonly uploadQueue: Queue,
    
    @InjectQueue('file-processing')
    private readonly processingQueue: Queue,
    
    private readonly configService: ConfigService,
    private readonly cloudinaryProvider: CloudinaryProvider,
    private readonly awsS3Provider: AwsS3Provider,
    private readonly virusScannerService: VirusScannerService,
  ) {}

  /**
   * Upload a single file
   */
  async uploadFile(
    file: Express.Multer.File,
    dto: UploadFileDto,
    userId: string,
  ): Promise<File> {
    try {
    

      // Validate file
      await this.validateFile(file);

      // SECURITY: Scan for viruses before processing
      const scanResult = await this.virusScannerService.scanBuffer(
        file.buffer, 
        file.originalname
      );

      if (scanResult.isInfected) {
       
        throw new BadRequestException(
          `File rejected: virus detected (${scanResult.viruses.join(', ')})`
        );
      }

      // Detect file type
      const fileType = this.detectFileType(file.mimetype);
      
      // Generate checksum
      const checksum = this.generateChecksum(file.buffer);

      // Check for duplicate files
      const existingFile = await this.checkDuplicateFile(checksum, userId);
      if (existingFile) {
        return existingFile;
      }

      // Create file entity
      const fileEntity = this.fileRepository.create({
        userId,
        originalName: file.originalname,
        filename: this.generateFileName(file.originalname),
        mimeType: file.mimetype,
        type: fileType,
        size: file.size,
        checksum,
        category: dto.category || FileCategory.CONTENT,
        privacy: dto.privacy || FilePrivacy.PRIVATE,
        status: FileStatus.UPLOADING,
        metadata: {
          ...dto.metadata,
          uploadedAt: new Date().toISOString(),
          userAgent: 'file-service',
          virusScanned: scanResult.isInfected === false, // Mark as scanned
          virusScanResult: {
            scanned: true,
            clean: !scanResult.isInfected,
            scanDate: new Date().toISOString(),
          },
        },
      });

      const savedFile = await this.fileRepository.save(fileEntity);

      // For avatar uploads, process immediately (no background queue needed)
      if (dto.category === FileCategory.AVATAR) {
     
        try {
          await this.processFileUpload(savedFile.id, file.buffer, dto.variants);
          // Re-fetch the file to get updated URL
          const updatedFile = await this.fileRepository.findOne({ where: { id: savedFile.id } });
      
          return updatedFile || savedFile;
        } catch (error) {
         
          // Fall back to returning the queued file
          return savedFile;
        }
      }

      // For other files, use background processing
      await this.uploadQueue.add('process-upload', {
        fileId: savedFile.id,
        fileBuffer: file.buffer,
        generateVariants: dto.variants,
      }, {
        priority: this.getUploadPriority(fileType),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

     
      return savedFile;

    } catch (error) {
     
      throw error;
    }
  }

  /**
   * Process file upload in background
   */
  async processFileUpload(fileId: string, fileBuffer: Buffer, generateVariants?: string[]): Promise<void> {

    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    try {
  

      // Choose storage provider based on file type
      const provider = this.chooseStorageProvider(file.type);

      
      // Upload to primary storage

      const uploadResult = await provider.upload({
        fileName: file.filename,
        buffer: fileBuffer,
        mimeType: file.mimeType,
        size: file.size,
        metadata: file.metadata,
        isPublic: file.privacy === FilePrivacy.PUBLIC,
      });
      


      // Update file with storage information
      file.primaryProvider = provider.provider;
      file.primaryUrl = uploadResult.url;
      file.status = FileStatus.READY;

      // Update metadata with provider-specific info
      file.metadata = {
        ...file.metadata,
        ...uploadResult.metadata,
        processedAt: new Date().toISOString(),
      };

      await this.fileRepository.save(file);
   

      // Generate variants if requested
      if (generateVariants && generateVariants.length > 0) {
    
        await this.processingQueue.add('generate-variants', {
          fileId: file.id,
          variants: generateVariants,
        });
      }

      // Upload backup copy if configured (disabled for now)
      // await this.uploadBackupCopy(file, fileBuffer);

    

    } catch (error) {
   
      
      // Update file status to failed
      file.status = FileStatus.FAILED;
      file.metadata = {
        ...file.metadata,
        error: error.message,
        failedAt: new Date().toISOString(),
      };
      
      await this.fileRepository.save(file);
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  private async validateFile(file: Express.Multer.File): Promise<void> {
    // Check file size
    const maxSize = parseInt(this.configService.get('MAX_FILE_SIZE', '104857600'));
    if (file.size > maxSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${maxSize} bytes`);
    }

    // Check file type
    const allowedTypes = this.configService.get('ALLOWED_MIME_TYPES', 'image/*,video/*,application/pdf').split(',');
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.mimetype.startsWith(type.replace('/*', '/'));
      }
      return file.mimetype === type;
    });

    if (!isAllowed) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    // Additional security checks
    if (file.buffer) {
      await this.performSecurityChecks(file.buffer, file.mimetype);
    }
  }

  /**
   * Perform security checks on file content
   */
  private async performSecurityChecks(buffer: Buffer, mimeType: string): Promise<void> {
    try {
      // Verify actual file type matches declared MIME type
      const fileType = await fileTypeFromBuffer(buffer);
      
      if (fileType && !mimeType.includes(fileType.mime)) {
       
        // For now, log warning. In production, you might want to reject the file
      }

      // Check for malicious content patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
      ];

      const content = buffer.toString('utf8').substring(0, 1024); // Check first 1KB
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          throw new BadRequestException('File contains potentially malicious content');
        }
      }

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // If file type detection fails, continue (might be a valid binary file)

    }
  }

  /**
   * Detect file type from MIME type
   */
  private detectFileType(mimeType: string): FileTypeEnum {
    if (mimeType.startsWith('image/')) return FileTypeEnum.IMAGE;
    if (mimeType.startsWith('video/')) return FileTypeEnum.VIDEO;
    if (mimeType.startsWith('audio/')) return FileTypeEnum.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text/')) {
      return FileTypeEnum.DOCUMENT;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) {
      return FileTypeEnum.ARCHIVE;
    }
    return FileTypeEnum.OTHER;
  }

  /**
   * Generate unique filename
   */
  private generateFileName(originalName: string): string {
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const name = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${name}_${timestamp}_${random}.${ext}`;
  }

  /**
   * Generate file checksum
   */
  private generateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check for duplicate files
   */
  private async checkDuplicateFile(checksum: string, userId: string): Promise<File | null> {
    return this.fileRepository.findOne({
      where: { checksum, userId, status: FileStatus.READY },
    });
  }

  /**
   * Choose appropriate storage provider based on file type
   */
  private chooseStorageProvider(fileType: FileTypeEnum) {
    // Use Cloudinary for images and videos (has processing capabilities)
    if (fileType === FileTypeEnum.IMAGE || fileType === FileTypeEnum.VIDEO) {
      return this.cloudinaryProvider;
    }
    
    // Use S3 for documents and other files
    return this.awsS3Provider;
  }

  /**
   * Upload backup copy to secondary storage
   */
  private async uploadBackupCopy(file: File, buffer: Buffer): Promise<void> {
    try {
      // Only create backup if primary provider is not S3
      if (file.primaryProvider !== StorageProvider.AWS_S3) {
        const backupResult = await this.awsS3Provider.upload({
          fileName: `backup_${file.filename}`,
          buffer,
          mimeType: file.mimeType,
          size: file.size,
          metadata: { ...file.metadata, isBackup: true },
          folder: 'backups',
          isPublic: false,
        });

        file.backupProvider = StorageProvider.AWS_S3;
        file.backupUrl = backupResult.url;
        
        await this.fileRepository.save(file);
      }
    } catch (error) {
      // Don't fail the main upload if backup fails
    }
  }

  /**
   * Get upload priority based on file type
   */
  private getUploadPriority(fileType: FileTypeEnum): number {
    switch (fileType) {
      case FileTypeEnum.IMAGE:
        return 1; // High priority
      case FileTypeEnum.VIDEO:
        return 2; // Medium priority
      case FileTypeEnum.DOCUMENT:
        return 3; // Low priority
      default:
        return 5; // Lowest priority
    }
  }

  /**
   * Get upload queue for monitoring
   */
  getUploadQueue() {
    return this.uploadQueue;
  }

  /**
   * Get processing queue for monitoring
   */
  getProcessingQueue() {
    return this.processingQueue;
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string) {
    return await this.fileRepository.findOne({ where: { id: fileId } });
  }
}
