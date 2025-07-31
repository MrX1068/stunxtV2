import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { UploadService } from './upload.service';

@Processor('file-upload')
export class UploadProcessor {
  private readonly logger = new Logger(UploadProcessor.name);

  constructor(private readonly uploadService: UploadService) {}

  @Process('process-upload')
  async processUpload(job: Job): Promise<void> {
    const { fileId, fileBuffer, generateVariants } = job.data;
    
    this.logger.log(`🔄 Processing upload job for file: ${fileId}`);
    this.logger.log(`📊 File buffer size: ${fileBuffer?.length || 0} bytes`);
    
    try {
      await this.uploadService.processFileUpload(fileId, fileBuffer, generateVariants);
      this.logger.log(`✅ Upload processing completed for file: ${fileId}`);
    } catch (error) {
      this.logger.error(`❌ Upload processing failed for file: ${fileId}`, error);
      this.logger.error(`Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  @Process('cleanup-temp-files')
  async cleanupTempFiles(job: Job): Promise<void> {
    this.logger.log('Starting temporary files cleanup');
    
    // Implementation for cleaning up temporary files
    // This would scan temp directory and remove old files
    
    this.logger.log('Temporary files cleanup completed');
  }

  @Process('generate-thumbnails')
  async generateThumbnails(job: Job): Promise<void> {
    const { fileId } = job.data;
    
    this.logger.log(`Generating thumbnails for file: ${fileId}`);
    
    // Implementation for thumbnail generation
    // This would be handled by the processing service
    
    this.logger.log(`Thumbnail generation completed for file: ${fileId}`);
  }
}
