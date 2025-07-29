import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationTemplate, TemplateType } from '../../entities/template.entity';

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  async createTemplate(templateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const template = this.templateRepository.create(templateData);
    return this.templateRepository.save(template);
  }

  async getTemplateByKey(key: string): Promise<NotificationTemplate | null> {
    return this.templateRepository.findOne({
      where: { key, isActive: true },
    });
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateTemplate(id: string, updateData: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    await this.templateRepository.update(id, updateData);
    return this.templateRepository.findOne({ where: { id } });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.templateRepository.update(id, { isActive: false });
  }
}
