import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SpaceService } from './space.service';

@ApiTags('Spaces')
@Controller('spaces')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SpaceStandaloneController {
  constructor(
    private readonly spaceService: SpaceService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get space by ID (standalone endpoint)' })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiResponse({ status: 200, description: 'Space found' })
  @ApiResponse({ status: 404, description: 'Space not found' })
  async getSpace(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.spaceService.findOne(id, req.user?.id);
  }
}
