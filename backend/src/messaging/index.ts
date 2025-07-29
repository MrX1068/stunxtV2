// Enterprise Messaging System Export Index
// Zero-delay messaging with optimistic updates, Redis caching, and real-time WebSocket communication

// Core Entities
export { Message, MessageType, MessageStatus } from '../shared/entities/message.entity';
export { Conversation, ConversationType, ConversationStatus } from '../shared/entities/conversation.entity';
export { ConversationParticipant, ParticipantRole, ParticipantStatus } from '../shared/entities/conversation-participant.entity';

// Services with Enterprise Performance
export { MessageService } from './message.service';
export type { SendMessageResponse } from './message.service';
export { ConversationService } from './conversation.service';

// Controllers with Professional API Design
export { MessageController } from './message.controller';
export { ConversationController } from './conversation.controller';

// Real-time WebSocket Gateway
export { MessagingGateway } from './messaging.gateway';

// Complete Module
export { MessagingModule } from './messaging.module';

// Import types for interface definitions
import { Message } from '../shared/entities/message.entity';
import { Conversation } from '../shared/entities/conversation.entity';
import { ConversationParticipant } from '../shared/entities/conversation-participant.entity';

// Type Definitions for Frontend Integration
export interface OptimisticMessageResponse {
  message: Message;
  optimisticId: string;
  participants: ConversationParticipant[];
  unreadCounts: Record<string, number>;
}

export interface MessageSearchResult {
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  totalCount: number;
  hasMore: boolean;
}

export interface ParticipantListResponse {
  participants: ConversationParticipant[];
  activeCount: number;
  onlineCount: number;
}

// WebSocket Event Types
export interface WebSocketEvents {
  // Message Events
  'new_message': {
    message: Message;
    isOptimistic: boolean;
    timestamp: Date;
  };
  
  'message_confirmed': {
    optimisticId: string;
    message: Message;
    timestamp: Date;
  };
  
  'message_failed': {
    optimisticId: string;
    error: string;
    timestamp: Date;
  };
  
  'message_read_receipt': {
    conversationId: string;
    userId: string;
    messageId: string;
    readAt: Date;
  };
  
  // Typing Events
  'user_typing': {
    conversationId: string;
    userId: string;
    isTyping: boolean;
    timestamp: Date;
  };
  
  // Reaction Events
  'reaction_added': {
    messageId: string;
    userId: string;
    emoji: string;
    timestamp: Date;
  };
  
  'reaction_removed': {
    messageId: string;
    userId: string;
    emoji: string;
    timestamp: Date;
  };
  
  // Conversation Events
  'conversation_created': {
    conversation: Conversation;
    timestamp: Date;
  };
  
  'conversation_updated': {
    conversationId: string;
    updates: Partial<Conversation>;
    timestamp: Date;
  };
  
  'participant_added': {
    conversationId: string;
    participant: ConversationParticipant;
    timestamp: Date;
  };
  
  'participant_removed': {
    conversationId: string;
    participant: ConversationParticipant;
    timestamp: Date;
  };
  
  // Status Events
  'user_status_changed': {
    userId: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    timestamp: Date;
  };
  
  'online_users': {
    conversationId: string;
    users: Array<{
      userId: string;
      status: string;
      lastSeen?: Date;
    }>;
  };
}

// Performance Metrics Interface
export interface MessagingPerformanceMetrics {
  optimisticResponseTime: number; // Time to return optimistic response
  dbPersistenceTime: number; // Time to persist to database
  cacheHitRate: number; // Cache hit percentage
  websocketLatency: number; // Real-time message delivery latency
  deliverySuccessRate: number; // Message delivery success rate
  concurrentConnections: number; // Active WebSocket connections
}

// Enterprise Configuration
export interface MessagingConfig {
  // Performance Settings
  optimisticUpdates: boolean;
  cacheEnabled: boolean;
  cacheTtl: number;
  
  // Rate Limiting
  messagesPerMinute: number;
  filesPerHour: number;
  
  // WebSocket Settings
  maxConnections: number;
  heartbeatInterval: number;
  
  // Redis Configuration
  redisUrl: string;
  redisMaxMemory: string;
  
  // File Upload Limits
  maxFileSize: number;
  allowedFileTypes: string[];
  
  // Moderation Settings
  autoModerationEnabled: boolean;
  profanityFilterEnabled: boolean;
  spamDetectionEnabled: boolean;
}
