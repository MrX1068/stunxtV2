import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { UploadSession } from '../../shared/entities/upload-session.entity';
import { UploadSessionStatus } from '../../shared/enums/file.enum';
import { InitResumableUploadDto } from '../../shared/dto/file.dto';

@Injectable()
export class ResumableUploadService {
  private readonly logger = new Logger(ResumableUploadService.name);
  private readonly tempDir: string;

  constructor(
    @InjectRepository(UploadSession)
    private readonly sessionRepository: Repository<UploadSession>,
    private readonly configService: ConfigService,
  ) {
    this.tempDir = this.configService.get('TEMP_DIRECTORY', './uploads/temp');
    this.ensureTempDirectoryExists();
  }

  /**
   * Initialize a resumable upload session
   */
  async initializeUpload(dto: InitResumableUploadDto, userId: string): Promise<UploadSession> {
    try {
      this.logger.log(`Initializing resumable upload for user: ${userId}`);

      // Calculate total chunks
      const totalChunks = Math.ceil(dto.size / dto.chunkSize);

      // Create upload session
      const session = this.sessionRepository.create({
        userId,
        filename: dto.filename,
        mimeType: dto.mimeType,
        totalSize: dto.size,
        chunkSize: dto.chunkSize,
        totalChunks,
        uploadedChunksList: [],
        metadata: dto.metadata,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        tempFilePath: this.generateTempFilePath(dto.filename),
      });

      const savedSession = await this.sessionRepository.save(session);

      // Create temporary file
      await this.createTempFile(savedSession.tempFilePath, dto.size);

      this.logger.log(`Upload session created: ${savedSession.id}`);
      return savedSession;

    } catch (error) {
      this.logger.error('Failed to initialize resumable upload:', error);
      throw error;
    }
  }

  /**
   * Upload a chunk of the file
   */
  async uploadChunk(
    sessionId: string, 
    chunkIndex: number, 
    chunkData: Buffer,
    userId: string,
  ): Promise<UploadSession> {
    const session = await this.getActiveSession(sessionId, userId);

    try {
      // Validate chunk index
      if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
        throw new BadRequestException(`Invalid chunk index: ${chunkIndex}`);
      }

      // Check if chunk already uploaded
      if (session.uploadedChunksList.includes(chunkIndex)) {
        this.logger.warn(`Chunk ${chunkIndex} already uploaded for session: ${sessionId}`);
        return session;
      }

      // Validate chunk size (except for the last chunk)
      const expectedSize = chunkIndex === session.totalChunks - 1 
        ? session.totalSize % session.chunkSize || session.chunkSize
        : session.chunkSize;

      if (chunkData.length !== expectedSize) {
        throw new BadRequestException(
          `Invalid chunk size: expected ${expectedSize}, got ${chunkData.length}`
        );
      }

      // Write chunk to temporary file
      await this.writeChunkToFile(session.tempFilePath, chunkIndex, chunkData, session.chunkSize);

      // Update session
      session.uploadedChunksList = [...session.uploadedChunksList, chunkIndex].sort((a, b) => a - b);
      session.uploadedChunks = session.uploadedChunksList.length;
      session.uploadedSize += chunkData.length;

      // Check if upload is complete
      if (session.uploadedChunks === session.totalChunks) {
        session.status = UploadSessionStatus.COMPLETED;
        this.logger.log(`Upload completed for session: ${sessionId}`);
      }

      const updatedSession = await this.sessionRepository.save(session);

      this.logger.log(`Chunk ${chunkIndex} uploaded for session: ${sessionId} (${session.progressPercentage}%)`);
      return updatedSession;

    } catch (error) {
      this.logger.error(`Failed to upload chunk ${chunkIndex} for session ${sessionId}:`, error);
      
      // Mark session as failed
      session.status = UploadSessionStatus.FAILED;
      await this.sessionRepository.save(session);
      
      throw error;
    }
  }

  /**
   * Get upload session status
   */
  async getSessionStatus(sessionId: string, userId: string): Promise<UploadSession> {
    return this.getActiveSession(sessionId, userId);
  }

  /**
   * Get missing chunks for a session
   */
  async getMissingChunks(sessionId: string, userId: string): Promise<number[]> {
    const session = await this.getActiveSession(sessionId, userId);
    return session.remainingChunks;
  }

  /**
   * Complete the upload and get the final file buffer
   */
  async completeUpload(sessionId: string, userId: string): Promise<{ buffer: Buffer; session: UploadSession }> {
    const session = await this.getActiveSession(sessionId, userId);

    if (session.status !== UploadSessionStatus.COMPLETED) {
      throw new BadRequestException('Upload session is not completed');
    }

    try {
      // Read the complete file from temporary storage
      const buffer = await fs.promises.readFile(session.tempFilePath);

      // Validate file size
      if (buffer.length !== session.totalSize) {
        throw new BadRequestException(
          `File size mismatch: expected ${session.totalSize}, got ${buffer.length}`
        );
      }

      this.logger.log(`Upload completed and verified for session: ${sessionId}`);
      return { buffer, session };

    } catch (error) {
      this.logger.error(`Failed to complete upload for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel an upload session
   */
  async cancelUpload(sessionId: string, userId: string): Promise<void> {
    const session = await this.getActiveSession(sessionId, userId);

    try {
      // Update session status
      session.status = UploadSessionStatus.FAILED;
      await this.sessionRepository.save(session);

      // Clean up temporary file
      await this.cleanupTempFile(session.tempFilePath);

      this.logger.log(`Upload session cancelled: ${sessionId}`);

    } catch (error) {
      this.logger.error(`Failed to cancel upload session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions (scheduled task)
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const expiredSessions = await this.sessionRepository.find({
        where: {
          expiresAt: new Date(),
          status: UploadSessionStatus.ACTIVE,
        },
      });

      for (const session of expiredSessions) {
        session.status = UploadSessionStatus.EXPIRED;
        await this.sessionRepository.save(session);
        await this.cleanupTempFile(session.tempFilePath);
      }

      this.logger.log(`Cleaned up ${expiredSessions.length} expired upload sessions`);

    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Get active upload session with validation
   */
  private async getActiveSession(sessionId: string, userId: string): Promise<UploadSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException(`Upload session not found: ${sessionId}`);
    }

    if (session.isExpired) {
      throw new BadRequestException(`Upload session expired: ${sessionId}`);
    }

    if (session.status === UploadSessionStatus.FAILED) {
      throw new BadRequestException(`Upload session failed: ${sessionId}`);
    }

    return session;
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDirectoryExists(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.log(`Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Generate temporary file path
   */
  private generateTempFilePath(filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return path.join(this.tempDir, `upload_${timestamp}_${random}_${safeName}`);
  }

  /**
   * Create temporary file with allocated size
   */
  private async createTempFile(filePath: string, size: number): Promise<void> {
    const fd = await fs.promises.open(filePath, 'w');
    try {
      // Pre-allocate file size for better performance
      await fd.truncate(size);
    } finally {
      await fd.close();
    }
  }

  /**
   * Write chunk to specific position in file
   */
  private async writeChunkToFile(
    filePath: string, 
    chunkIndex: number, 
    chunkData: Buffer, 
    chunkSize: number,
  ): Promise<void> {
    const position = chunkIndex * chunkSize;
    const fd = await fs.promises.open(filePath, 'r+');
    
    try {
      await fd.write(chunkData, 0, chunkData.length, position);
    } finally {
      await fd.close();
    }
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }
}
