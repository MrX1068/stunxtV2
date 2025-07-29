import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get notification analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getOverallStats(@Query('days') days: number = 30) {
    return this.analyticsService.getOverallStats(days);
  }

  @Get('by-type')
  @ApiOperation({ summary: 'Get notifications breakdown by type' })
  @ApiResponse({ status: 200, description: 'Type breakdown retrieved successfully' })
  async getTypeBreakdown(@Query('days') days: number = 30) {
    return this.analyticsService.getTypeBreakdown(days);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get daily notification statistics' })
  @ApiResponse({ status: 200, description: 'Daily stats retrieved successfully' })
  async getDailyStats(@Query('days') days: number = 30) {
    return this.analyticsService.getDailyStats(days);
  }
}
