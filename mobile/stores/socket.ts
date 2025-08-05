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
  // ✅ ENHANCEMENT: Optional sender object for enhanced user data
  sender?: {
    id: string;
    username?: string;
    fullName?: string;
    displayName?: string;
    avatarUrl?: string;
    avatar?: string;
  };
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

  // Event handler callbacks
  private handleConnect: () => void = () => {};
  private handleDisconnect: (reason: string) => void = () => {};
  private handleConnectSuccess: (data: any) => void = () => {};
  private handleConnectError: (error: any) => void = () => {};
  private handleIncomingMessage: (message: SocketMessage) => void = () => {};
  private handleMessageStatusUpdate: (data: { messageId: string; status: string; userId: string }) => void = () => {};
  private handleTypingIndicator: (data: TypingIndicator, isTyping: boolean) => void = () => {};
  private handleUserStatusUpdate: (data: { userId: string; status: 'online' | 'offline' }) => void = () => {};
  private handleMessageSentConfirmation: (data: { optimisticId: string; message: any; success: boolean }) => void = () => {};
  private handleMessageSendError: (data: { optimisticId: string; error: string; success: boolean }) => void = () => {};

  async connect(userId: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

   
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

      this.setupEventListeners();
      this.startHeartbeat();

    } catch (error) {
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = error instanceof Error ? error.message : 'Connection failed';
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
 
      this.connectionStatus.connected = true;
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = undefined;
      this.connectionStatus.lastConnected = new Date().toISOString();
      this.connectionStatus.reconnectAttempts = 0;
      this.handleConnect(); // Use callback
      this.processMessageQueue();
    });

    this.socket.on('connection_success', (data: { userId: string; socketId: string; connectionTime: number; timestamp: string }) => {
     
      this.connectionStatus.connected = true;
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = undefined;
      this.connectionStatus.lastConnected = data.timestamp;
      this.handleConnectSuccess(data); // Use callback
    });

    this.socket.on('connection_error', (data: { error: string; connectionTime: number }) => {
   
      this.connectionStatus.connected = false;
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = data.error;
      this.handleConnectError(data); // Use callback
    });

    this.socket.on('disconnect', (reason: string) => {
  
      this.connectionStatus.connected = false;
      this.connectionStatus.connecting = false;
      this.handleDisconnect(reason); // Use callback
      
      if (reason === 'io server disconnect') {
        
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
     
      this.connectionStatus.connecting = false;
      this.connectionStatus.error = error.message;
      this.connectionStatus.reconnectAttempts++;
      this.handleConnectError(error); // Use callback
      
      if (error.message?.includes('unauthorized')) {
        this.connectionStatus.reconnectAttempts = this.maxReconnectAttempts;
        return;
      }
      
      if (this.connectionStatus.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        
      }
    });

    this.socket.on('error', (error: any) => {
   
      this.connectionStatus.error = error.message || 'Socket error';
    });

    // Chat-specific events
    this.socket.on('message', (message: SocketMessage) => {
      this.handleIncomingMessage(message);
    });

    this.socket.on('new_message', (data: { message: any; conversationId: string }) => {
      this.handleIncomingMessage(data.message);
    });

    this.socket.on('message_sent', (data: { optimisticId: string; message: any; success: boolean }) => {
      this.handleMessageSentConfirmation(data);
    });

    this.socket.on('message_error', (data: { optimisticId: string; error: string; success: boolean }) => {
      this.handleMessageSendError(data);
    });

    this.socket.on('message_status', (data: { messageId: string; status: string; userId: string }) => {
      this.handleMessageStatusUpdate(data);
    });

    // ✅ CRITICAL FIX: Updated typing event listeners to match backend
    this.socket.on('user_typing', (data: { 
      conversationId: string; 
      userId: string; 
      userName?: string;
      isTyping: boolean; 
      timestamp: string;
    }) => {
      console.log('👀 [Socket] Typing event received:', data);
      
      const typingIndicator: TypingIndicator = {
        userId: data.userId,
        userName: data.userName || `User ${data.userId.substring(0, 8)}`,
        conversationId: data.conversationId,
      };
      
      this.handleTypingIndicator(typingIndicator, data.isTyping);
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


    if (this.socket?.connected) {
      
      this.socket.emit('send_message', messageData);
    } else {
    
      // Queue message for when connection is restored
      this.messageQueue.push(messageData);
    }

    
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

  // Allow chat store to override event handlers
  setEventHandlers(handlers: {
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onConnectSuccess?: (data: any) => void;
    onConnectError?: (error: any) => void;
    onMessage?: (message: SocketMessage) => void;
    onMessageStatus?: (data: { messageId: string; status: string; userId: string }) => void;
    onTyping?: (data: TypingIndicator, isTyping: boolean) => void;
    onUserStatus?: (data: { userId: string; status: 'online' | 'offline' }) => void;
    onMessageSent?: (data: { optimisticId: string; message: any; success: boolean }) => void;
    onMessageError?: (data: { optimisticId: string; error: string; success: boolean }) => void;
  }): void {
    if (handlers.onConnect) this.handleConnect = handlers.onConnect;
    if (handlers.onDisconnect) this.handleDisconnect = handlers.onDisconnect;
    if (handlers.onConnectSuccess) this.handleConnectSuccess = handlers.onConnectSuccess;
    if (handlers.onConnectError) this.handleConnectError = handlers.onConnectError;
    if (handlers.onMessage) this.handleIncomingMessage = handlers.onMessage;
    if (handlers.onMessageStatus) this.handleMessageStatusUpdate = handlers.onMessageStatus;
    if (handlers.onTyping) this.handleTypingIndicator = handlers.onTyping;
    if (handlers.onUserStatus) this.handleUserStatusUpdate = handlers.onUserStatus;
    if (handlers.onMessageSent) this.handleMessageSentConfirmation = handlers.onMessageSent;
    if (handlers.onMessageError) this.handleMessageSendError = handlers.onMessageError;
  }

  // ✅ Method to get current user ID for optimistic messages
  getCurrentUserId(): string {
    return this.currentUserId || '';
  }
}

export const socketService = new SocketService();
