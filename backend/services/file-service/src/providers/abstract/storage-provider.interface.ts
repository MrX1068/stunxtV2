import { FileType, StorageProvider } from '../../shared/enums/file.enum';

export interface UploadOptions {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
  metadata?: Record<string, any>;
  folder?: string;
  isPublic?: boolean;
}

export interface UploadResult {
  url: string;
  publicId?: string;
  size: number;
  format?: string;
  metadata?: Record<string, any>;
}

export interface ProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  progressive?: boolean;
  compress?: boolean;
}

export interface ProcessingResult {
  url: string;
  width?: number;
  height?: number;
  size: number;
  format: string;
  metadata?: Record<string, any>;
}

export interface DeleteOptions {
  publicId?: string;
  url?: string;
  force?: boolean;
}

export abstract class StorageProviderInterface {
  abstract readonly provider: StorageProvider;
  abstract readonly supportedTypes: FileType[];
  abstract readonly maxFileSize: number;

  /**
   * Upload a file to the storage provider
   */
  abstract upload(options: UploadOptions): Promise<UploadResult>;

  /**
   * Process/transform a file (resize, convert format, etc.)
   */
  abstract process(
    fileUrl: string,
    options: ProcessingOptions,
  ): Promise<ProcessingResult>;

  /**
   * Delete a file from the storage provider
   */
  abstract delete(options: DeleteOptions): Promise<boolean>;

  /**
   * Get file information
   */
  abstract getFileInfo(publicId: string): Promise<any>;

  /**
   * Generate a signed URL for private files
   */
  abstract generateSignedUrl(
    publicId: string,
    expiresIn?: number,
  ): Promise<string>;

  /**
   * Check if file type is supported by this provider
   */
  isTypeSupported(fileType: FileType): boolean {
    return this.supportedTypes.includes(fileType);
  }

  /**
   * Check if file size is within limits
   */
  isSizeSupported(size: number): boolean {
    return size <= this.maxFileSize;
  }

  /**
   * Validate upload options
   */
  protected validateUploadOptions(options: UploadOptions): void {
    if (!options.fileName) {
      throw new Error('File name is required');
    }
    if (!options.buffer || options.buffer.length === 0) {
      throw new Error('File buffer is required');
    }
    if (!options.mimeType) {
      throw new Error('MIME type is required');
    }
    if (options.size <= 0) {
      throw new Error('File size must be greater than 0');
    }
    if (!this.isSizeSupported(options.size)) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`);
    }
  }

  /**
   * Extract file extension from filename
   */
  protected getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Generate unique filename
   */
  protected generateFileName(originalName: string, prefix?: string): string {
    const ext = this.getFileExtension(originalName);
    const name = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return prefix 
      ? `${prefix}/${name}_${timestamp}_${random}.${ext}`
      : `${name}_${timestamp}_${random}.${ext}`;
  }
}
