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
  BadRequestException,
  Logger
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
import { MessageService } from './message.service';
import { MessageType, MessageStatus } from '../shared/entities/message.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  IsUUID, 
  IsObject,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// DTOs
class AttachmentDto {
  @IsString()
  url: string;

  @IsString()
  type: string;

  @IsString()
  name: string;

  @IsNumber()
  size: number;
}

class SendMessageDto {
  @IsUUID(4, { message: 'Invalid conversation ID' })
  conversationId: string;

  @IsEnum(MessageType, { message: 'Invalid message type' })
  type: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'Message content too long' })
  content?: string;

  @IsOptional()
  @IsUUID(4, { message: 'Invalid reply message ID' })
  replyToId?: string;

  @IsOptional()
  @IsUUID(4, { message: 'Invalid thread ID' })
  threadId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true, message: 'Invalid mention user ID' })
  mentions?: string[];

  @IsOptional()
  @IsString()
  optimisticId?: string;
}

class EditMessageDto {
  @IsString()
  @MaxLength(10000, { message: 'Message content too long' })
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

class MessageReactionDto {
  @IsString()
  @MaxLength(50, { message: 'Reaction emoji too long' })
  emoji: string;
}

class GetMessagesQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsUUID(4, { message: 'Invalid before message ID' })
  before?: string;

  @IsOptional()
  @IsUUID(4, { message: 'Invalid after message ID' })
  after?: string;

  @IsOptional()
  @IsEnum(MessageType, { message: 'Invalid message type filter' })
  type?: MessageType;

  @IsOptional()
  @IsUUID(4, { message: 'Invalid thread ID' })
  threadId?: string;
}

class SearchMessagesQueryDto {
  @IsString()
  @MaxLength(200, { message: 'Search query too long' })
  query: string;

  @IsOptional()
  @IsUUID(4, { message: 'Invalid conversation ID' })
  conversationId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

class MarkAsReadDto {
  @IsUUID(4, { message: 'Invalid message ID' })
  messageId: string;
}

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  private readonly logger = new Logger(MessageController.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Send message with optimistic updates',
    description: 'Send a message with immediate response for zero-delay UX. The message is returned immediately while database operations happen in the background.'
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Message sent successfully with optimistic response',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'object', description: 'The message object with optimistic ID' },
        optimisticId: { type: 'string', description: 'Temporary ID for optimistic updates' },
        participants: { type: 'array', description: 'Conversation participants' },
        unreadCounts: { type: 'object', description: 'Unread counts for each participant' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid message data' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Permission denied' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  async sendMessage(
    @Request() req: any,
    @Body(ValidationPipe) sendMessageDto: SendMessageDto,
  ) {
    try {
      const result = await this.messageService.sendMessage(
        req.user.userId,
        sendMessageDto,
        sendMessageDto.optimisticId
      );

      return {
        status: 'success',
        data: result,
        message: 'Message sent successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ 
    summary: 'Get conversation messages',
    description: 'Retrieve messages from a conversation with enterprise caching and pagination'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of messages to retrieve (1-100)', type: Number })
  @ApiQuery({ name: 'before', required: false, description: 'Get messages before this message ID', type: String })
  @ApiQuery({ name: 'after', required: false, description: 'Get messages after this message ID', type: String })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by message type', enum: MessageType })
  @ApiQuery({ name: 'threadId', required: false, description: 'Get messages from specific thread', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messages: { type: 'array', description: 'Array of message objects' },
        hasMore: { type: 'boolean', description: 'Whether there are more messages' },
        totalCount: { type: 'number', description: 'Total message count' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied to conversation' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  async getMessages(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query(ValidationPipe) query: GetMessagesQueryDto,
  ) {
    this.logger.log(`📥 [REST API] User ${req.user.userId} requesting ${query.limit || 50} messages for conversation ${conversationId} (before: ${query.before}, after: ${query.after})`);

    const startTime = Date.now();
    const result = await this.messageService.getMessages(
      conversationId,
      req.user.userId,
      query.limit,
      query.before,
      query.after
    );
    const fetchTime = Date.now() - startTime;

    this.logger.log(`✅ [REST API] Successfully returned ${result.messages.length} messages to user ${req.user.userId} for conversation ${conversationId} in ${fetchTime}ms`);

    return {
      status: 'success',
      data: result,
      message: 'Messages retrieved successfully',
    };
  }

  @Put(':messageId')
  @ApiOperation({ 
    summary: 'Edit message',
    description: 'Edit an existing message with version tracking'
  })
  @ApiParam({ name: 'messageId', description: 'Message ID to edit' })
  @ApiBody({ type: EditMessageDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message edited successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot edit this message' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async editMessage(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body(ValidationPipe) editMessageDto: EditMessageDto,
  ) {
    try {
      const updatedMessage = await this.messageService.editMessage(
        messageId,
        req.user.userId,
        editMessageDto.content
      );

      return {
        status: 'success',
        data: updatedMessage,
        message: 'Message edited successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Failed to edit message',
      };
    }
  }

  @Delete(':messageId')
  @ApiOperation({ 
    summary: 'Delete message',
    description: 'Delete a message (soft delete for audit trail)'
  })
  @ApiParam({ name: 'messageId', description: 'Message ID to delete' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message deleted successfully' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Cannot delete this message' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async deleteMessage(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    try {
      await this.messageService.deleteMessage(messageId, req.user.userId);

      return {
        status: 'success',
        message: 'Message deleted successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Failed to delete message',
      };
    }
  }

  @Post(':messageId/reactions')
  @ApiOperation({ 
    summary: 'Add reaction to message',
    description: 'Add an emoji reaction to a message'
  })
  @ApiParam({ name: 'messageId', description: 'Message ID to react to' })
  @ApiBody({ type: MessageReactionDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Reaction added successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async addReaction(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body(ValidationPipe) reactionDto: MessageReactionDto,
  ) {
    try {
      await this.messageService.addReaction(
        messageId,
        req.user.userId,
        reactionDto.emoji,
        { addedAt: new Date().toISOString() }
      );

      return {
        status: 'success',
        message: 'Reaction added successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Failed to add reaction',
      };
    }
  }

  @Delete(':messageId/reactions/:emoji')
  @ApiOperation({ 
    summary: 'Remove reaction from message',
    description: 'Remove an emoji reaction from a message'
  })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'emoji', description: 'Emoji to remove' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reaction removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Reaction not found' })
  async removeReaction(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('emoji') emoji: string,
  ) {
    try {
      await this.messageService.removeReaction(
        messageId,
        req.user.userId,
        emoji
      );

      return {
        status: 'success',
        message: 'Reaction removed successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Failed to remove reaction',
      };
    }
  }

  @Post('conversation/:conversationId/mark-read')
  @ApiOperation({ 
    summary: 'Mark messages as read',
    description: 'Mark messages in a conversation as read up to a specific message'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiBody({ type: MarkAsReadDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Messages marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        unreadCount: { type: 'number', description: 'Updated unread count' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation or message not found' })
  async markAsRead(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) markAsReadDto: MarkAsReadDto,
  ) {
    const result = await this.messageService.markAsRead(
      conversationId,
      req.user.userId,
      markAsReadDto.messageId
    );

    return {
      status: 'success',
      data: result,
      message: 'Messages marked as read',
    };
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search messages',
    description: 'Search messages across conversations with enterprise performance'
  })
  @ApiQuery({ name: 'query', description: 'Search query string', type: String })
  @ApiQuery({ name: 'conversationId', required: false, description: 'Limit search to specific conversation', type: String })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results (1-50)', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset', type: Number })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messages: { type: 'array', description: 'Array of matching messages' },
        totalCount: { type: 'number', description: 'Total matching messages' },
        hasMore: { type: 'boolean', description: 'Whether there are more results' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid search parameters' })
  async searchMessages(
    @Request() req: any,
    @Query(ValidationPipe) searchQuery: SearchMessagesQueryDto,
  ) {
    if (!searchQuery.query || searchQuery.query.trim().length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const result = await this.messageService.searchMessages(
      req.user.userId,
      searchQuery.query.trim(),
      searchQuery.conversationId,
      searchQuery.limit,
      searchQuery.offset
    );

    return {
      status: 'success',
      data: result,
      message: 'Search completed successfully',
    };
  }

  @Post(':messageId/forward')
  @ApiOperation({ 
    summary: 'Forward message',
    description: 'Forward a message to other conversations'
  })
  @ApiParam({ name: 'messageId', description: 'Message ID to forward' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conversationIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of conversation IDs to forward to'
        },
        comment: {
          type: 'string',
          description: 'Optional comment to add to forward'
        }
      },
      required: ['conversationIds']
    }
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Message forwarded successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async forwardMessage(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() forwardDto: { conversationIds: string[]; comment?: string },
  ) {
    try {
      const forwardedMessages = await this.messageService.forwardMessage(
        messageId,
        req.user.userId,
        forwardDto.conversationIds,
        forwardDto.comment
      );

      return {
        status: 'success',
        data: {
          forwardedTo: forwardedMessages.length,
          messages: forwardedMessages,
        },
        message: `Message forwarded to ${forwardedMessages.length} conversation(s)`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Failed to forward message',
      };
    }
  }

  @Post('conversation/:conversationId/typing')
  @ApiOperation({ 
    summary: 'Send typing indicator',
    description: 'Notify other participants that user is typing'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Typing indicator sent' })
  async sendTypingIndicator(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    // Emit typing event immediately
    this.eventEmitter.emit('typing.started', {
      conversationId,
      userId: req.user.userId,
      timestamp: new Date(),
    });

    return {
      status: 'success',
      message: 'Typing indicator sent',
    };
  }

  @Delete('conversation/:conversationId/typing')
  @ApiOperation({ 
    summary: 'Stop typing indicator',
    description: 'Notify other participants that user stopped typing'
  })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Typing indicator stopped' })
  async stopTypingIndicator(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    // Emit typing stopped event immediately
    this.eventEmitter.emit('typing.stopped', {
      conversationId,
      userId: req.user.userId,
      timestamp: new Date(),
    });

    return {
      status: 'success',
      message: 'Typing indicator stopped',
    };
  }

  @Get(':messageId/delivery-status')
  @ApiOperation({ 
    summary: 'Get message delivery status',
    description: 'Get detailed delivery and read status for a message'
  })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Delivery status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string' },
        status: { type: 'string', enum: Object.values(MessageStatus) },
        deliveredTo: { type: 'array', description: 'Users who received the message' },
        readBy: { type: 'array', description: 'Users who read the message' },
        deliveredAt: { type: 'string', format: 'date-time' },
        readAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async getDeliveryStatus(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    try {
      const deliveryStatus = await this.messageService.getMessageDeliveryStatus(
        messageId,
        req.user.userId
      );

      return {
        status: 'success',
        data: deliveryStatus,
        message: 'Delivery status retrieved successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message || 'Failed to get delivery status',
      };
    }
  }
}
