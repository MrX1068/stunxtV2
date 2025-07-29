import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { MessageService } from './message.service';
import { ConversationType } from '../shared/entities/conversation.entity';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  IsUUID,
  MaxLength,
  IsBoolean,
} from 'class-validator';

// DTOs
class CreateConversationDto {
  @IsEnum(ConversationType, { message: 'Invalid conversation type' })
  type: ConversationType;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Conversation name too long' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description too long' })
  description?: string;

  @IsArray()
  @IsUUID(4, { each: true, message: 'Invalid participant user ID' })
  participantIds: string[];
}

class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Conversation name too long' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description too long' })
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  allowInvites?: boolean;
}

class AddParticipantDto {
  @IsUUID(4, { message: 'Invalid user ID' })
  userId: string;
}

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create new conversation',
    description: 'Create a new conversation with specified participants'
  })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Conversation created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string', enum: Object.values(ConversationType) },
        name: { type: 'string' },
        description: { type: 'string' },
        participantCount: { type: 'number' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid conversation data' })
  async createConversation(
    @Request() req: any,
    @Body(ValidationPipe) createConversationDto: CreateConversationDto,
  ) {
    const conversation = await this.conversationService.createConversation(
      req.user.userId,
      createConversationDto.type,
      createConversationDto.participantIds,
      createConversationDto.name,
      createConversationDto.description,
    );

    return {
      status: 'success',
      data: conversation,
      message: 'Conversation created successfully',
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get user conversations',
    description: 'Retrieve all conversations the user is a participant in'
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by conversation type', enum: ConversationType })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of conversations to retrieve', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset', type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Conversations retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        conversations: { type: 'array', description: 'Array of conversation objects' },
        totalCount: { type: 'number' },
        hasMore: { type: 'boolean' },
      }
    }
  })
  async getUserConversations(
    @Request() req: any,
    @Query('type') type?: ConversationType,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const conversations = await this.conversationService.getUserConversations(req.user.userId);

    // Apply filters if needed
    let filteredConversations = conversations;
    if (type) {
      filteredConversations = conversations.filter(c => c.type === type);
    }

    // Apply pagination
    const paginatedConversations = filteredConversations.slice(offset, offset + limit);
    const hasMore = offset + limit < filteredConversations.length;

    return {
      status: 'success',
      data: {
        conversations: paginatedConversations,
        totalCount: filteredConversations.length,
        hasMore,
      },
      message: 'Conversations retrieved successfully',
    };
  }

  @Get(':conversationId')
  @ApiOperation({ 
    summary: 'Get conversation details',
    description: 'Retrieve detailed information about a specific conversation'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Conversation details retrieved successfully'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied to conversation' })
  async getConversation(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    // Check access
    const hasAccess = await this.conversationService.hasUserAccess(conversationId, req.user.userId);
    if (!hasAccess) {
      return {
        status: 'error',
        message: 'Access denied to conversation',
      };
    }

    const conversation = await this.conversationService.getConversationById(conversationId);

    return {
      status: 'success',
      data: conversation,
      message: 'Conversation retrieved successfully',
    };
  }

  @Put(':conversationId')
  @ApiOperation({ 
    summary: 'Update conversation',
    description: 'Update conversation settings (admin/owner only)'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiBody({ type: UpdateConversationDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Conversation updated successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Permission denied' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  async updateConversation(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) updateConversationDto: UpdateConversationDto,
  ) {
    const updatedConversation = await this.conversationService.updateConversation(
      conversationId,
      req.user.userId,
      updateConversationDto,
    );

    return {
      status: 'success',
      data: updatedConversation,
      message: 'Conversation updated successfully',
    };
  }

  @Get(':conversationId/participants')
  @ApiOperation({ 
    summary: 'Get conversation participants',
    description: 'Retrieve all participants in a conversation'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Participants retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        participants: { type: 'array', description: 'Array of participant objects' },
        activeCount: { type: 'number', description: 'Number of active participants' },
        onlineCount: { type: 'number', description: 'Number of online participants' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied to conversation' })
  async getConversationParticipants(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    // Check access
    const hasAccess = await this.conversationService.hasUserAccess(conversationId, req.user.userId);
    if (!hasAccess) {
      return {
        status: 'error',
        message: 'Access denied to conversation',
      };
    }

    const participants = await this.conversationService.getConversationParticipants(conversationId);
    const activeCount = participants.filter(p => p.isActive()).length;

    return {
      status: 'success',
      data: {
        participants,
        activeCount,
        onlineCount: 0, // Would be calculated with online status
      },
      message: 'Participants retrieved successfully',
    };
  }

  @Post(':conversationId/participants')
  @ApiOperation({ 
    summary: 'Add participant to conversation',
    description: 'Add a new participant to the conversation'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiBody({ type: AddParticipantDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Participant added successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Permission denied or user already in conversation' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation or user not found' })
  async addParticipant(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) addParticipantDto: AddParticipantDto,
  ) {
    const participant = await this.conversationService.addParticipant(
      conversationId,
      addParticipantDto.userId,
      req.user.userId,
    );

    return {
      status: 'success',
      data: participant,
      message: 'Participant added successfully',
    };
  }

  @Delete(':conversationId/participants/:userId')
  @ApiOperation({ 
    summary: 'Remove participant from conversation',
    description: 'Remove a participant from the conversation'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Participant removed successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Permission denied' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Participant not found' })
  async removeParticipant(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.conversationService.removeParticipant(
      conversationId,
      userId,
      req.user.userId,
    );

    return {
      status: 'success',
      message: 'Participant removed successfully',
    };
  }

  @Post(':conversationId/leave')
  @ApiOperation({ 
    summary: 'Leave conversation',
    description: 'Leave the conversation as a participant'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Left conversation successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  async leaveConversation(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    await this.conversationService.removeParticipant(
      conversationId,
      req.user.userId,
      req.user.userId, // User removing themselves
    );

    return {
      status: 'success',
      message: 'Left conversation successfully',
    };
  }

  @Get(':conversationId/search')
  @ApiOperation({ 
    summary: 'Search within conversation',
    description: 'Search for messages within a specific conversation'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'query', description: 'Search query', type: String })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset', type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully'
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied to conversation' })
  async searchConversation(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('query') query: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ) {
    // Check access
    const hasAccess = await this.conversationService.hasUserAccess(conversationId, req.user.userId);
    if (!hasAccess) {
      return {
        status: 'error',
        message: 'Access denied to conversation',
      };
    }

    try {
      // Use MessageService to search within the conversation
      const searchResult = await this.messageService.searchMessages(
        req.user.userId,
        query,
        conversationId,
        limit,
        offset
      );

      return {
        status: 'success',
        data: {
          messages: searchResult.messages,
          totalCount: searchResult.totalCount,
          hasMore: searchResult.hasMore,
          query,
          conversationId,
        },
        message: 'Search completed successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Search failed. Please try again.',
      };
    }
  }

  @Get(':conversationId/analytics')
  @ApiOperation({ 
    summary: 'Get conversation analytics',
    description: 'Get analytics and statistics for the conversation (admin only)'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Time frame for analytics (7d, 30d, 90d)', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messageStats: {
          type: 'object',
          properties: {
            totalMessages: { type: 'number' },
            messagesPerDay: { type: 'array' },
            topSenders: { type: 'array' },
          }
        },
        participantStats: {
          type: 'object',
          properties: {
            totalParticipants: { type: 'number' },
            activeParticipants: { type: 'number' },
            newParticipants: { type: 'number' },
          }
        },
        engagementStats: {
          type: 'object',
          properties: {
            averageResponseTime: { type: 'number' },
            peakActivityHours: { type: 'array' },
            reactionCounts: { type: 'object' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin access required' })
  async getConversationAnalytics(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('timeframe') timeframe: string = '30d',
  ) {
    // Check access to conversation
    const hasAccess = await this.conversationService.hasUserAccess(conversationId, req.user.userId);
    if (!hasAccess) {
      return {
        status: 'error',
        message: 'Access denied to conversation',
      };
    }

    try {
      // Calculate timeframe in days
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get conversation details and participants
      const conversation = await this.conversationService.getConversationById(conversationId);
      const participants = await this.conversationService.getConversationParticipants(conversationId);

      // Get messages in timeframe for analytics
      const messages = await this.messageService.getMessages(
        conversationId,
        req.user.userId,
        1000 // Get enough messages for analytics
      );

      // Filter messages by timeframe
      const recentMessages = messages.messages.filter(msg => 
        new Date(msg.createdAt) >= startDate
      );

      // Calculate message statistics
      const messageStats = {
        totalMessages: recentMessages.length,
        messagesPerDay: this.calculateMessagesPerDay(recentMessages, days),
        topSenders: this.calculateTopSenders(recentMessages, participants),
      };

      // Calculate participant statistics
      const activeParticipants = participants.filter(p => 
        recentMessages.some(msg => msg.senderId === p.userId)
      );

      const participantStats = {
        totalParticipants: participants.length,
        activeParticipants: activeParticipants.length,
        newParticipants: participants.filter(p => 
          new Date(p.joinedAt) >= startDate
        ).length,
      };

      // Calculate basic engagement statistics
      const engagementStats = {
        averageResponseTime: this.calculateAverageResponseTime(recentMessages),
        peakActivityHours: this.calculatePeakActivityHours(recentMessages),
        reactionCounts: this.calculateReactionCounts(recentMessages),
      };

      return {
        status: 'success',
        data: {
          messageStats,
          participantStats,
          engagementStats,
          timeframe,
          conversationId,
        },
        message: 'Analytics retrieved successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to retrieve analytics',
      };
    }
  }

  // Helper methods for analytics calculations
  private calculateMessagesPerDay(messages: any[], days: number): any[] {
    const dailyCounts = new Array(days).fill(0);
    const today = new Date();
    
    messages.forEach(msg => {
      const msgDate = new Date(msg.createdAt);
      const daysAgo = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo >= 0 && daysAgo < days) {
        dailyCounts[days - 1 - daysAgo]++;
      }
    });

    return dailyCounts.map((count, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - 1 - index));
      return {
        date: date.toISOString().split('T')[0],
        count,
      };
    });
  }

  private calculateTopSenders(messages: any[], participants: any[]): any[] {
    const senderCounts = new Map<string, number>();
    
    messages.forEach(msg => {
      const count = senderCounts.get(msg.senderId) || 0;
      senderCounts.set(msg.senderId, count + 1);
    });

    return Array.from(senderCounts.entries())
      .map(([userId, messageCount]) => {
        const participant = participants.find(p => p.userId === userId);
        return {
          userId,
          username: participant?.user?.username || 'Unknown',
          messageCount,
        };
      })
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 5);
  }

  private calculateAverageResponseTime(messages: any[]): number {
    if (messages.length < 2) return 0;

    const responseTimes: number[] = [];
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (let i = 1; i < sortedMessages.length; i++) {
      const prevMsg = sortedMessages[i - 1];
      const currentMsg = sortedMessages[i];
      
      // Only count as response if different senders
      if (prevMsg.senderId !== currentMsg.senderId) {
        const responseTime = new Date(currentMsg.createdAt).getTime() - 
                           new Date(prevMsg.createdAt).getTime();
        responseTimes.push(responseTime);
      }
    }

    if (responseTimes.length === 0) return 0;
    
    const avgMilliseconds = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(avgMilliseconds / (1000 * 60)); // Return in minutes
  }

  private calculatePeakActivityHours(messages: any[]): number[] {
    const hourCounts = new Array(24).fill(0);
    
    messages.forEach(msg => {
      const hour = new Date(msg.createdAt).getHours();
      hourCounts[hour]++;
    });

    // Return top 3 peak hours
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }

  private calculateReactionCounts(messages: any[]): Record<string, number> {
    const reactionCounts: Record<string, number> = {};
    
    messages.forEach(msg => {
      if (msg.reactions && Array.isArray(msg.reactions)) {
        msg.reactions.forEach((reaction: any) => {
          const emoji = reaction.emoji || reaction.type;
          reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
        });
      }
    });

    return reactionCounts;
  }
}
