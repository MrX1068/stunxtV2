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
    

    
    try {
      await this.uploadService.processFileUpload(fileId, fileBuffer, generateVariants);
    
    } catch (error) {
  
      throw error;
    }
  }

  @Process('cleanup-temp-files')
  async cleanupTempFiles(job: Job): Promise<void> {

    
    // Implementation for cleaning up temporary files
    // This would scan temp directory and remove old files
   
  }

  @Process('generate-thumbnails')
  async generateThumbnails(job: Job): Promise<void> {
    const { fileId } = job.data;
    

    
    // Implementation for thumbnail generation
    // This would be handled by the processing service
    

  }
}
