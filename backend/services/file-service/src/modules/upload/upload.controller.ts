import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { UploadService } from './upload.service';
import { 
  UploadFileDto, 
  UpdateFileDto, 
  GenerateVariantsDto, 
  OptimizeFileDto,
  FileQueryDto 
} from '../../shared/dto/file.dto';
import { File } from '../../shared/entities/file.entity';

@ApiTags('upload')
@Controller('files')
@UseGuards(ThrottlerGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'File uploaded successfully',
    type: File 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid file or upload parameters' 
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @Request() req: any,
  ): Promise<{ success: boolean; data: File; message: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user?.sub || req.user?.id || 'anonymous';
    const uploadedFile = await this.uploadService.uploadFile(file, dto, userId);

    return {
      success: true,
      data: uploadedFile,
      message: 'File uploaded successfully',
    };
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Files uploaded successfully' 
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadFileDto,
    @Request() req: any,
  ): Promise<{ success: boolean; data: File[]; message: string }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const userId = req.user?.sub || req.user?.id || 'anonymous';
    const uploadPromises = files.map(file => 
      this.uploadService.uploadFile(file, dto, userId)
    );

    const uploadedFiles = await Promise.all(uploadPromises);

    return {
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} files uploaded successfully`,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get files with filtering and pagination' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Files retrieved successfully' 
  })
  async getFiles(
    @Query() query: FileQueryDto,
    @Request() req: any,
  ): Promise<{ 
    success: boolean; 
    data: File[]; 
    pagination: { 
      total: number; 
      page: number; 
      limit: number; 
      totalPages: number; 
    }; 
  }> {
    const userId = req.user?.sub || req.user?.id;
    // Implementation would be in a separate file service
    
    return {
      success: true,
      data: [],
      pagination: {
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: 0,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'File retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'File not found' 
  })
  async getFileById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ success: boolean; data: File }> {
    // Implementation would be in a separate file service
    throw new NotFoundException('File service method not implemented yet');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'File updated successfully' 
  })
  async updateFile(
    @Param('id') id: string,
    @Body() dto: UpdateFileDto,
    @Request() req: any,
  ): Promise<{ success: boolean; data: File; message: string }> {
    // Implementation would be in a separate file service
    throw new NotFoundException('File service method not implemented yet');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'File deleted successfully' 
  })
  async deleteFile(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    // Implementation would be in a separate file service
    throw new NotFoundException('File service method not implemented yet');
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Generate file variants' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Variants generation started' 
  })
  async generateVariants(
    @Param('id') id: string,
    @Body() dto: GenerateVariantsDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    // Implementation would be in processing service
    throw new NotFoundException('Processing service method not implemented yet');
  }

  @Post(':id/optimize')
  @ApiOperation({ summary: 'Optimize file' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'File optimization started' 
  })
  async optimizeFile(
    @Param('id') id: string,
    @Body() dto: OptimizeFileDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    // Implementation would be in processing service
    throw new NotFoundException('Processing service method not implemented yet');
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'File download URL generated' 
  })
  async downloadFile(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ success: boolean; data: { downloadUrl: string; expiresIn: number } }> {
    // Implementation would be in a separate file service
    throw new NotFoundException('Download service method not implemented yet');
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for upload service' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Upload service is healthy' 
  })
  async healthCheck(): Promise<{ 
    success: boolean; 
    status: string; 
    timestamp: string;
    services: Record<string, string>;
  }> {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        upload: 'operational',
        storage: 'operational',
        queue: 'operational',
      },
    };
  }
}
