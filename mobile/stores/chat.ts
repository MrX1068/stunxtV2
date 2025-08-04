import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { socketService, SocketMessage, TypingIndicator, ConnectionStatus } from './socket';
import { useApiStore } from './api';
import { useAuth } from './auth';
import { messageCache } from './messageCache';

export interface ChatConversation {
  id: string;
  name?: string;
  type: 'DIRECT' | 'GROUP' | 'SPACE';
  spaceId?: string;
  communityId?: string; // Added for space context
  participants: ChatParticipant[];
  lastMessage?: SocketMessage;
  unreadCount: number;
  isTyping: string[]; // user IDs currently typing
  createdAt: string;
  updatedAt: string;
  // Space-specific metadata
  spaceMetadata?: {
    spaceName: string;
    spaceCategory: string;
    spaceType: 'public' | 'private' | 'secret';
    memberCount: number;
  };
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  role?: 'owner' | 'admin' | 'member';
}

export interface ChatState {
  // Connection
  connectionStatus: ConnectionStatus;
  isConnecting: boolean;
  
  // Conversations
  conversations: ChatConversation[];
  activeConversationId: string | null;
  activeConversation: ChatConversation | null;
  
  // Space-specific state
  spaceConversations: { [spaceId: string]: string }; // spaceId -> conversationId mapping
  
  // Messages
  messages: { [conversationId: string]: SocketMessage[] };
  isLoadingMessages: boolean;
  
  // Typing indicators
  typingUsers: { [conversationId: string]: TypingIndicator[] };
  
  // UI State
  isInputFocused: boolean;
  selectedMessages: string[];
  replyingTo: SocketMessage | null;
  
  // Error handling
  error: string | null;
}

export interface ChatActions {
  // Connection
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  getConnectionStatus: () => ConnectionStatus;
  
  // Conversations
  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversationId: string) => void;
  createSpaceConversation: (spaceId: string, spaceName: string, communityId?: string) => Promise<string>;
  createDirectConversation: (participantId: string) => Promise<string>;
  createGroupConversation: (participantIds: string[], name: string) => Promise<string>;
  
  // Messages
  fetchMessages: (conversationId: string, limit?: number, before?: string) => Promise<void>;
  sendMessage: (content: string, type?: 'text' | 'image' | 'file') => string | null;
  sendMessageToConversation: (conversationId: string, content: string, type?: 'text' | 'image' | 'file') => string | null;
  resendMessage: (optimisticId: string) => void;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  markAsRead: (conversationId: string, messageIds: string[]) => void;
  
  // Space-specific actions
  getSpaceConversation: (spaceId: string) => string | null;
  joinSpaceChat: (spaceId: string, spaceName: string, communityId?: string) => Promise<string>;
  
  // Typing
  startTyping: () => void;
  stopTyping: () => void;
  
  // UI Actions
  setInputFocused: (focused: boolean) => void;
  setReplyingTo: (message: SocketMessage | null) => void;
  toggleMessageSelection: (messageId: string) => void;
  clearSelectedMessages: () => void;
  
  // Error handling
  clearError: () => void;
  
  // Connection management
  refreshConnectionStatus: () => void;
  
  // Space integration helpers
  syncSpaceMessages: (spaceId: string, spaceMessages: any[]) => Promise<void>;
  clearSpaceChatState: (spaceId: string) => Promise<void>;
  loadMessagesFromCache: (conversationId: string) => Promise<SocketMessage[]>;
  
  // Professional message management
  retryFailedMessages: (conversationId?: string) => Promise<number>;
  checkMessageStatus: (conversationId: string, messageId: string) => Promise<string>;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()(
  immer((set, get) => ({
    // Initial state
    connectionStatus: {
      connected: false,
      connecting: false,
      reconnectAttempts: 0,
    },
    isConnecting: false,
    conversations: [],
    activeConversationId: null,
    activeConversation: null,
    spaceConversations: {}, // Added missing property
    messages: {},
    isLoadingMessages: false,
    typingUsers: {},
    isInputFocused: false,
    selectedMessages: [],
    replyingTo: null,
    error: null,

    // Connection actions
    connect: async (userId: string) => {
      set((state) => {
        state.isConnecting = true;
        state.error = null;
      });

      // Setup socket event handlers immediately for faster UI updates
      socketService.setEventHandlers({
        onConnectSuccess: (data) => {
          console.log('✅ ChatStore: Connection success event received', data);
          set((state) => {
            state.connectionStatus.connected = true;
            state.connectionStatus.connecting = false;
            state.isConnecting = false;
            state.connectionStatus.lastConnected = data.timestamp;
          });
        },
        onConnectError: (error) => {
          console.error('❌ ChatStore: Connection error event received', error);
          set((state) => {
            state.connectionStatus.connected = false;
            state.connectionStatus.connecting = false;
            state.isConnecting = false;
            state.error = error.message || 'Connection failed';
          });
        },
        onDisconnect: (reason) => {
          console.log('🔌 ChatStore: Disconnected', reason);
          set((state) => {
            state.connectionStatus.connected = false;
            state.connectionStatus.connecting = false;
            state.isConnecting = false;
          });
        },
        onMessage: (message: SocketMessage) => {
          console.log('📨 ChatStore: Received new message', message);
          
          // 🚀 Professional Message Enhancement - Ensure senderName is properly set
          const enhancedMessage: SocketMessage = {
            ...message,
            senderName: message.senderName || 'Anonymous User'
          };
          
          // If senderName is empty/null but we have senderId, we should fetch user info
          // For now, we'll use Anonymous User as fallback
          if (!enhancedMessage.senderName || enhancedMessage.senderName.trim() === '') {
            enhancedMessage.senderName = 'Anonymous User';
          }
          
          set((state) => {
            const { conversationId } = enhancedMessage;
            if (!state.messages[conversationId]) {
              state.messages[conversationId] = [];
            }
            // Avoid duplicates
            if (!state.messages[conversationId].some(m => m.id === enhancedMessage.id)) {
              state.messages[conversationId].push(enhancedMessage);
            }
          });
          
          // Cache the enhanced message immediately for persistence
          messageCache.addMessageToCache(enhancedMessage.conversationId, enhancedMessage);
        },
        onMessageSent: (data: { optimisticId: string; message: any; success: boolean }) => {
          console.log('✅ ChatStore: Message sent confirmation', data);
          set((state) => {
            const { conversationId } = data.message;
            const convoMessages = state.messages[conversationId];
            if (convoMessages) {
              const msgIndex = convoMessages.findIndex(m => m.id === data.optimisticId);
              if (msgIndex !== -1) {
                // Update message with server data
                state.messages[conversationId][msgIndex] = {
                  ...data.message,
                  status: data.success ? 'sent' : 'failed',
                  timestamp: data.message.timestamp || new Date().toISOString(),
                };
                
                // 🚀 Professional DB Save Status - Check if message was saved to database
                if (data.success && data.message.savedToDb !== false) {
                  state.messages[conversationId][msgIndex].status = 'delivered';
                } else if (data.success && data.message.savedToDb === false) {
                  // Message sent to recipients but not saved to DB yet
                  state.messages[conversationId][msgIndex].status = 'sent';
                  console.warn('⚠️ Message sent but not yet saved to database:', data.optimisticId);
                }
              }
            }
          });
          
          // Update the message in cache
          messageCache.updateMessageInCache(data.message.conversationId, {
            ...data.message,
            status: data.success ? (data.message.savedToDb !== false ? 'delivered' : 'sent') : 'failed',
          });
        },
        onMessageError: (data: { optimisticId: string; error: string; success: boolean }) => {
          console.error('❌ ChatStore: Message send error', data);
          set((state) => {
            // Find conversation and message to update status
            for (const convoId in state.messages) {
              const msgIndex = state.messages[convoId].findIndex(m => m.id === data.optimisticId);
              if (msgIndex !== -1) {
                state.messages[convoId][msgIndex].status = 'failed';
                break;
              }
            }
          });
        },
        // 🚀 Professional Typing Indicator Handler
        onTyping: (data: TypingIndicator, isTyping: boolean) => {
          console.log('⌨️ ChatStore: Typing indicator update', { data, isTyping });
          set((state) => {
            const { conversationId } = data;
            if (!state.typingUsers[conversationId]) {
              state.typingUsers[conversationId] = [];
            }
            
            if (isTyping) {
              // Add user to typing list if not already there
              if (!state.typingUsers[conversationId].some(u => u.userId === data.userId)) {
                state.typingUsers[conversationId].push(data);
              }
            } else {
              // Remove user from typing list
              state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
                u => u.userId !== data.userId
              );
            }
          });
        },
        // Add other handlers as needed (status, etc.)
      });

      try {
        await socketService.connect(userId);
        console.log('SocketService.connect() promise resolved');
      } catch (error) {
        console.error('Error during socket connection in ChatStore:', error);
        set((state) => {
          state.isConnecting = false;
          state.error = error instanceof Error ? error.message : 'Connection failed';
        });
      }
    },

    disconnect: () => {
      socketService.disconnect();
      set((state) => {
        state.connectionStatus = socketService.getConnectionStatus();
        state.activeConversationId = null;
        state.activeConversation = null;
        state.typingUsers = {};
      });
    },

    getConnectionStatus: () => {
      const status = socketService.getConnectionStatus();
      // Update local state if needed
      set((state) => {
        state.connectionStatus = status;
        state.isConnecting = status.connecting;
      });
      return status;
    },

    // Conversation actions
    fetchConversations: async () => {
      try {
        const api = useApiStore.getState();
        console.log('📞 Fetching conversations from: /conversations');
        const response = await api.get('/conversations');
        console.log('✅ Conversations fetched successfully:', response.data);
        set((state) => {
          state.conversations = response.data.data?.conversations || [];
        });
      } catch (error) {
        console.error('❌ Failed to fetch conversations:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch conversations';
        });
      }
    },

    setActiveConversation: (conversationId: string) => {
      const conversation = get().conversations.find(c => c.id === conversationId);
      set((state) => {
        state.activeConversationId = conversationId;
        state.activeConversation = conversation || null;
        state.replyingTo = null;
        state.selectedMessages = [];
      });

      // Join conversation room
      socketService.joinConversation(conversationId);
      
      // Fetch messages if not already loaded
      if (!get().messages[conversationId]) {
        get().fetchMessages(conversationId);
      }

      // Mark messages as read
      const messages = get().messages[conversationId] || [];
      const unreadMessages = messages.filter(m => m.status !== 'read');
      if (unreadMessages.length > 0) {
        get().markAsRead(conversationId, unreadMessages.map(m => m.id));
      }
    },

    createSpaceConversation: async (spaceId: string, spaceName: string, communityId?: string): Promise<string> => {
      try {
        if (!communityId) {
          throw new Error('Community ID is required for space conversations');
        }
        
        const api = useApiStore.getState();
        console.log('🚀 Creating space conversation:', { spaceId, spaceName, communityId });
        
        // Use the space-specific endpoint for space chat
        const response = await api.post(`/communities/${communityId}/spaces/${spaceId}/chat/conversation`, {
          spaceName,
        });
        
        console.log('✅ Space conversation created:', response.data);
        const conversationId = response.data.conversationId || response.data.data?.conversationId;
        
        // Store space to conversation mapping
        set((state) => {
          state.spaceConversations[spaceId] = conversationId;
        });
        
        return conversationId;
      } catch (error) {
        console.error('❌ Failed to create space conversation:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create conversation';
        });
        throw error;
      }
    },

    createDirectConversation: async (participantId: string): Promise<string> => {
      try {
        const api = useApiStore.getState();
        console.log('🚀 Creating direct conversation with:', participantId);
        const response = await api.post('/conversations', {
          type: 'DIRECT',
          participantIds: [participantId],
        });
        
        console.log('✅ Direct conversation created:', response.data);
        const conversation = response.data.conversation;
        set((state) => {
          state.conversations.unshift(conversation);
        });
        
        return conversation.id;
      } catch (error) {
        console.error('❌ Failed to create direct conversation:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create direct conversation';
        });
        throw error;
      }
    },

    createGroupConversation: async (participantIds: string[], name: string): Promise<string> => {
      try {
        const api = useApiStore.getState();
        console.log('🚀 Creating group conversation:', { participantIds, name });
        const response = await api.post('/conversations', {
          type: 'GROUP',
          participantIds,
          name,
        });
        
        console.log('✅ Group conversation created:', response.data);
        const conversation = response.data.conversation;
        set((state) => {
          state.conversations.unshift(conversation);
        });
        
        return conversation.id;
      } catch (error) {
        console.error('❌ Failed to create group conversation:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create group conversation';
        });
        throw error;
      }
    },

    getSpaceConversation: (spaceId: string): string | null => {
      const state = get();
      return state.spaceConversations[spaceId] || null;
    },

    joinSpaceChat: async (spaceId: string, spaceName: string, communityId?: string): Promise<string> => {
      console.log('🚀 Joining space chat:', { spaceId, spaceName, communityId });
      
      // Use a simple, deterministic conversation ID for space chats
      // This avoids UUID validation issues in the backend
      const conversationId = `space-${spaceId}`;
      
      // Store space to conversation mapping
      set((state) => {
        state.spaceConversations[spaceId] = conversationId;
        
        // Create a virtual conversation entry for space chat
        const spaceConversation: ChatConversation = {
          id: conversationId,
          name: spaceName,
          type: 'SPACE',
          spaceId,
          communityId,
          participants: [], // Will be populated when needed
          unreadCount: 0,
          isTyping: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          spaceMetadata: {
            spaceName,
            spaceCategory: 'general',
            spaceType: 'public', // Will be updated with actual space type
            memberCount: 0
          }
        };
        
        // Add to conversations if not already exists
        const existingIndex = state.conversations.findIndex(c => c.id === conversationId);
        if (existingIndex === -1) {
          state.conversations.unshift(spaceConversation);
        }
      });
      
      // Join the WebSocket room using the conversation ID
      if (get().connectionStatus.connected) {
        console.log('🔌 Joining WebSocket room:', conversationId);
        socketService.joinConversation(conversationId);
      }
      
      console.log('✅ Space chat joined with conversation ID:', conversationId);
      return conversationId;
    },

    // Message actions
    fetchMessages: async (conversationId: string, limit = 50, before?: string) => {
      set((state) => {
        state.isLoadingMessages = true;
      });

      try {
        // Check if this is a space conversation
        if (conversationId.startsWith('space-')) {
          const spaceId = conversationId.replace('space-', '');
          console.log('📱 Fetching space messages for space:', spaceId);
          
          // For space chats, we don't need to fetch separately as the space content
          // is already being fetched by the space screen. Just mark as loaded.
          set((state) => {
            if (!state.messages[conversationId]) {
              state.messages[conversationId] = [];
            }
            state.isLoadingMessages = false;
          });
          return;
        }

        // For regular conversations, use the messaging API
        const params = new URLSearchParams({
          limit: limit.toString(),
          ...(before && { before }),
        });

        const api = useApiStore.getState();
        const response = await api.get(`/conversations/${conversationId}/messages?${params}`);
        
        set((state) => {
          const fetchedMessages = response.data.messages || [];
          
          if (before) {
            // Prepend older messages
            const existingMessages = state.messages[conversationId] || [];
            const newMessages = fetchedMessages.filter((msg: SocketMessage) => 
              !existingMessages.some((existing: SocketMessage) => existing.id === msg.id)
            );
            state.messages[conversationId] = [...newMessages, ...existingMessages];
          } else {
            // Replace with fresh messages
            state.messages[conversationId] = fetchedMessages;
          }
          
          state.isLoadingMessages = false;
        });
      } catch (error) {
        set((state) => {
          state.isLoadingMessages = false;
          state.error = error instanceof Error ? error.message : 'Failed to fetch messages';
        });
      }
    },

    sendMessage: (content: string, type = 'text' as const) => {
      const state = get();
      const { activeConversationId, activeConversation } = state;
      
      if (!activeConversationId || !activeConversation) {
        return null;
      }

      // 🚀 Professional User Info Retrieval - Get actual user details for optimistic message
      let currentUserName = 'You'; // Fallback
      let currentUserId = '';
      try {
        const { useAuthStore } = require('./auth');
        const authState = useAuthStore.getState();
        const currentUser = authState.user;
        if (currentUser) {
          currentUserName = currentUser.username || currentUser.fullName || 'You';
          currentUserId = currentUser.id;
        }
      } catch (error) {
        console.warn('⚠️ Could not get user info from auth store:', error);
      }

      // Get current user from auth store (this will be set by the UI component)
      const optimisticId = socketService.sendMessage({
        content,
        type,
        senderId: currentUserId, // Use actual user ID
        senderName: currentUserName, // Use actual user name
        senderAvatar: '',
        conversationId: activeConversationId,
        replyTo: state.replyingTo?.id,
      });

      // Create optimistic message for immediate UI update
      const optimisticMessage: SocketMessage = {
        id: optimisticId,
        content,
        type,
        senderId: currentUserId, // Use actual user ID
        senderName: currentUserName, // Use actual user name
        senderAvatar: '',
        conversationId: activeConversationId,
        timestamp: new Date().toISOString(),
        optimisticId,
        status: 'sending',
        replyTo: state.replyingTo?.id,
      };

      // Add optimistic message to state
      set((state) => {
        if (!state.messages[activeConversationId]) {
          state.messages[activeConversationId] = [];
        }
        state.messages[activeConversationId].push(optimisticMessage);
        
        // Update conversation last message
        const conversationIndex = state.conversations.findIndex((c: ChatConversation) => c.id === activeConversationId);
        if (conversationIndex >= 0) {
          state.conversations[conversationIndex].lastMessage = optimisticMessage;
        }

        // Clear reply state
        state.replyingTo = null;
      });

      // Cache the optimistic message immediately for persistence
      messageCache.addMessageToCache(activeConversationId, optimisticMessage);

      return optimisticId;
    },

    sendMessageToConversation: (conversationId: string, content: string, type = 'text' as const) => {
      console.log('📤 [Chat Store] sendMessageToConversation called:', {
        conversationId,
        content: content.substring(0, 100),
        type,
        timestamp: new Date().toISOString()
      });

      if (!conversationId || !content.trim()) {
        console.error('❌ [Chat Store] Invalid parameters for sendMessageToConversation');
        return null;
      }

      // Get current user info for optimistic message from auth store
      const currentUserId = socketService.getCurrentUserId();
      
      // 🚀 Professional User Info Retrieval - Get actual user details
      let currentUserName = 'You'; // Fallback
      try {
        // Access auth store to get current user information (sync import)
        const { useAuthStore } = require('./auth');
        const authState = useAuthStore.getState();
        const currentUser = authState.user;
        if (currentUser) {
          currentUserName = currentUser.username || currentUser.fullName || 'You';
        }
      } catch (error) {
        console.warn('⚠️ Could not get user info from auth store:', error);
      }

      console.log('👤 [Chat Store] Current user info for optimistic message:', {
        userId: currentUserId,
        userName: currentUserName
      });

      // Send message directly to the specified conversation
      const optimisticId = socketService.sendMessage({
        content,
        type,
        senderId: currentUserId, // Use current user ID
        senderName: currentUserName, // Use current user name
        senderAvatar: '',
        conversationId,
        replyTo: undefined, // No reply support for direct conversation messages
      });

      console.log('🚀 [Chat Store] Message sent to socket service, optimisticId:', optimisticId);

      // Create optimistic message for immediate UI update with correct sender info
      const optimisticMessage: SocketMessage = {
        id: optimisticId,
        content,
        type,
        senderId: currentUserId, // ✅ Set correct sender ID to prevent UI glitch!
        senderName: currentUserName,
        senderAvatar: '',
        conversationId,
        timestamp: new Date().toISOString(),
        optimisticId,
        status: 'sending',
      };

      console.log('⚡ [Chat Store] Created optimistic message with correct sender:', {
        messageId: optimisticMessage.id,
        senderId: optimisticMessage.senderId,
        senderName: optimisticMessage.senderName,
        content: optimisticMessage.content.substring(0, 50)
      });

      // Add optimistic message to state
      set((state) => {
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        state.messages[conversationId].push(optimisticMessage);
        
        // Update conversation last message if it exists
        const conversationIndex = state.conversations.findIndex((c: ChatConversation) => c.id === conversationId);
        if (conversationIndex >= 0) {
          state.conversations[conversationIndex].lastMessage = optimisticMessage;
        }
      });

      // Cache the optimistic message immediately for persistence
      messageCache.addMessageToCache(conversationId, optimisticMessage);

      console.log('✅ [Chat Store] Optimistic message added to state and cached');
      return optimisticId;
    },

    resendMessage: (optimisticId: string) => {
      // Find and resend failed message
      const state = get();
      const { activeConversationId } = state;
      
      if (!activeConversationId) return;
      
      const messages = state.messages[activeConversationId] || [];
      const message = messages.find(m => m.optimisticId === optimisticId);
      
      if (message && message.status === 'failed') {
        socketService.sendMessage({
          content: message.content,
          type: message.type,
          senderId: message.senderId,
          senderName: message.senderName,
          conversationId: activeConversationId,
          replyTo: message.replyTo,
        });
      }
    },

    deleteMessage: async (messageId: string) => {
      try {
        const api = useApiStore.getState();
        await api.delete(`/messaging/messages/${messageId}`);
        
        set((state) => {
          Object.keys(state.messages).forEach(conversationId => {
            const messageIndex = state.messages[conversationId].findIndex((m: SocketMessage) => m.id === messageId);
            if (messageIndex >= 0) {
              state.messages[conversationId].splice(messageIndex, 1);
            }
          });
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete message';
        });
      }
    },

    editMessage: async (messageId: string, newContent: string) => {
      try {
        const api = useApiStore.getState();
        const response = await api.patch(`/messaging/messages/${messageId}`, {
          content: newContent,
        });
        
        const updatedMessage = response.data.message;
        set((state) => {
          Object.keys(state.messages).forEach(conversationId => {
            const messageIndex = state.messages[conversationId].findIndex((m: SocketMessage) => m.id === messageId);
            if (messageIndex >= 0) {
              state.messages[conversationId][messageIndex] = updatedMessage;
            }
          });
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to edit message';
        });
      }
    },

    markAsRead: (conversationId: string, messageIds: string[]) => {
      socketService.markAsRead(conversationId, messageIds);
      
      set((state) => {
        // Update local state
        const conversation = state.conversations.find((c: ChatConversation) => c.id === conversationId);
        if (conversation) {
          conversation.unreadCount = Math.max(0, conversation.unreadCount - messageIds.length);
        }
      });
    },

    // Typing actions
    startTyping: () => {
      const { activeConversationId } = get();
      if (activeConversationId) {
        socketService.startTyping(activeConversationId);
      }
    },

    stopTyping: () => {
      const { activeConversationId } = get();
      if (activeConversationId) {
        socketService.stopTyping(activeConversationId);
      }
    },

    // UI actions
    setInputFocused: (focused: boolean) => {
      set((state) => {
        state.isInputFocused = focused;
      });
    },

    setReplyingTo: (message: SocketMessage | null) => {
      set((state) => {
        state.replyingTo = message;
      });
    },

    toggleMessageSelection: (messageId: string) => {
      set((state) => {
        const index = state.selectedMessages.indexOf(messageId);
        if (index >= 0) {
          state.selectedMessages.splice(index, 1);
        } else {
          state.selectedMessages.push(messageId);
        }
      });
    },

    clearSelectedMessages: () => {
      set((state) => {
        state.selectedMessages = [];
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    refreshConnectionStatus: () => {
      // Get socket service connection status
      const socketStatus = socketService.getConnectionStatus();
      const currentStatus = get().getConnectionStatus();
      console.log('[Chat Store] Refreshing connection status - Socket status:', socketStatus, 'Current status:', currentStatus);
      
      set((state) => {
        state.connectionStatus = {
          connected: socketStatus.connected,
          connecting: socketStatus.connecting || state.isConnecting,
          reconnectAttempts: socketStatus.reconnectAttempts,
        };
      });
    },

    // Space integration helpers
    syncSpaceMessages: async (spaceId: string, spaceMessages: any[]) => {
      const conversationId = `space-${spaceId}`;
      console.log('🔄 [Professional Cache] Syncing space messages:', {
        spaceId,
        conversationId,
        incomingMessageCount: spaceMessages.length,
      });

      // Convert incoming space messages to the standard chat message format
      const incomingChatMessages: SocketMessage[] = spaceMessages.map((msg, index) => ({
        id: msg.id || `space_msg_${index}`,
        content: msg.content || msg.message || '',
        type: 'text' as const,
        senderId: msg.senderId || msg.author?.id || msg.sender?.id || '',
        senderName: msg.senderName || msg.author?.username || msg.sender?.username || 'Anonymous',
        senderAvatar: msg.senderAvatar || msg.author?.avatarUrl || msg.sender?.avatarUrl,
        conversationId,
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        status: 'delivered' as const,
      }));

      // Use smart merge to prevent overwriting newer messages
      await messageCache.mergeConversationMessages(conversationId, incomingChatMessages);

      // Update in-memory state by loading from cache
      // This ensures UI consistency and prevents race conditions
      const cachedMessages = await messageCache.getConversationMessages(conversationId);
      
      set((state) => {
        state.messages[conversationId] = cachedMessages;
        console.log('✅ [Professional Cache] Messages synced and cached using smart merge:', {
          finalMessageCount: cachedMessages.length,
          conversationId
        });
      });
    },

    clearSpaceChatState: async (spaceId: string) => {
      const conversationId = `space-${spaceId}`;
      console.log('🧹 [Professional Cache] Clearing chat state for space:', { spaceId, conversationId });
      
      // Clear from secure cache
      await messageCache.clearConversationCache(conversationId);
      
      set((state) => {
        // Remove from in-memory state
        if (state.messages[conversationId]) {
          delete state.messages[conversationId];
        }
        
        // If this conversation was active, deactivate it
        if (state.activeConversationId === conversationId) {
          state.activeConversationId = null;
          state.activeConversation = null;
        }

        // Remove the conversation entry itself
        const convoIndex = state.conversations.findIndex(c => c.id === conversationId);
        if (convoIndex > -1) {
          state.conversations.splice(convoIndex, 1);
        }
      });
      
      console.log('✅ [Professional Cache] Space chat state cleared successfully');
    },

    // Load messages from cache when entering a conversation
    loadMessagesFromCache: async (conversationId: string) => {
      console.log('📱 [Professional Cache] Loading messages from cache:', conversationId);
      
      try {
        const cachedMessages = await messageCache.getConversationMessages(conversationId);
        
        set((state) => {
          state.messages[conversationId] = cachedMessages;
        });
        
        console.log('✅ [Professional Cache] Messages loaded from cache:', {
          conversationId,
          messageCount: cachedMessages.length
        });
        
        return cachedMessages;
      } catch (error) {
        console.error('❌ [Professional Cache] Error loading messages from cache:', error);
        return [];
      }
    },

    // 🚀 Professional Message Retry System - Handle DB save delays and failures
    retryFailedMessages: async (conversationId?: string) => {
      const state = get();
      console.log('🔄 [Professional Retry] Starting failed message retry process');
      
      // Get conversations to check for failed messages
      const conversationsToCheck = conversationId 
        ? [conversationId] 
        : Object.keys(state.messages);
      
      let retriedCount = 0;
      
      for (const convoId of conversationsToCheck) {
        const messages = state.messages[convoId] || [];
        const failedMessages = messages.filter(msg => msg.status === 'failed' || msg.status === 'sending');
        
        for (const failedMessage of failedMessages) {
          try {
            console.log('🔄 [Professional Retry] Retrying message:', failedMessage.id);
            
            // Resend the message
            const newOptimisticId = socketService.sendMessage({
              content: failedMessage.content,
              type: failedMessage.type,
              senderId: failedMessage.senderId,
              senderName: failedMessage.senderName,
              senderAvatar: failedMessage.senderAvatar,
              conversationId: convoId,
              replyTo: failedMessage.replyTo,
            });
            
            // Update the message status to sending
            set((state) => {
              const msgIndex = state.messages[convoId].findIndex(m => m.id === failedMessage.id);
              if (msgIndex !== -1) {
                state.messages[convoId][msgIndex].status = 'sending';
                state.messages[convoId][msgIndex].id = newOptimisticId; // Update with new optimistic ID
              }
            });
            
            retriedCount++;
            
          } catch (error) {
            console.error('❌ [Professional Retry] Failed to retry message:', error);
          }
        }
      }
      
      console.log(`✅ [Professional Retry] Completed retry process. Retried ${retriedCount} messages.`);
      return retriedCount;
    },

    // Professional message status checker for DB save delays
    checkMessageStatus: async (conversationId: string, messageId: string) => {
      console.log('🔍 [Professional Status Check] Checking message status:', messageId);
      // This could make an API call to check if message was saved to DB
      // For now, we'll rely on WebSocket confirmations
      return 'unknown';
    },
  }))
);

// Hook for easier usage
export const useChat = () => {
  const store = useChatStore();
  return store;
};
