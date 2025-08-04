import { Injectable, Logger } from '@nestjs/common';
import { GrpcFileClient } from './grpc-file.client';

export interface FileUploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  category: string;
  privacy: 'public' | 'private';
}

@Injectable()
export class DirectFileService {
  private readonly logger = new Logger(DirectFileService.name);

  constructor(private readonly grpcFileClient: GrpcFileClient) {}

  /**
   * Upload file using gRPC communication with file service
   * Professional microservice architecture approach
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: string = 'avatar',
    privacy: 'public' | 'private' = 'public',
    userId?: string,
  ): Promise<FileUploadResult> {
    try {
  

      // Use gRPC client for microservice communication
      const result = await this.grpcFileClient.uploadFile(
        fileBuffer,
        originalName,
        mimeType,
        category,
        privacy,
        userId || 'anonymous',
      );

      return {
        id: result.id,
        url: result.url,
        filename: result.filename,
        size: result.size,
        mimeType: result.mimeType,
        category: result.category,
        privacy: result.privacy as 'public' | 'private',
      };
    } catch (error) {
  
      throw error;
    }
  }

  /**
   * Delete file using gRPC communication with file service
   */
  async deleteFile(fileId: string, userId?: string): Promise<void> {
    try {
      await this.grpcFileClient.deleteFile(fileId, userId || 'anonymous');
   
    } catch (error) {

      throw error;
    }
  }
}
