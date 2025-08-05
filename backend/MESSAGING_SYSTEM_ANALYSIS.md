# NestJS Messaging System - Production-Level Analysis & Recommendations

## Executive Summary

After a thorough analysis of your NestJS messaging system, I've identified several areas for optimization and enhancement. The system shows good architectural foundations with TypeORM, WebSockets, and caching, but requires improvements in performance, scalability, and maintainability for production-level deployment.

## 1. API and Endpoint Optimization

### Current Endpoint Analysis

The messaging system exposes the following endpoints:

#### Message Endpoints:
- `POST /messages` - Send message
- `GET /messages/conversation/:conversationId` - Get conversation messages
- `PUT /messages/:messageId` - Edit message
- `DELETE /messages/:messageId` - Delete message
- `POST /messages/:messageId/reactions` - Add reaction
- `DELETE /messages/:messageId/reactions/:emoji` - Remove reaction
- `GET /messages/search` - Search messages

#### Conversation Endpoints:
- `POST /conversations` - Create conversation
- `GET /conversations` - Get user conversations
- `GET /conversations/:conversationId` - Get specific conversation
- `PUT /conversations/:conversationId` - Update conversation
- `DELETE /conversations/:conversationId` - Delete conversation
- `POST /conversations/:conversationId/participants` - Add participant
- `DELETE /conversations/:conversationId/participants/:userId` - Remove participant

### Issues Identified:

1. **Redundant Endpoints**: Some endpoints can be consolidated
2. **Large Response Payloads**: Missing proper DTO projections
3. **Inconsistent Response Structure**: Some endpoints return different response formats
4. **Missing Bulk Operations**: No bulk message operations for efficiency

### Recommendations:

#### 1.1 Optimize DTOs and Response Structure

```typescript
// Create standardized response DTOs
export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: MessageType })
  type: MessageType;

  @ApiProperty({ enum: MessageStatus })
  status: MessageStatus;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  editedAt?: Date;

  @ApiProperty({ type: UserBasicDto })
  sender: UserBasicDto;

  @ApiProperty({ type: [AttachmentDto], required: false })
  attachments?: AttachmentDto[];

  @ApiProperty({ required: false })
  replyTo?: MessageResponseDto;

  @ApiProperty({ type: [ReactionDto], required: false })
  reactions?: ReactionDto[];
}

export class UserBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class PaginatedMessagesResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  nextCursor?: string;

  @ApiProperty()
  totalCount: number;
}
```

#### 1.2 Implement Cursor-Based Pagination

```typescript
export class CursorPaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
```

#### 1.3 Remove Redundant Endpoints

**Recommended for removal/consolidation:**
- Merge similar search endpoints into one with proper query parameters
- Consolidate participant management into bulk operations
- Remove duplicate conversation detail endpoints

#### 1.4 Add Bulk Operations

```typescript
// Add bulk message operations
@Post('bulk')
@ApiOperation({ summary: 'Send multiple messages' })
async sendBulkMessages(
  @Request() req: any,
  @Body() bulkMessageDto: BulkSendMessageDto,
) {
  // Implementation for bulk operations
}

export class BulkSendMessageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SendMessageDto)
  messages: SendMessageDto[];
}
```

## 2. Database Performance and Query Optimization

### Current Database Issues:

1. **N+1 Query Problems**: Relations not properly eager-loaded
2. **Missing Critical Indexes**: Performance bottlenecks on common queries
3. **Inefficient Pagination**: Using OFFSET instead of cursor-based pagination
4. **No Query Optimization**: Raw queries could be optimized

### 2.1 Add Critical Database Indexes

```sql
-- Critical indexes for message queries
CREATE INDEX CONCURRENTLY idx_messages_conversation_created_at 
ON messages (conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_sender_created_at 
ON messages (sender_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_thread_created_at 
ON messages (thread_id, created_at DESC) WHERE thread_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_messages_status_type 
ON messages (status, type);

CREATE INDEX CONCURRENTLY idx_messages_full_text_search 
ON messages USING gin(to_tsvector('english', content));

-- Conversation participant indexes
CREATE INDEX CONCURRENTLY idx_participants_conversation_status 
ON conversation_participants (conversation_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_participants_user_last_read 
ON conversation_participants (user_id, last_read_at DESC);

-- Message reactions indexes
CREATE INDEX CONCURRENTLY idx_reactions_message_emoji 
ON message_reactions (message_id, emoji);
```

### 2.2 Optimize Service Queries

```typescript
// Optimized message retrieval with proper relations
async getMessages(
  conversationId: string,
  userId: string,
  limit: number = 50,
  cursor?: string,
): Promise<PaginatedMessagesResponseDto> {
  const queryBuilder = this.messageRepository
    .createQueryBuilder('message')
    .leftJoinAndSelect('message.sender', 'sender')
    .leftJoinAndSelect('message.replyTo', 'replyTo')
    .leftJoinAndSelect('replyTo.sender', 'replyToSender')
    .leftJoinAndSelect('message.reactions', 'reactions')
    .leftJoinAndSelect('reactions.user', 'reactionUser')
    .where('message.conversationId = :conversationId', { conversationId })
    .andWhere('message.status != :deletedStatus', { deletedStatus: MessageStatus.DELETED })
    .orderBy('message.createdAt', 'DESC');

  if (cursor) {
    queryBuilder.andWhere('message.createdAt < :cursor', { 
      cursor: new Date(cursor) 
    });
  }

  const messages = await queryBuilder
    .limit(limit + 1) // Get one extra to check if there are more
    .getMany();

  const hasMore = messages.length > limit;
  if (hasMore) {
    messages.pop(); // Remove the extra message
  }

  const nextCursor = hasMore && messages.length > 0 
    ? messages[messages.length - 1].createdAt.toISOString() 
    : null;

  return {
    messages: messages.map(message => this.mapToResponseDto(message)),
    hasMore,
    nextCursor,
    totalCount: await this.getConversationMessageCount(conversationId),
  };
}
```

### 2.3 Implement Database Connection Pooling

```typescript
// In app.module.ts - Optimize TypeORM configuration
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false, // Never use in production
    logging: configService.get('NODE_ENV') === 'development',
    
    // Connection pooling optimization
    extra: {
      connectionLimit: 50,
      acquireConnectionTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      
      // Connection pool settings
      max: 50, // Maximum connections
      min: 5,  // Minimum connections
      acquire: 30000, // Maximum time to get connection
      idle: 10000, // Maximum idle time before releasing
      
      // Performance optimizations
      statement_timeout: 30000,
      query_timeout: 30000,
      ssl: configService.get('NODE_ENV') === 'production' ? {
        rejectUnauthorized: false
      } : false,
    },
  }),
  inject: [ConfigService],
}),
```

## 3. Code Architecture and Scalability

### Current Architecture Issues:

1. **Tight Coupling**: Services are tightly coupled with multiple responsibilities
2. **No Background Job Processing**: All operations are synchronous
3. **Missing CQRS Pattern**: No separation between read/write operations
4. **Monolithic Services**: Large services with multiple responsibilities

### 3.1 Implement CQRS Pattern

```typescript
// Command handlers for write operations
@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand> {
  constructor(
    private readonly messageRepository: Repository<Message>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SendMessageCommand): Promise<Message> {
    const message = await this.messageRepository.save({
      ...command.messageData,
      senderId: command.userId,
    });

    // Emit event for further processing
    await this.eventBus.publish(new MessageSentEvent(message));
    
    return message;
  }
}

// Query handlers for read operations
@QueryHandler(GetMessagesQuery)
export class GetMessagesHandler implements IQueryHandler<GetMessagesQuery> {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly messageRepository: Repository<Message>,
  ) {}

  async execute(query: GetMessagesQuery): Promise<PaginatedMessagesResponseDto> {
    const cacheKey = `messages:${query.conversationId}:${query.cursor}:${query.limit}`;
    
    let result = await this.cacheManager.get<PaginatedMessagesResponseDto>(cacheKey);
    
    if (!result) {
      result = await this.getMessagesFromDatabase(query);
      await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes
    }
    
    return result;
  }
}
```

### 3.2 Implement Background Job Processing

```typescript
// Install: npm install @nestjs/bull bull @types/bull

// message-processing.processor.ts
@Processor('message-processing')
export class MessageProcessingProcessor {
  private readonly logger = new Logger(MessageProcessingProcessor.name);

  @Process('send-push-notifications')
  async handlePushNotifications(job: Job<{ messageId: string; participantIds: string[] }>) {
    const { messageId, participantIds } = job.data;
    
    try {
      // Process push notifications in background
      await this.notificationService.sendPushNotifications(messageId, participantIds);
      this.logger.log(`Push notifications sent for message ${messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send push notifications: ${error.message}`);
      throw error; // This will trigger retry mechanism
    }
  }

  @Process('process-attachments')
  async handleAttachmentProcessing(job: Job<{ messageId: string; attachments: any[] }>) {
    const { messageId, attachments } = job.data;
    
    // Process file uploads, virus scanning, thumbnail generation
    for (const attachment of attachments) {
      await this.fileService.processAttachment(attachment);
    }
  }

  @Process('update-conversation-activity')
  async handleConversationActivity(job: Job<{ conversationId: string; userId: string }>) {
    // Update conversation last activity, participant status, etc.
    await this.conversationService.updateActivity(job.data.conversationId, job.data.userId);
  }
}

// In message.service.ts
async sendMessage(userId: string, createMessageDto: CreateMessageDto): Promise<SendMessageResponse> {
  // Immediate response
  const optimisticMessage = this.createOptimisticMessage(/* ... */);
  
  // Queue background jobs
  await Promise.all([
    this.messageQueue.add('send-push-notifications', {
      messageId: optimisticMessage.id,
      participantIds: participants.map(p => p.userId),
    }),
    
    this.messageQueue.add('process-attachments', {
      messageId: optimisticMessage.id,
      attachments: createMessageDto.attachments || [],
    }),
    
    this.messageQueue.add('update-conversation-activity', {
      conversationId: createMessageDto.conversationId,
      userId,
    }),
  ]);

  return optimisticMessage;
}
```

### 3.3 Implement Repository Pattern

```typescript
// Create dedicated repositories
@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(Message)
    private repository: Repository<Message>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findByConversationId(
    conversationId: string,
    options: FindMessagesOptions,
  ): Promise<PaginatedResult<Message>> {
    // Dedicated query logic with caching
  }

  async findByUserId(userId: string, options: FindMessagesOptions): Promise<Message[]> {
    // User-specific message queries
  }

  async countUnreadMessages(conversationId: string, userId: string): Promise<number> {
    const cacheKey = `unread:${conversationId}:${userId}`;
    
    let count = await this.cacheManager.get<number>(cacheKey);
    if (count === undefined) {
      count = await this.repository.count({
        where: {
          conversationId,
          createdAt: MoreThan(/* last read timestamp */),
        },
      });
      await this.cacheManager.set(cacheKey, count, 60000); // 1 minute
    }
    
    return count;
  }
}
```

## 4. Security, Validation, and Maintainability

### 4.1 Enhanced Security Measures

```typescript
// Rate limiting for messaging endpoints
@Controller('messages')
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute
export class MessageController {
  
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 messages per minute
  async sendMessage(/* ... */) {
    // Implementation
  }
}

// Input sanitization
export class SendMessageDto {
  @IsString()
  @MaxLength(10000)
  @Transform(({ value }) => sanitizeHtml(value, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      'a': ['href']
    }
  }))
  content: string;
}

// SQL injection prevention with parameterized queries
async searchMessages(query: string, conversationId: string): Promise<Message[]> {
  return this.messageRepository
    .createQueryBuilder('message')
    .where('message.conversationId = :conversationId', { conversationId })
    .andWhere('to_tsvector(\'english\', message.content) @@ plainto_tsquery(:query)', { query })
    .getMany();
}
```

### 4.2 Comprehensive Error Handling

```typescript
// Custom exception filters
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        code = (exceptionResponse as any).code || code;
      } else {
        message = exceptionResponse;
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      code,
      ...(process.env.NODE_ENV === 'development' && { stack: exception instanceof Error ? exception.stack : undefined }),
    };

    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(errorResponse),
      exception instanceof Error ? exception.stack : 'Unknown Error',
    );

    response.status(status).json(errorResponse);
  }
}

// Custom exceptions
export class MessageNotFoundException extends NotFoundException {
  constructor(messageId: string) {
    super(`Message with ID ${messageId} not found`, 'MESSAGE_NOT_FOUND');
  }
}

export class ConversationAccessDeniedException extends ForbiddenException {
  constructor(conversationId: string) {
    super(`Access denied to conversation ${conversationId}`, 'CONVERSATION_ACCESS_DENIED');
  }
}
```

### 4.3 Enhanced Validation

```typescript
// Custom validators
export function IsValidMessageContent(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidMessageContent',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          
          // Check for empty content
          if (!value.trim()) return false;
          
          // Check for malicious content
          const suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
          ];
          
          return !suspiciousPatterns.some(pattern => pattern.test(value));
        },
        defaultMessage: () => 'Message content contains invalid or potentially harmful content',
      },
    });
  };
}

// Usage in DTOs
export class SendMessageDto {
  @IsValidMessageContent()
  @MaxLength(10000)
  content: string;
}
```

## 5. Testing Strategy

### 5.1 Unit Tests

```typescript
// message.service.spec.ts
describe('MessageService', () => {
  let service: MessageService;
  let messageRepository: Repository<Message>;
  let cacheManager: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getRepositoryToken(Message),
          useValue: createRepositoryMock(),
        },
        {
          provide: CACHE_MANAGER,
          useValue: createCacheMock(),
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messageRepository = module.get<Repository<Message>>(getRepositoryToken(Message));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      // Arrange
      const userId = 'user-1';
      const messageDto = {
        conversationId: 'conv-1',
        content: 'Test message',
        type: MessageType.TEXT,
      };

      const mockMessage = {
        id: 'msg-1',
        ...messageDto,
        senderId: userId,
        createdAt: new Date(),
      };

      jest.spyOn(messageRepository, 'save').mockResolvedValue(mockMessage as Message);
      jest.spyOn(service as any, 'getUserFromCache').mockResolvedValue({ id: userId });
      jest.spyOn(service as any, 'getConversationFromCache').mockResolvedValue({ id: messageDto.conversationId });

      // Act
      const result = await service.sendMessage(userId, messageDto);

      // Assert
      expect(result.message.content).toBe(messageDto.content);
      expect(messageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          content: messageDto.content,
          senderId: userId,
        }),
      );
    });

    it('should throw error for invalid conversation', async () => {
      // Test error scenarios
    });
  });
});
```

### 5.2 Integration Tests

```typescript
// message.controller.e2e-spec.ts
describe('MessageController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const authResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);

    authToken = authResponse.body.data.accessToken;
  });

  describe('/messages (POST)', () => {
    it('should send message successfully', () => {
      return request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversationId: 'test-conversation-id',
          content: 'Test message',
          type: 'text',
        })
        .expect(201)
        .expect(res => {
          expect(res.body.data.message.content).toBe('Test message');
        });
    });
  });
});
```

## 6. Caching Strategy Implementation

### 6.1 Multi-Level Caching

```typescript
@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly redisClient: Redis,
  ) {}

  // L1 Cache: In-memory for frequently accessed data
  private memoryCache = new Map<string, { data: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    // Check L1 cache first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult && memoryResult.expiry > Date.now()) {
      return memoryResult.data;
    }

    // Check L2 cache (Redis)
    const redisResult = await this.cacheManager.get<T>(key);
    if (redisResult) {
      // Populate L1 cache
      this.memoryCache.set(key, {
        data: redisResult,
        expiry: Date.now() + 60000, // 1 minute
      });
      return redisResult;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Set in both caches
    await this.cacheManager.set(key, value, ttl);
    this.memoryCache.set(key, {
      data: value,
      expiry: Date.now() + Math.min(ttl, 60000),
    });
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear pattern from both caches
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }

    // Clear from memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern.replace('*', ''))) {
        this.memoryCache.delete(key);
      }
    }
  }
}
```

## 7. API Documentation

### Complete Endpoint Documentation

#### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

#### Message Endpoints

##### 1. Send Message
```
POST /messages
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "conversationId": "uuid",
  "content": "string (max 10000 chars)",
  "type": "text|image|video|audio|file|system",
  "replyToId": "uuid (optional)",
  "threadId": "uuid (optional)",
  "attachments": [
    {
      "url": "string",
      "type": "string",
      "name": "string",
      "size": number
    }
  ],
  "mentions": ["uuid"],
  "optimisticId": "string (optional)"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "message": {
      "id": "uuid",
      "conversationId": "uuid",
      "senderId": "uuid",
      "content": "string",
      "type": "text",
      "status": "sent",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "sender": {
        "id": "uuid",
        "username": "string",
        "displayName": "string",
        "avatarUrl": "string"
      }
    },
    "optimisticId": "string",
    "participants": [],
    "unreadCounts": {}
  },
  "message": "Message sent successfully"
}
```

##### 2. Get Conversation Messages
```
GET /messages/conversation/:conversationId?limit=50&cursor=string&order=desc
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `limit` (optional): Number of messages (1-100, default: 50)
- `cursor` (optional): Cursor for pagination
- `order` (optional): asc|desc (default: desc)
- `type` (optional): Filter by message type
- `threadId` (optional): Get messages from specific thread

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "messages": [
      {
        "id": "uuid",
        "content": "string",
        "type": "text",
        "status": "read",
        "senderId": "uuid",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "sender": {
          "id": "uuid",
          "username": "string",
          "displayName": "string",
          "avatarUrl": "string"
        },
        "reactions": [
          {
            "emoji": "👍",
            "count": 3,
            "users": ["uuid1", "uuid2"]
          }
        ]
      }
    ],
    "hasMore": true,
    "nextCursor": "2024-01-01T00:00:00.000Z",
    "totalCount": 150
  }
}
```

##### 3. Edit Message
```
PUT /messages/:messageId
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "string (max 10000 chars)",
  "attachments": [
    {
      "url": "string",
      "type": "string", 
      "name": "string",
      "size": number
    }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "content": "updated content",
    "editedAt": "2024-01-01T00:00:00.000Z",
    "version": 2
  }
}
```

##### 4. Delete Message
```
DELETE /messages/:messageId
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Message deleted successfully"
}
```

##### 5. Add Reaction
```
POST /messages/:messageId/reactions
```

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "messageId": "uuid",
    "emoji": "👍",
    "userId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

##### 6. Search Messages
```
GET /messages/search?query=string&conversationId=uuid&limit=20&offset=0
```

**Query Parameters:**
- `query` (required): Search term (max 200 chars)
- `conversationId` (optional): Search within specific conversation
- `limit` (optional): Results limit (1-50, default: 20)
- `offset` (optional): Pagination offset (default: 0)

#### Conversation Endpoints

##### 1. Create Conversation
```
POST /conversations
```

**Request Body:**
```json
{
  "type": "direct|group|channel",
  "name": "string (optional, max 100 chars)",
  "description": "string (optional, max 500 chars)",
  "participantIds": ["uuid"]
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "type": "group",
    "name": "string",
    "description": "string",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "participants": [
      {
        "userId": "uuid",
        "role": "admin",
        "status": "active",
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

##### 2. Get User Conversations
```
GET /conversations?limit=50&offset=0&type=all
```

**Query Parameters:**
- `limit` (optional): Results limit (1-100, default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): Filter by conversation type

**Response (200):**
```json
{
  "status": "success", 
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "type": "direct",
        "name": "string",
        "lastMessage": {
          "id": "uuid",
          "content": "string",
          "senderId": "uuid",
          "createdAt": "2024-01-01T00:00:00.000Z"
        },
        "unreadCount": 5,
        "lastActivity": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalCount": 25,
    "hasMore": false
  }
}
```

#### WebSocket Events

##### Connection
```
Namespace: /messaging
Authentication: JWT token in handshake.auth.token
```

##### Client to Server Events:

1. **join_conversation**
```json
{
  "conversationId": "uuid"
}
```

2. **send_message**
```json
{
  "conversationId": "uuid",
  "content": "string",
  "type": "text",
  "optimisticId": "string",
  "replyTo": "uuid (optional)"
}
```

3. **typing_start**
```json
{
  "conversationId": "uuid",
  "isTyping": true
}
```

4. **typing_stop**
```json
{
  "conversationId": "uuid",
  "isTyping": false
}
```

##### Server to Client Events:

1. **new_message**
```json
{
  "message": { /* message object */ },
  "conversationId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

2. **user_typing**
```json
{
  "conversationId": "uuid",
  "userId": "uuid",
  "isTyping": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

3. **message_read_receipt**
```json
{
  "conversationId": "uuid",
  "userId": "uuid",
  "messageId": "uuid",
  "readAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses

All endpoints may return these error responses:

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "content",
      "message": "Content is required"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Access denied to conversation",
  "code": "CONVERSATION_ACCESS_DENIED"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Message not found",
  "code": "MESSAGE_NOT_FOUND"
}
```

**429 Too Many Requests:**
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**500 Internal Server Error:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

## Implementation Priority

1. **High Priority** (Week 1-2):
   - Add critical database indexes
   - Implement cursor-based pagination
   - Add comprehensive error handling
   - Optimize WebSocket gateway performance

2. **Medium Priority** (Week 3-4):
   - Implement CQRS pattern
   - Add background job processing
   - Enhance caching strategy
   - Create repository pattern

3. **Low Priority** (Week 5-6):
   - Add comprehensive test suite
   - Implement advanced security measures
   - Add monitoring and logging
   - Performance optimization

## Performance Metrics to Track

- Message send latency (target: <100ms)
- Database query performance (target: <50ms average)
- WebSocket connection handling (target: 10,000+ concurrent)
- Cache hit ratio (target: >90%)
- API response times (target: <200ms 95th percentile)

This analysis provides a roadmap for transforming your messaging system into a production-ready, scalable solution. Focus on the high-priority items first for immediate performance gains.
