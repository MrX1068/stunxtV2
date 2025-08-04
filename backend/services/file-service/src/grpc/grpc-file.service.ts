import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ConfigService } from '@nestjs/config';
import { UploadService } from '../modules/upload/upload.service';
import { join } from 'path';

// gRPC service interface
interface FileServiceServer {
  uploadFile: grpc.handleUnaryCall<any, any>;
  deleteFile: grpc.handleUnaryCall<any, any>;
  getFileInfo: grpc.handleUnaryCall<any, any>;
}

@Injectable()
export class GrpcFileService implements OnModuleInit, FileServiceServer {
  private readonly logger = new Logger(GrpcFileService.name);
  private server: grpc.Server;

  constructor(
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.server = new grpc.Server();
  }

  async onModuleInit() {
    await this.startGrpcServer();
  }

  private async startGrpcServer() {
    try {
      // Load proto file
      const PROTO_PATH = join(__dirname, '../../../proto/file-service.proto');
      
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const fileServiceProto = grpc.loadPackageDefinition(packageDefinition).fileservice as any;

      // Add service implementation
      this.server.addService(fileServiceProto.FileService.service, {
        uploadFile: this.uploadFile.bind(this),
        deleteFile: this.deleteFile.bind(this),
        getFileInfo: this.getFileInfo.bind(this),
      });

      // Start server
      const port = this.configService.get<string>('GRPC_PORT', '50051');
      const host = this.configService.get<string>('GRPC_HOST', '0.0.0.0');
      
      this.server.bindAsync(
        `${host}:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
          if (err) {
            throw err;
          }
          
          this.server.start();
          
        }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * gRPC Upload File Handler
   */
  async uploadFile(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    try {
      const { file_data, original_name, mime_type, category, privacy, user_id } = call.request;

    

      // Convert gRPC buffer to Node.js Buffer
      const fileBuffer = Buffer.from(file_data);

      // Create mock Multer file object
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: original_name,
        encoding: '7bit',
        mimetype: mime_type,
        size: fileBuffer.length,
        buffer: fileBuffer,
        destination: '',
        filename: '',
        path: '',
        stream: null,
      };

      // Use upload service (file, dto, userId)
      const result = await this.uploadService.uploadFile(mockFile, {
        category: category || 'content',
        privacy: privacy || 'private',
        variants: [],
        metadata: {},
      }, user_id);

      // Return success response
      callback(null, {
        success: true,
        message: 'File uploaded successfully',
        file_info: {
          id: result.id,
          url: result.primaryUrl || '',
          filename: result.filename,
          size: result.size,
          mime_type: result.mimeType,
          category: result.category,
          privacy: result.privacy,
          created_at: result.createdAt?.toISOString(),
          updated_at: result.updatedAt?.toISOString(),
        },
      });

    } catch (error) {

      
      callback({
        code: grpc.status.INTERNAL,
        message: error.message || 'File upload failed',
      });
    }
  }

  /**
   * gRPC Delete File Handler
   */
  async deleteFile(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    try {
      const { file_id, user_id } = call.request;

    

      // TODO: Implement delete functionality in upload service
      // await this.uploadService.deleteFile(file_id, user_id);

      callback(null, {
        success: true,
        message: 'File deleted successfully',
      });

    } catch (error) {
 
      
      callback({
        code: grpc.status.INTERNAL,
        message: error.message || 'File deletion failed',
      });
    }
  }

  /**
   * gRPC Get File Info Handler
   */
  async getFileInfo(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ) {
    try {
      const { file_id, user_id } = call.request;

 

      // TODO: Implement get file info functionality
      // const fileInfo = await this.uploadService.getFileInfo(file_id, user_id);

      callback(null, {
        success: true,
        file_info: {
          id: file_id,
          url: '',
          filename: '',
          size: 0,
          mime_type: '',
          category: '',
          privacy: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

    } catch (error) {
  
      
      callback({
        code: grpc.status.INTERNAL,
        message: error.message || 'Failed to get file info',
      });
    }
  }

  async onApplicationShutdown() {
    if (this.server) {
   
      this.server.forceShutdown();
    }
  }
}
