# Complete Real-Time Chat System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Components](#architecture--components)
3. [Database Schema & Relations](#database-schema--relations)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [WebSocket Communication](#websocket-communication)
7. [Message Types & Formats](#message-types--formats)
8. [Performance Optimizations](#performance-optimizations)
9. [API Endpoints](#api-endpoints)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## System Overview

### What is this Chat System?

A professional real-time messaging system built with:
- **Backend**: NestJS with PostgreSQL, Redis caching, WebSocket gateway
- **Frontend**: React Native with Expo, Zustand state management
- **Real-time**: Socket.IO for instant messaging and live updates
- **Features**: Private conversations, group chats, space messaging, optimistic updates

### Key Features
- ✅ **Real-time messaging** with instant delivery
- ✅ **Optimistic updates** for smooth UX
- ✅ **Multiple conversation types**: Private, Group, Space
- ✅ **Message persistence** in PostgreSQL database
- ✅ **Caching layer** with Redis for performance
- ✅ **File attachments** and media support
- ✅ **Message reactions** and emoji support
- ✅ **Typing indicators** and online status
- ✅ **Message read receipts** and delivery tracking
- ✅ **Background message processing** for scalability

---

## Architecture & Components

### High-Level Architecture

```
┌─────────────────┐    WebSocket/HTTP    ┌─────────────────┐
│                 │◄────────────────────►│                 │
│   Mobile App    │                      │   Backend API   │
│  (React Native) │                      │    (NestJS)     │
│                 │                      │                 │
└─────────────────┘                      └─────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │   PostgreSQL    │
                                         │    Database     │
                                         └─────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │   Redis Cache   │
                                         │   (Optional)    │
                                         └─────────────────┘
```

### Component Breakdown

#### Backend Components
1. **MessagingGateway** - WebSocket connection handler
2. **MessageService** - Business logic for messages
3. **ConversationService** - Conversation management
4. **AuthGuard** - JWT authentication
5. **CacheManager** - Redis caching layer

#### Frontend Components
1. **SocketService** - WebSocket client management
2. **ChatStore** - Message state management
3. **AuthStore** - Authentication state
4. **ApiStore** - HTTP API client

---

## Database Schema & Relations

### Entity Relationship Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│    User     │     │   Conversation   │     │   Message   │
│             │     │                  │     │             │
│ id (UUID)   │◄────┤ id (UUID)        │◄────┤ id (UUID)   │
│ username    │     │ name             │     │ content     │
│ email       │     │ type (ENUM)      │     │ type (ENUM) │
│ avatar      │     │ spaceId          │     │ senderId    │
│ createdAt   │     │ createdAt        │     │ createdAt   │
└─────────────┘     │ updatedAt        │     │ updatedAt   │
                    │ lastMessageAt    │     │ metadata    │
                    └──────────────────┘     └─────────────┘
                             │                       │
                             ▼                       ▼
                    ┌──────────────────┐     ┌─────────────┐
                    │ConversationPart- │     │MessageReact-│
                    │    icipant       │     │    ion      │
                    │                  │     │             │
                    │ id (UUID)        │     │ id (UUID)   │
                    │ conversationId   │     │ messageId   │
                    │ userId           │     │ userId      │
                    │ role (ENUM)      │     │ emoji       │
                    │ joinedAt         │     │ createdAt   │
                    │ lastReadAt       │     └─────────────┘
                    │ unreadCount      │
                    └──────────────────┘
```

### Database Tables

#### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    display_name VARCHAR(100),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_seen ON users(last_seen);
```

#### 2. Conversations Table
```sql
CREATE TYPE conversation_type AS ENUM ('PRIVATE', 'GROUP', 'SPACE');

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    description TEXT,
    type conversation_type NOT NULL DEFAULT 'PRIVATE',
    space_id UUID, -- Reference to space for SPACE type conversations
    avatar VARCHAR(500),
    is_archived BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    last_message_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_space_id ON conversations(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
```

#### 3. Conversation Participants Table
```sql
CREATE TYPE participant_role AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');
CREATE TYPE participant_status AS ENUM ('ACTIVE', 'LEFT', 'REMOVED', 'PENDING');

CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role participant_role DEFAULT 'MEMBER',
    status participant_status DEFAULT 'ACTIVE',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT NOW(),
    last_read_message_id UUID,
    unread_count INTEGER DEFAULT 0,
    can_send_messages BOOLEAN DEFAULT true,
    can_upload_files BOOLEAN DEFAULT true,
    can_add_members BOOLEAN DEFAULT false,
    can_remove_members BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_participants_status ON conversation_participants(status);
CREATE INDEX idx_participants_unread_count ON conversation_participants(unread_count) WHERE unread_count > 0;
```

#### 4. Messages Table
```sql
CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM', 'EMOJI');
CREATE TYPE message_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'DELETED');

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type message_type DEFAULT 'TEXT',
    content TEXT,
    status message_status DEFAULT 'PENDING',
    
    -- Threading support
    parent_message_id UUID REFERENCES messages(id),
    thread_id UUID,
    
    -- Attachments (stored as JSONB array)
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Message metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    mentions UUID[] DEFAULT ARRAY[]::UUID[],
    
    -- Timestamps
    client_timestamp TIMESTAMP,
    server_timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    -- Optimistic updates support
    is_optimistic BOOLEAN DEFAULT false,
    optimistic_id VARCHAR(100)
);

-- Indexes for performance (CRITICAL for chat performance)
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_thread_id ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_mentions ON messages USING GIN(mentions) WHERE array_length(mentions, 1) > 0;
CREATE INDEX idx_messages_metadata ON messages USING GIN(metadata);
```

#### 5. Message Reactions Table
```sql
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Indexes for performance
CREATE INDEX idx_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_reactions_user_id ON message_reactions(user_id);
CREATE INDEX idx_reactions_emoji ON message_reactions(emoji);
```

### Key Relationships

1. **User ↔ Conversation** (Many-to-Many via ConversationParticipant)
   - Users can participate in multiple conversations
   - Conversations can have multiple participants

2. **User ↔ Message** (One-to-Many)
   - Users can send multiple messages
   - Each message has one sender

3. **Conversation ↔ Message** (One-to-Many)
   - Conversations contain multiple messages
   - Messages belong to one conversation

4. **Message ↔ MessageReaction** (One-to-Many)
   - Messages can have multiple reactions
   - Reactions belong to one message

5. **Message ↔ Message** (Self-referencing for threads)
   - Messages can reply to other messages
   - Messages can be part of threads

---

## Backend Implementation

### 1. MessagingGateway (WebSocket Handler)

**Location**: `backend/src/messaging/messaging.gateway.ts`

```typescript
@WebSocketGateway({
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  namespace: '/messaging',
})
export class MessagingGateway {
  @WebSocketServer() server: Server;
  
  // Key Methods:
  // - handleConnection(): Authenticate and setup user connection
  // - handleDisconnect(): Cleanup user connection
  // - handleSendMessage(): Process incoming messages
  // - handleJoinConversation(): Join conversation rooms
  // - handleTyping(): Handle typing indicators
}
```

**Key Features**:
- JWT authentication on connection
- User session management
- Room-based message routing
- Typing indicators
- Online/offline status tracking

### 2. MessageService (Core Business Logic)

**Location**: `backend/src/messaging/message.service.ts`

```typescript
@Injectable()
export class MessageService {
  // Core Methods:
  
  // Optimistic message sending with background persistence
  async sendMessage(userId: string, dto: CreateMessageDto, optimisticId?: string): Promise<SendMessageResponse>
  
  // Fast message retrieval with intelligent caching
  async getMessages(conversationId: string, userId: string, limit?: number): Promise<MessageResponse>
  
  // Message status updates
  async markAsRead(conversationId: string, userId: string, messageId: string): Promise<ReadResponse>
}
```

**Optimistic Updates Flow**:
1. Create optimistic message immediately
2. Return to client for instant UI update
3. Process database persistence in background
4. Emit success/failure events when complete

### 3. ConversationService

**Location**: `backend/src/messaging/conversation.service.ts`

```typescript
@Injectable()
export class ConversationService {
  // Conversation management
  async createConversation(dto: CreateConversationDto): Promise<Conversation>
  async getUserConversations(userId: string): Promise<Conversation[]>
  async addParticipant(conversationId: string, userId: string): Promise<ConversationParticipant>
}
```

### 4. Performance Optimizations

#### Database Query Optimization
```typescript
// Optimized message query with proper indexing
const queryBuilder = this.messageRepository
  .createQueryBuilder('message')
  .leftJoinAndSelect('message.sender', 'sender')
  .where('message.conversationId = :conversationId', { conversationId })
  .andWhere('message.status != :deletedStatus', { deletedStatus: MessageStatus.DELETED })
  .orderBy('message.createdAt', 'DESC')
  .limit(limit + 1);
```

#### Caching Strategy
```typescript
// Adaptive cache TTL based on conversation activity
const cacheStats = await this.cacheManager.get(`cache_stats:${conversationId}`);
const cacheTTL = Math.min(300000, 30000 + (cacheStats.hits * 10000)); // 30s to 5min
await this.cacheManager.set(cacheKey, result, cacheTTL);
```

#### Background Processing
```typescript
// Non-blocking database operations
const dbOperationPromise = this.processMessageInBackground(optimisticMessage, dto);
dbOperationPromise.catch(error => {
  this.logger.error('Background operation failed:', error);
});
return optimisticResponse; // Return immediately
```

---

## Frontend Implementation

### 1. SocketService (WebSocket Client)

**Location**: `mobile/stores/socket.ts`

```typescript
class SocketService {
  private socket: Socket | null = null;
  private currentUserId: string | null = null;
  private connectionStatus: ConnectionStatus;
  
  // Core Methods:
  async connect(userId: string): Promise<void>
  async sendMessage(message: SendMessageRequest): Promise<void>
  disconnect(): void
  
  // Event Handlers:
  private handleIncomingMessage(message: SocketMessage): void
  private handleMessageSentConfirmation(data: MessageSentEvent): void
  private handleTypingIndicator(data: TypingIndicator): void
}
```

**Connection Process**:
1. Get JWT token from auth store
2. Connect to `/messaging` namespace
3. Setup event listeners
4. Handle connection success/failure
5. Auto-join user conversations

### 2. ChatStore (State Management)

**Location**: `mobile/stores/chat.ts`

```typescript
interface ChatState {
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  activeConversation: string | null;
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, TypingUser[]>;
  connectionStatus: boolean;
}

const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // State management methods:
  sendMessageToConversation(conversationId: string, content: string): Promise<void>
  loadMessages(conversationId: string): Promise<void>
  markAsRead(conversationId: string, messageId: string): Promise<void>
}));
```

**Optimistic Updates**:
```typescript
// Add optimistic message immediately
const optimisticMessage = createOptimisticMessage(content, senderId);
set(state => ({
  messages: {
    ...state.messages,
    [conversationId]: [...(state.messages[conversationId] || []), optimisticMessage]
  }
}));

// Send via WebSocket
socketService.sendMessage({
  conversationId,
  content,
  optimisticId: optimisticMessage.id
});
```

### 3. UI Components

#### ChatScreen Component
```typescript
const ChatScreen = ({ conversationId }: { conversationId: string }) => {
  const { messages, sendMessage, loadMessages } = useChatStore();
  const [inputText, setInputText] = useState('');
  
  const handleSend = async () => {
    if (!inputText.trim()) return;
    await sendMessage(conversationId, inputText);
    setInputText('');
  };
  
  return (
    <View style={styles.container}>
      <MessageList messages={messages[conversationId] || []} />
      <MessageInput 
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
      />
    </View>
  );
};
```

---

## WebSocket Communication

### Connection Flow

```typescript
// 1. Client connects with JWT token
socket = io('http://localhost:3000/messaging', {
  auth: { token: jwtToken, userId }
});

// 2. Server authenticates and responds
socket.emit('connection_success', {
  userId,
  socketId: socket.id,
  connectionTime: 150 // ms
});

// 3. Client joins conversations
socket.emit('join_conversation', { conversationId });
```

### Message Flow

```typescript
// 1. Client sends message
socket.emit('send_message', {
  conversationId: 'conv-123',
  content: 'Hello world!',
  type: 'TEXT',
  optimisticId: 'opt_1699123456789_abc123'
});

// 2. Server processes and broadcasts
socket.to(conversationId).emit('new_message', {
  message: savedMessage,
  conversationId
});

// 3. Server confirms to sender
socket.emit('message_sent', {
  optimisticId: 'opt_1699123456789_abc123',
  message: savedMessage,
  success: true
});
```

### Event Types

#### Client → Server Events
- `send_message` - Send new message
- `join_conversation` - Join conversation room
- `leave_conversation` - Leave conversation room
- `typing` - Start typing indicator
- `stop_typing` - Stop typing indicator
- `mark_as_read` - Mark message as read

#### Server → Client Events
- `connection_success` - Connection established
- `new_message` - New message received
- `message_sent` - Message send confirmation
- `message_error` - Message send failed
- `typing` - Someone is typing
- `stop_typing` - Someone stopped typing
- `user_online` - User came online
- `user_offline` - User went offline

---

## Message Types & Formats

### Message Object Structure

```typescript
interface Message {
  id: string;                    // UUID or optimistic ID
  conversationId: string;        // Conversation UUID
  senderId: string;              // Sender user UUID
  type: MessageType;             // TEXT, IMAGE, FILE, etc.
  content: string;               // Message content
  status: MessageStatus;         // PENDING, SENT, DELIVERED, READ
  
  // Threading
  parentMessageId?: string;      // Reply to message
  threadId?: string;             // Thread identifier
  
  // Attachments
  attachments: Attachment[];     // File attachments
  
  // Metadata
  metadata: {
    mentions?: string[];         // Mentioned user IDs
    isSpaceMessage?: boolean;    // Space conversation flag
    originalConversationId?: string;
    [key: string]: any;
  };
  
  // Timestamps
  clientTimestamp: Date;         // Client creation time
  serverTimestamp?: Date;        // Server processing time
  createdAt: Date;
  updatedAt: Date;
  
  // Relations (populated)
  sender?: User;
  conversation?: Conversation;
  reactions?: MessageReaction[];
}
```

### Message Types

```typescript
enum MessageType {
  TEXT = 'TEXT',           // Plain text message
  IMAGE = 'IMAGE',         // Image attachment
  FILE = 'FILE',           // File attachment
  AUDIO = 'AUDIO',         // Audio message
  VIDEO = 'VIDEO',         // Video attachment
  SYSTEM = 'SYSTEM',       // System notification
  EMOJI = 'EMOJI'          // Emoji/reaction only
}
```

### Message Status Flow

```
PENDING → SENT → DELIVERED → READ
    ↓
  FAILED
```

1. **PENDING** - Message created, not yet sent
2. **SENT** - Message accepted by server
3. **DELIVERED** - Message delivered to recipient(s)
4. **READ** - Message read by recipient(s)
5. **FAILED** - Message failed to send

### Conversation Types

```typescript
enum ConversationType {
  PRIVATE = 'PRIVATE',     // 1-on-1 conversation
  GROUP = 'GROUP',         // Group chat
  SPACE = 'SPACE'          // Space-based conversation
}
```

#### Private Conversations
- Between exactly 2 users
- Created automatically when users first message
- Cannot add/remove participants

#### Group Conversations  
- Multiple participants (3+)
- Have names and descriptions
- Support roles and permissions
- Can add/remove members

#### Space Conversations
- Linked to workspace spaces
- All space members can participate
- Virtual conversation creation
- Space-specific permissions

---

## Performance Optimizations

### 1. Database Optimizations

#### Connection Pool Configuration
```typescript
// Optimized for real-time messaging
extra: {
  connectionLimit: 20,        // Increased connections
  acquireTimeout: 30000,      // Faster acquisition
  timeout: 20000,             // Reduced timeout
  idleTimeout: 10000,         // Connection cleanup
  statement_timeout: 15000,   // Query timeout
  keepAlive: true            // Connection persistence
}
```

#### Query Optimization
```sql
-- Critical indexes for message queries
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_participants_conversation_unread ON conversation_participants(conversation_id, unread_count) WHERE unread_count > 0;
```

### 2. Caching Strategy

#### Adaptive Cache TTL
```typescript
// Cache longer for frequently accessed conversations
const cacheStats = await this.cacheManager.get(`cache_stats:${conversationId}`);
const cacheTTL = Math.min(300000, 30000 + (cacheStats.hits * 10000)); // 30s to 5min
```

#### Cache Key Structure
```typescript
// Hierarchical cache keys for efficient invalidation
`user:${userId}`                              // User data
`conversation:${conversationId}`              // Conversation data
`participant:${conversationId}:${userId}`    // Participant data
`messages:${conversationId}:${limit}:${before}` // Message pages
```

### 3. Frontend Optimizations

#### Optimistic Updates
```typescript
// Add message to UI immediately, confirm later
const optimisticMessage = createOptimisticMessage(content);
updateUI(optimisticMessage);                  // Instant UI update
sendToServer(optimisticMessage)               // Background network call
  .then(confirmedMessage => updateUI(confirmedMessage))
  .catch(error => showError(error));
```

#### Message Virtualization
```typescript
// Only render visible messages for performance
<VirtualizedList
  data={messages}
  renderItem={({ item }) => <MessageBubble message={item} />}
  keyExtractor={(item) => item.id}
  windowSize={10}                            // Render window size
  initialNumToRender={20}                    // Initial render count
/>
```

### 4. WebSocket Optimizations

#### Connection Caching
```typescript
// Cache JWT verification to speed up connections
const tokenCacheKey = `jwt_verification:${token.slice(-10)}`;
let payload = await this.cacheManager.get(tokenCacheKey);
if (!payload) {
  payload = await this.jwtService.verifyAsync(token);
  await this.cacheManager.set(tokenCacheKey, payload, 300000); // 5 min cache
}
```

#### Batched Operations
```typescript
// Execute connection setup operations in parallel
const connectionPromises = [
  this.updateUserOnlineStatus(userId, 'online'),
  this.autoJoinUserConversations(client)
];
await Promise.all(connectionPromises);
```

---

## API Endpoints

### Authentication Endpoints

```typescript
POST /auth/login
Request: { email: string, password: string }
Response: { user: User, token: string, refreshToken: string }

POST /auth/refresh
Request: { refreshToken: string }
Response: { token: string, refreshToken: string }

POST /auth/logout
Headers: { Authorization: "Bearer <token>" }
Response: { success: boolean }
```

### Conversation Endpoints

```typescript
GET /conversations
Headers: { Authorization: "Bearer <token>" }
Response: { conversations: Conversation[], total: number }

POST /conversations
Request: { name?: string, type: ConversationType, participantIds: string[] }
Response: { conversation: Conversation }

GET /conversations/:id/messages
Query: { limit?: number, before?: string, after?: string }
Response: { messages: Message[], hasMore: boolean, totalCount: number }

POST /conversations/:id/messages
Request: { content: string, type: MessageType, attachments?: Attachment[] }
Response: { message: Message }

PUT /conversations/:id/messages/:messageId/read
Response: { success: boolean, unreadCount: number }
```

### User Endpoints

```typescript
GET /users/me
Response: { user: User }

PUT /users/me
Request: { displayName?: string, avatar?: string, bio?: string }
Response: { user: User }

GET /users/search
Query: { q: string, limit?: number }
Response: { users: User[], total: number }
```

### File Upload Endpoints

```typescript
POST /files/upload
Content-Type: multipart/form-data
Request: { file: File, type: 'avatar' | 'message_attachment' }
Response: { url: string, filename: string, size: number, mimeType: string }
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. WebSocket Connection Delays

**Symptoms**: Connection takes >2 seconds to establish

**Causes & Solutions**:
- **JWT verification slow**: Enable JWT caching in gateway
- **Database connection slow**: Optimize connection pool settings
- **Network latency**: Check server/client network configuration

**Fix Applied**:
```typescript
// Cache JWT verification for faster connections
const tokenCacheKey = `jwt_verification:${token.slice(-10)}`;
let payload = await this.cacheManager.get(tokenCacheKey);
if (!payload) {
  payload = await this.jwtService.verifyAsync(token);
  await this.cacheManager.set(tokenCacheKey, payload, 300000);
}
```

#### 2. Messages Not Persisting to Database

**Symptoms**: Messages show in UI but disappear on refresh

**Causes & Solutions**:
- **Background processing failure**: Check database connection and constraints
- **Space conversation handling**: Ensure space conversations are created in DB
- **Transaction rollback**: Check foreign key constraints

**Fix Applied**:
```typescript
// Ensure space conversations exist before message creation
if (isSpaceMessage) {
  await this.ensureSpaceConversationExists(queryRunner, actualConversationId, dto.conversationId);
}
```

#### 3. Slow Message Retrieval

**Symptoms**: Messages take >1 second to load

**Causes & Solutions**:
- **Missing database indexes**: Add conversation_id + created_at index
- **Cache misses**: Implement adaptive cache TTL
- **Large result sets**: Implement proper pagination

**Fix Applied**:
```sql
-- Critical index for message queries
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
```

#### 4. UI Messages on Wrong Side

**Symptoms**: Own messages briefly appear on the left side

**Causes & Solutions**:
- **Missing sender ID in optimistic messages**: Set senderId correctly
- **Race condition in UI updates**: Use proper state updates

**Fix Applied**:
```typescript
// Proper optimistic message creation
const optimisticMessage = {
  ...messageData,
  senderId: socketService.getCurrentUserId(), // ✅ Set correct sender ID
  status: 'sending'
};
```

### Performance Monitoring

#### Database Query Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE tablename = 'messages';
```

#### Cache Hit Rates
```typescript
// Monitor cache performance
const cacheStats = await redis.info('stats');
console.log('Cache hit rate:', cacheStats.keyspace_hits / (cacheStats.keyspace_hits + cacheStats.keyspace_misses));
```

#### WebSocket Connection Metrics
```typescript
// Track connection times
const connectionMetrics = {
  totalConnections: this.connectedUsers.size,
  connectionTime: Date.now() - connectionStart,
  authenticatedUsers: Array.from(this.connectedUsers.keys()).length
};
```

### Debugging Tools

#### Enable Debug Logging
```bash
# Backend debugging
DEBUG=socket.io:* npm run start:dev

# Database query logging
DATABASE_LOGGING=true npm run start:dev
```

#### Frontend WebSocket Debugging
```typescript
// Enable Socket.IO debug logging
localStorage.debug = 'socket.io-client:*';

// Log all WebSocket events
socket.onAny((event, ...args) => {
  console.log('WebSocket Event:', event, args);
});
```

---

## Final Notes

This chat system is production-ready with the following characteristics:

### ✅ **Performance Features**
- Sub-100ms message delivery with optimistic updates
- Intelligent caching with adaptive TTL
- Optimized database queries with proper indexing
- Background processing for scalability

### ✅ **Reliability Features**
- Comprehensive error handling and recovery
- Database transaction safety
- WebSocket reconnection logic
- Message delivery confirmation

### ✅ **Scalability Features**
- Horizontal scaling support via Redis
- Connection pooling optimization
- Efficient state management
- Background job processing

### ✅ **Developer Experience**
- Comprehensive logging and monitoring
- Type-safe interfaces throughout
- Detailed error messages
- Performance metrics and debugging tools

The system handles multiple conversation types (private, group, space) with full message persistence, real-time delivery, and a smooth user experience through optimistic updates.

---

*Last Updated: January 2025*
*System Version: 2.0*
*Documentation Version: 1.0*
