import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync } from 'fs';

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
export class GrpcFileClient implements OnModuleInit {
  private readonly logger = new Logger(GrpcFileClient.name);
  private client: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeGrpcClient();
  }

  private async initializeGrpcClient() {
    try {
      // Load proto file - try multiple paths for flexibility
      const protoPaths = [
        join(process.cwd(), 'proto/file-service.proto'), // Development path
        join(__dirname, '../../../proto/file-service.proto'), // Compiled path
        join(process.cwd(), 'backend/proto/file-service.proto'), // Alternative path
      ];
      
      let PROTO_PATH: string | null = null;
      for (const path of protoPaths) {
        if (existsSync(path)) {
          PROTO_PATH = path;
          break;
        }
      }
      
      if (!PROTO_PATH) {
        throw new Error(`Proto file not found. Tried paths: ${protoPaths.join(', ')}`);
      }
      
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const fileServiceProto = grpc.loadPackageDefinition(packageDefinition).fileservice as any;

      // Create client
      const fileServiceUrl = this.configService.get<string>('FILE_SERVICE_GRPC_URL', 'localhost:50051');
      
      this.client = new fileServiceProto.FileService(
        fileServiceUrl,
        grpc.credentials.createInsecure()
      );

      this.logger.log(`gRPC File Client connected to ${fileServiceUrl}`);
    } catch (error) {
      this.logger.error('Failed to initialize gRPC client:', error);
      throw error;
    }
  }

  /**
   * Upload file via gRPC
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    category: string = 'avatar',
    privacy: 'public' | 'private' = 'public',
    userId: string,
  ): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('gRPC client not initialized'));
        return;
      }

      this.logger.log(`gRPC Upload: ${originalName} (${fileBuffer.length} bytes) for user: ${userId}`);

      const request = {
        file_data: fileBuffer,
        original_name: originalName,
        mime_type: mimeType,
        category,
        privacy,
        user_id: userId,
      };

      // Set timeout for large file uploads
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 60); // 60 second timeout

      this.client.uploadFile(request, { deadline }, (error: any, response: any) => {
        if (error) {
          this.logger.error('gRPC Upload failed:', error);
          reject(new Error(`gRPC Upload failed: ${error.message}`));
          return;
        }

        if (!response.success) {
          this.logger.error('gRPC Upload unsuccessful:', response.message);
          reject(new Error(response.message || 'Upload failed'));
          return;
        }

        const result: FileUploadResult = {
          id: response.file_info.id,
          url: response.file_info.url,
          filename: response.file_info.filename,
          size: parseInt(response.file_info.size),
          mimeType: response.file_info.mime_type,
          category: response.file_info.category,
          privacy: response.file_info.privacy as 'public' | 'private',
        };

        this.logger.log(`gRPC Upload successful: ${result.filename}`);
        resolve(result);
      });
    });
  }

  /**
   * Delete file via gRPC
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('gRPC client not initialized'));
        return;
      }

      this.logger.log(`gRPC Delete: ${fileId} for user: ${userId}`);

      const request = {
        file_id: fileId,
        user_id: userId,
      };

      this.client.deleteFile(request, (error: any, response: any) => {
        if (error) {
          this.logger.error('gRPC Delete failed:', error);
          reject(new Error(`gRPC Delete failed: ${error.message}`));
          return;
        }

        if (!response.success) {
          this.logger.error('gRPC Delete unsuccessful:', response.message);
          reject(new Error(response.message || 'Delete failed'));
          return;
        }

        this.logger.log(`gRPC Delete successful: ${fileId}`);
        resolve();
      });
    });
  }

  /**
   * Get file info via gRPC
   */
  async getFileInfo(fileId: string, userId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('gRPC client not initialized'));
        return;
      }

      this.logger.log(`gRPC GetFileInfo: ${fileId} for user: ${userId}`);

      const request = {
        file_id: fileId,
        user_id: userId,
      };

      this.client.getFileInfo(request, (error: any, response: any) => {
        if (error) {
          this.logger.error('gRPC GetFileInfo failed:', error);
          reject(new Error(`gRPC GetFileInfo failed: ${error.message}`));
          return;
        }

        if (!response.success) {
          this.logger.error('gRPC GetFileInfo unsuccessful:', response.message);
          reject(new Error(response.message || 'Get file info failed'));
          return;
        }

        this.logger.log(`gRPC GetFileInfo successful: ${fileId}`);
        resolve(response.file_info);
      });
    });
  }

  /**
   * Check if gRPC client is ready
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Health check for gRPC connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get file info for a non-existent file to test connection
      await this.getFileInfo('health-check', 'system');
      return true;
    } catch (error) {
      // If we get a proper gRPC error (not connection error), service is healthy
      return error.message.includes('gRPC') && !error.message.includes('connect');
    }
  }
}
