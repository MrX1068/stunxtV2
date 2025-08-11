import { useRealtimeChatStore } from '../stores/realtimeChat';
import type { ChatMessage, TypingUser } from '../stores/realtimeChat';

/**
 * Real-time Chat Service
 * Integrates with useSmartWebSocket hook for WebSocket communication
 * Handles all chat-related WebSocket events and store updates
 */
export class RealtimeChatService {
  private static instance: RealtimeChatService;
  private socket: any = null;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {}

  static getInstance(): RealtimeChatService {
    if (!RealtimeChatService.instance) {
      RealtimeChatService.instance = new RealtimeChatService();
    }
    return RealtimeChatService.instance;
  }

  /**
   * Initialize the service with WebSocket instance from useSmartWebSocket
   */
  initialize(socket: any, userId: string) {
    if (!socket) {
      console.error('❌ [RealtimeChatService] Cannot initialize with null socket');
      return;
    }

    if (!userId) {
      console.error('❌ [RealtimeChatService] Cannot initialize with null userId');
      return;
    }

    console.log('🔍 [RealtimeChatService] Initializing with socket:', {
      socketId: socket.id,
      isConnected: socket.connected,
      userId: userId
    });

    this.socket = socket;
    this.userId = userId;
    this.setupEventListeners();
    console.log('🚀 [RealtimeChatService] Initialized successfully with socket and user:', userId);
  }

  /**
   * Setup all WebSocket event listeners based on backend messaging gateway
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connection_success', this.handleConnectionSuccess.bind(this));
    this.socket.on('connection_error', this.handleConnectionError.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));

    // Message events
    this.socket.on('message_sent', this.handleMessageSent.bind(this));
    this.socket.on('message_error', this.handleMessageError.bind(this));
    this.socket.on('new_message', this.handleNewMessage.bind(this));
    this.socket.on('message_confirmed', this.handleMessageConfirmed.bind(this));
    this.socket.on('message_failed', this.handleMessageFailed.bind(this));

    // Message loading events
    this.socket.on('messages_loaded', this.handleMessagesLoaded.bind(this));
    this.socket.on('get_messages_error', this.handleGetMessagesError.bind(this));

    // Typing events
    this.socket.on('user_typing', this.handleUserTyping.bind(this));

    // Read receipts
    this.socket.on('messages_read', this.handleMessagesRead.bind(this));
    this.socket.on('message_read_receipt', this.handleMessageReadReceipt.bind(this));

    // Conversation events
    this.socket.on('joined_conversation', this.handleJoinedConversation.bind(this));
    this.socket.on('left_conversation', this.handleLeftConversation.bind(this));

    // Error handling
    this.socket.on('error', this.handleError.bind(this));

    console.log('✅ [RealtimeChatService] Event listeners setup complete');
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Join conversation timeout'));
      }, 10000);

      const handleJoined = (data: { conversationId: string }) => {
        if (data.conversationId === conversationId) {
          clearTimeout(timeout);
          this.socket.off('joined_conversation', handleJoined);
          resolve();
        }
      };

      this.socket.on('joined_conversation', handleJoined);
      this.socket.emit('join_conversation', { conversationId });
    });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('leave_conversation', { conversationId });
  }

  /**
   * Send a message
   */
  sendMessage(params: {
    conversationId: string;
    content: string;
    type?: string;
    optimisticId: string;
  }) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.emit('send_message', {
      conversationId: params.conversationId,
      content: params.content,
      type: params.type || 'text',
      optimisticId: params.optimisticId,
    });

    console.log(`📤 [RealtimeChatService] Sent message via WebSocket:`, params.optimisticId);
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('typing_start', { conversationId, isTyping: true });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string) {
    if (!this.socket) return;
    this.socket.emit('typing_stop', { conversationId, isTyping: false });
  }

  /**
   * Mark messages as read
   */
  markMessagesRead(conversationId: string, messageId: string) {
    if (!this.socket) return;
    this.socket.emit('mark_messages_read', { conversationId, messageId });
  }

  /**
   * Fetch messages via WebSocket
   */
  fetchMessages(params: {
    conversationId: string;
    limit?: number;
    before?: string;
    after?: string;
  }): Promise<{
    messages: any[];
    hasMore: boolean;
    cursor?: string;
    total: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        console.error('❌ [RealtimeChatService] Socket not initialized for fetchMessages');
        reject(new Error('Socket not initialized'));
        return;
      }

      if (!this.socket.connected) {
        console.error('❌ [RealtimeChatService] Socket not connected for fetchMessages');
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        console.error('❌ [RealtimeChatService] Fetch messages timeout for:', params.conversationId);
        reject(new Error('Fetch messages timeout'));
      }, 15000); // 15 second timeout

      const handleSuccess = (data: {
        conversationId: string;
        messages: any[];
        hasMore: boolean;
        cursor?: string;
        total: number;
      }) => {
        if (data.conversationId === params.conversationId) {
          clearTimeout(timeout);
          this.socket.off('messages_loaded', handleSuccess);
          this.socket.off('get_messages_error', handleError);
          resolve(data);
        }
      };

      const handleError = (data: { error: string; conversationId: string }) => {
        if (data.conversationId === params.conversationId) {
          clearTimeout(timeout);
          this.socket.off('messages_loaded', handleSuccess);
          this.socket.off('get_messages_error', handleError);
          reject(new Error(data.error));
        }
      };

      this.socket.on('messages_loaded', handleSuccess);
      this.socket.on('get_messages_error', handleError);

      console.log(`📥 [RealtimeChatService] Requesting messages via WebSocket:`, params);
      this.socket.emit('get_messages', params);
    });
  }

  // Event Handlers

  private handleConnectionSuccess(data: any) {
    console.log('✅ [RealtimeChatService] Connection successful:', data);
    this.reconnectAttempts = 0;
    
    useRealtimeChatStore.getState().connect(this.userId!);
  }

  private handleConnectionError(data: any) {
    console.error('❌ [RealtimeChatService] Connection error:', data);
    
    useRealtimeChatStore.setState((state) => {
      state.connectionStatus.connected = false;
      state.connectionStatus.connecting = false;
      state.connectionStatus.error = data.error;
    });
  }

  private handleDisconnect() {
    console.log('🔌 [RealtimeChatService] Disconnected');
    
    useRealtimeChatStore.setState((state) => {
      state.connectionStatus.connected = false;
    });

    // Attempt reconnection
    this.attemptReconnection();
  }

  private handleMessageSent(data: { optimisticId: string; message: any; success: boolean }) {
    console.log('✅ [RealtimeChatService] Message sent confirmation:', data.optimisticId);
    
    if (data.success && data.message) {
      const message: ChatMessage = {
        id: data.message.id,
        conversationId: data.message.conversationId,
        senderId: data.message.senderId,
        senderName: data.message.senderName || 'You',
        senderAvatar: data.message.senderAvatar,
        type: data.message.type,
        content: data.message.content,
        status: 'sent',
        timestamp: data.message.createdAt || data.message.timestamp,
        optimisticId: data.optimisticId,
      };

      // Update optimistic message with real data
      useRealtimeChatStore.setState((state) => {
        const conversation = state.conversations[message.conversationId];
        if (conversation) {
          const messageIndex = conversation.messages.findIndex(
            m => m.optimisticId === data.optimisticId
          );
          if (messageIndex !== -1) {
            conversation.messages[messageIndex] = message;
          }
        }
      });
    }
  }

  private handleMessageError(data: { optimisticId: string; error: string }) {
    console.error('❌ [RealtimeChatService] Message error:', data);
    
    // Mark optimistic message as failed
    useRealtimeChatStore.setState((state) => {
      for (const conversation of Object.values(state.conversations)) {
        const messageIndex = conversation.messages.findIndex(
          m => m.optimisticId === data.optimisticId
        );
        if (messageIndex !== -1) {
          conversation.messages[messageIndex].status = 'failed';
          break;
        }
      }
    });
  }

  private handleNewMessage(data: { message: any; conversationId: string }) {
    console.log('📨 [RealtimeChatService] New message received:', data);
    
    const message: ChatMessage = {
      id: data.message.id,
      conversationId: data.message.conversationId,
      senderId: data.message.senderId,
      senderName: data.message.senderName || data.message.sender?.username || 'User',
      senderAvatar: data.message.senderAvatar || data.message.sender?.avatarUrl,
      type: data.message.type,
      content: data.message.content,
      status: 'delivered',
      timestamp: data.message.createdAt || data.message.timestamp,
    };

    // Add to conversation
    useRealtimeChatStore.setState((state) => {
      if (!state.conversations[message.conversationId]) {
        state.conversations[message.conversationId] = {
          messages: [],
          typingUsers: [],
          isLoading: false,
          hasMore: true,
          unreadCount: 0,
        };
      }
      
      // Check if message already exists (avoid duplicates)
      const exists = state.conversations[message.conversationId].messages.some(
        m => m.id === message.id
      );
      
      if (!exists) {
        state.conversations[message.conversationId].messages.push(message);
        
        // Increment unread count if not active conversation
        if (state.activeConversation !== message.conversationId) {
          state.conversations[message.conversationId].unreadCount++;
        }
      }
    });

    // Cache the message
    import('../stores/sqliteMessageCache').then(({ sqliteMessageCache }) => {
      const socketMessage = {
        ...message,
        type: message.type === 'video' || message.type === 'audio' ? 'file' : message.type
      } as any;
      sqliteMessageCache.addOptimisticMessage(socketMessage);
    });
  }

  private handleMessageConfirmed(data: { optimisticId: string; message: any }) {
    console.log('✅ [RealtimeChatService] Message confirmed:', data.optimisticId);
    // Handle message confirmation if needed
  }

  private handleMessageFailed(data: { optimisticId: string; error: string }) {
    console.error('❌ [RealtimeChatService] Message failed:', data);
    this.handleMessageError(data);
  }

  private handleUserTyping(data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) {
    console.log(`👀 [RealtimeChatService] User typing:`, data);
    
    // Don't show typing indicator for self
    if (data.userId === this.userId) return;

    useRealtimeChatStore.setState((state) => {
      const conversation = state.conversations[data.conversationId];
      if (conversation) {
        if (data.isTyping) {
          // Add to typing users
          const existingIndex = conversation.typingUsers.findIndex(u => u.userId === data.userId);
          if (existingIndex === -1) {
            conversation.typingUsers.push({
              userId: data.userId,
              userName: data.userName,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          // Remove from typing users
          conversation.typingUsers = conversation.typingUsers.filter(
            u => u.userId !== data.userId
          );
        }
      }
    });
  }

  private handleMessagesRead(data: { conversationId: string; userId: string; messageId: string }) {
    console.log('👁️ [RealtimeChatService] Messages read:', data);
    // Handle read receipts if needed
  }

  private handleMessageReadReceipt(data: { conversationId: string; userId: string; messageId: string }) {
    console.log('👁️ [RealtimeChatService] Message read receipt:', data);
    // Handle individual message read receipts if needed
  }

  private handleJoinedConversation(data: { conversationId: string }) {
    console.log('✅ [RealtimeChatService] Joined conversation:', data.conversationId);
  }

  private handleLeftConversation(data: { conversationId: string }) {
    console.log('👋 [RealtimeChatService] Left conversation:', data.conversationId);
  }

  private handleMessagesLoaded(data: {
    conversationId: string;
    messages: any[];
    hasMore: boolean;
    cursor?: string;
    total: number;
  }) {
    console.log(`📨 [RealtimeChatService] Messages loaded for conversation:`, data.conversationId);

    // Convert messages to ChatMessage format
    const chatMessages = data.messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversationId || data.conversationId,
      senderId: msg.senderId || msg.sender?.id,
      senderName: msg.senderName || msg.sender?.username || msg.sender?.fullName || 'User',
      senderAvatar: msg.senderAvatar || msg.sender?.avatarUrl,
      type: msg.type,
      content: msg.content,
      status: msg.status || 'delivered',
      timestamp: msg.createdAt || msg.timestamp,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt,
    }));

    // Update store with loaded messages
    useRealtimeChatStore.setState((state) => {
      if (!state.conversations[data.conversationId]) {
        state.conversations[data.conversationId] = {
          messages: [],
          typingUsers: [],
          isLoading: false,
          hasMore: true,
          unreadCount: 0,
        };
      }

      const conversation = state.conversations[data.conversationId];
      conversation.messages = chatMessages;
      conversation.hasMore = data.hasMore;
      conversation.isLoading = false;
      conversation.lastMessageId = data.cursor;
    });

    // Cache messages in SQLite
    import('../stores/sqliteMessageCache').then(({ sqliteMessageCache }) => {
      const socketMessages = chatMessages.map(msg => ({
        ...msg,
        type: msg.type === 'video' || msg.type === 'audio' ? 'file' : msg.type
      })) as any[];
      sqliteMessageCache.batchSyncMessages(data.conversationId, socketMessages);
    });
  }

  private handleGetMessagesError(data: { error: string; conversationId: string }) {
    console.error(`❌ [RealtimeChatService] Get messages error:`, data);

    // Update store to clear loading state
    useRealtimeChatStore.setState((state) => {
      if (state.conversations[data.conversationId]) {
        state.conversations[data.conversationId].isLoading = false;
      }
    });
  }

  private handleError(error: any) {
    console.error('❌ [RealtimeChatService] Socket error:', error);
  }

  private attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [RealtimeChatService] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 [RealtimeChatService] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Check if service is properly initialized and connected
   */
  isReady(): boolean {
    return !!(this.socket && this.socket.connected && this.userId);
  }

  /**
   * Get connection status for debugging
   */
  getStatus() {
    return {
      hasSocket: !!this.socket,
      isConnected: this.socket?.connected || false,
      hasUserId: !!this.userId,
      isReady: this.isReady(),
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.userId = null;
    this.reconnectAttempts = 0;
  }
}

export const realtimeChatService = RealtimeChatService.getInstance();
