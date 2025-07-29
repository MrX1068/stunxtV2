import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { TemplateService } from './template.service';
import { NotificationTemplate } from '../../entities/template.entity';

@ApiTags('Templates')
@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create notification template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() templateData: Partial<NotificationTemplate>) {
    return this.templateService.createTemplate(templateData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getAllTemplates() {
    return this.templateService.getAllTemplates();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get template by key' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplateByKey(@Param('key') key: string) {
    return this.templateService.getTemplateByKey(key);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateData: Partial<NotificationTemplate>,
  ) {
    return this.templateService.updateTemplate(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
    return { success: true };
  }
}
