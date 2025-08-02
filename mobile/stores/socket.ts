import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

export interface SocketMessage {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  conversationId: string;
  timestamp: string;
  optimisticId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reactions?: { [emoji: string]: string[] };
  replyTo?: string;
  edited?: boolean;
  editedAt?: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: string;
  reconnectAttempts: number;
}

class SocketService {
  private socket: Socket | null = null;
  private currentUserId: string | null = null; // ✅ Store current user ID
  private connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false,
    reconnectAttempts: 0,
  };
  private messageQueue: any[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(userId: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('🔗 Socket already connected, skipping');
      return;
    }

    console.log('🚀 Initiating WebSocket connection...', { userId });
    this.connectionStatus.connecting = true;
    this.currentUserId = userId; // ✅ Store user ID for later use

    try {
      // Get token from auth store instead of SecureStore directly
      const { useApiStore } = await import('./api');
      const { useAuthStore } = await import('./auth');
      
      // Try to get token from auth store first
      const authStore = useAuthStore.getState();
      let token = authStore.token;
      
      // Fallback to SecureStore if not in auth store
      if (!token) {
        token = await SecureStore.getItemAsync('auth_token');
      }
      
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.31.7:3000';
      const socketUrl = `${baseUrl}/messaging`;

      console.log('🔧 WebSocket connection config:', {
        url: socketUrl,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        userId,
        tokenSource: authStore.token ? 'auth_store' : 'secure_store'
      });

      // Connect to the messaging namespace as configured in the backend
      this.socket = io(socketUrl, {
        auth: {
          token,
          userId,
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      console.log('📡 Socket.IO client created, setting up listeners...');
      this.setupEventListeners();
      this.startHeartbeat();

    } catch (error) {
      console.error('Socket connection error:', error);
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = error instanceof Error ? error.message : 'Connection failed';
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      console.log('🔗 WebSocket connected successfully');
      console.log('📡 Socket ID:', this.socket?.id);
      console.log('🌐 Connected to:', `${baseUrl}/messaging`);
      this.connectionStatus.connected = true;
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = undefined;
      this.connectionStatus.lastConnected = new Date().toISOString();
      this.connectionStatus.reconnectAttempts = 0;

      // Process queued messages
      this.processMessageQueue();
    });

    // Enhanced connection success event with timing information
    this.socket.on('connection_success', (data: { userId: string; socketId: string; connectionTime: number; timestamp: string }) => {
      console.log('✅ Connection success event received:', data);
      this.connectionStatus.connected = true;
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = undefined;
      this.connectionStatus.lastConnected = data.timestamp;
      
      // Notify stores about successful connection
      const { useChatStore } = require('./chat');
      const chatStore = useChatStore.getState();
      if (chatStore.setConnectionStatus) {
        chatStore.setConnectionStatus(true);
      }
    });

    // Enhanced connection error handling
    this.socket.on('connection_error', (data: { error: string; connectionTime: number }) => {
      console.error('❌ Connection error event received:', data);
      this.connectionStatus.connected = false;
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = data.error;
      
      // Notify stores about connection failure
      const { useChatStore } = require('./chat');
      const chatStore = useChatStore.getState();
      if (chatStore.setConnectionStatus) {
        chatStore.setConnectionStatus(false);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ WebSocket disconnected:', reason);
      console.log('🔌 Disconnect timestamp:', new Date().toISOString());
      this.connectionStatus.connected = false;
      this.connectionStatus.connecting = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        console.log('🔄 Server initiated disconnect, scheduling reconnect...');
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('🚫 WebSocket connection error:', error);
      console.error('⚠️ Error details:', error.message);
      console.error('🔄 Reconnect attempt:', this.connectionStatus.reconnectAttempts + 1);
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = error.message;
      this.connectionStatus.reconnectAttempts++;
      
      // If the error is authentication-related, don't try to reconnect continuously
      if (error.message && (error.message.includes('unauthorized') || error.message.includes('token') || error.message.includes('auth'))) {
        console.error('❌ Authentication error detected, stopping reconnection attempts');
        this.connectionStatus.reconnectAttempts = this.maxReconnectAttempts;
        return;
      }
      
      if (this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts) {
        console.log('⏳ Scheduling reconnect in', this.reconnectDelay, 'ms');
        this.scheduleReconnect();
      } else {
        console.error('❌ Max reconnect attempts reached, giving up');
      }
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.connectionStatus.error = error.message || 'Socket error';
    });

    // Chat-specific events
    this.socket.on('message', (message: SocketMessage) => {
      this.handleIncomingMessage(message);
    });

    this.socket.on('new_message', (data: { message: any; conversationId: string }) => {
      console.log('📨 Received new_message event:', data);
      this.handleIncomingMessage(data.message);
    });

    this.socket.on('message_sent', (data: { optimisticId: string; message: any; success: boolean }) => {
      console.log('✅ Message sent confirmation:', data);
      this.handleMessageSentConfirmation(data);
    });

    this.socket.on('message_error', (data: { optimisticId: string; error: string; success: boolean }) => {
      console.log('❌ Message send error:', data);
      this.handleMessageSendError(data);
    });

    this.socket.on('message_status', (data: { messageId: string; status: string; userId: string }) => {
      this.handleMessageStatusUpdate(data);
    });

    this.socket.on('typing', (data: TypingIndicator) => {
      this.handleTypingIndicator(data, true);
    });

    this.socket.on('stop_typing', (data: TypingIndicator) => {
      this.handleTypingIndicator(data, false);
    });

    this.socket.on('user_online', (data: { userId: string; status: 'online' | 'offline' }) => {
      this.handleUserStatusUpdate(data);
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // 30 seconds
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.connectionStatus.reconnectAttempts), 30000);
    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.socket?.connected && this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Attempting to reconnect (${this.connectionStatus.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.socket?.emit('send_message', message);
    }
  }

  // Public methods
  sendMessage(message: Omit<SocketMessage, 'id' | 'timestamp' | 'status'>): string {
    const optimisticId = `optimistic_${Date.now()}_${Math.random()}`;
    
    // Format message data to match backend expectations
    const messageData = {
      conversationId: message.conversationId,
      content: message.content,
      type: message.type || 'text',
      optimisticId,
      replyTo: message.replyTo,
      attachments: [], // TODO: Add attachments support
    };

    console.log('📤 [SocketService] Sending message via WebSocket:', {
      ...messageData,
      content: messageData.content.substring(0, 100),
      timestamp: new Date().toISOString(),
      connected: this.socket?.connected
    });

    if (this.socket?.connected) {
      console.log('🌐 [SocketService] Socket connected, emitting send_message event');
      this.socket.emit('send_message', messageData);
    } else {
      console.log('⚠️ [SocketService] Socket not connected, queuing message');
      // Queue message for when connection is restored
      this.messageQueue.push(messageData);
    }

    console.log('✅ [SocketService] Message queued/sent, returning optimisticId:', optimisticId);
    return optimisticId;
  }

  joinConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  leaveConversation(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  startTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  stopTyping(conversationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  markAsRead(conversationId: string, messageIds: string[]): void {
    if (this.socket?.connected) {
      this.socket.emit('mark_as_read', { conversationId, messageIds });
    }
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.socket?.disconnect();
    this.socket = null;
    
    this.connectionStatus = {
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    };
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Event handlers (to be overridden by the chat store)
  private handleIncomingMessage(message: SocketMessage): void {
    // Will be overridden by chat store
  }

  private handleMessageStatusUpdate(data: { messageId: string; status: string; userId: string }): void {
    // Will be overridden by chat store
  }

  private handleTypingIndicator(data: TypingIndicator, isTyping: boolean): void {
    // Will be overridden by chat store
  }

  private handleUserStatusUpdate(data: { userId: string; status: 'online' | 'offline' }): void {
    // Will be overridden by chat store
  }

  private handleMessageSentConfirmation(data: { optimisticId: string; message: any; success: boolean }): void {
    // Will be overridden by chat store
  }

  private handleMessageSendError(data: { optimisticId: string; error: string; success: boolean }): void {
    // Will be overridden by chat store
  }

  // Allow chat store to override event handlers
  setEventHandlers(handlers: {
    onMessage?: (message: SocketMessage) => void;
    onMessageStatus?: (data: { messageId: string; status: string; userId: string }) => void;
    onTyping?: (data: TypingIndicator, isTyping: boolean) => void;
    onUserStatus?: (data: { userId: string; status: 'online' | 'offline' }) => void;
    onMessageSent?: (data: { optimisticId: string; message: any; success: boolean }) => void;
    onMessageError?: (data: { optimisticId: string; error: string; success: boolean }) => void;
  }): void {
    if (handlers.onMessage) {
      this.handleIncomingMessage = handlers.onMessage;
    }
    if (handlers.onMessageStatus) {
      this.handleMessageStatusUpdate = handlers.onMessageStatus;
    }
    if (handlers.onTyping) {
      this.handleTypingIndicator = handlers.onTyping;
    }
    if (handlers.onUserStatus) {
      this.handleUserStatusUpdate = handlers.onUserStatus;
    }
    if (handlers.onMessageSent) {
      this.handleMessageSentConfirmation = handlers.onMessageSent;
    }
    if (handlers.onMessageError) {
      this.handleMessageSendError = handlers.onMessageError;
    }
  }

  // ✅ Method to get current user ID for optimistic messages
  getCurrentUserId(): string {
    return this.currentUserId || '';
  }
}

export const socketService = new SocketService();
