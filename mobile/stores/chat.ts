import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { socketService, SocketMessage, TypingIndicator, ConnectionStatus } from './socket';
import { useApiStore } from './api';
import { useAuth } from './auth';
import { messageCache } from './messageCache';
import { sqliteMessageCache } from './sqliteMessageCache'; // ✅ CRITICAL FIX: Enhanced SQLite caching

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
  sendMessageToConversation: (messageData: {
    conversationId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
    senderId: string;
    senderName: string;
    senderAvatar?: string;
  }) => string | null;
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
  forceUpdateActiveConversation: (conversationId: string) => void; // ✅ NEW: Force conversation update
  forceClearChatData: () => void; // ✅ NEW: Force clear all chat data for clean switches
  
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
        
          set((state) => {
            state.connectionStatus.connected = true;
            state.connectionStatus.connecting = false;
            state.isConnecting = false;
            state.connectionStatus.lastConnected = data.timestamp;
          });
        },
        onConnectError: (error) => {
          set((state) => {
            state.connectionStatus.connected = false;
            state.connectionStatus.connecting = false;
            state.isConnecting = false;
            state.error = error.message || 'Connection failed';
          });
        },
        onDisconnect: (reason) => {
          set((state) => {
            state.connectionStatus.connected = false;
            state.connectionStatus.connecting = false;
            state.isConnecting = false;
          });
        },
        onMessage: (message: SocketMessage) => {
          console.log('📨 [ChatStore] Received message:', { 
            id: message.id, 
            senderId: message.senderId, 
            senderName: message.senderName,
            content: message.content?.substring(0, 50) 
          });
          
          // ✅ CRITICAL FIX: Enhanced message processing with proper user data and fallbacks
          const enhancedMessage: SocketMessage = {
            ...message,
            // Ensure senderName is never empty - use multiple fallbacks
            senderName: message.senderName || 
                       (message.sender?.username) || 
                       (message.sender?.fullName) || 
                       (message.sender?.displayName) ||
                       `User ${message.senderId?.substring(0, 8)}` || 
                       'Anonymous User',
            // ✅ CRITICAL FIX: Ensure timestamp is valid
            timestamp: message.timestamp || new Date().toISOString()
          };
          
          set((state) => {
            const { conversationId } = enhancedMessage;
            if (!state.messages[conversationId]) {
              state.messages[conversationId] = [];
            }
            
            // ✅ PROFESSIONAL DEDUPLICATION: Check for both server ID and optimistic ID
            const existingMessage = state.messages[conversationId].find(m => 
              m.id === enhancedMessage.id || 
              (m.optimisticId && m.optimisticId === enhancedMessage.optimisticId) ||
              (enhancedMessage.optimisticId && m.id === enhancedMessage.optimisticId)
            );
            
            if (!existingMessage) {
              state.messages[conversationId].push(enhancedMessage);
              console.log('✅ [ChatStore] Added new message to state');
            } else {
              // ✅ PROFESSIONAL UPDATE: Replace optimistic message with server message
              const msgIndex = state.messages[conversationId].findIndex(m => 
                m.id === enhancedMessage.id || 
                m.optimisticId === enhancedMessage.optimisticId ||
                (enhancedMessage.optimisticId && m.id === enhancedMessage.optimisticId)
              );
              if (msgIndex !== -1) {
                state.messages[conversationId][msgIndex] = enhancedMessage;
                console.log('🔄 [ChatStore] Updated existing message with server data');
              } else {
                console.log('⚠️ [ChatStore] Duplicate message ignored');
              }
            }
          });
          
          // Cache the enhanced message immediately for persistence
          messageCache.addMessageToCache(enhancedMessage.conversationId, enhancedMessage);
          
          // ✅ CRITICAL FIX: Also cache in SQLite for instant access
          sqliteMessageCache.addOptimisticMessage(enhancedMessage).catch(error => {
            console.error('Failed to cache message in SQLite:', error);
          });
        },
        onMessageSent: (data: { optimisticId: string; message: any; success: boolean }) => {
        
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
        // ✅ CRITICAL FIX: Enhanced typing indicator handler
        onTyping: (data: TypingIndicator, isTyping: boolean) => {
          console.log('👀 [ChatStore] Typing indicator:', { 
            userId: data.userId, 
            userName: data.userName, 
            isTyping, 
            conversationId: data.conversationId 
          });
          
          set((state) => {
            const { conversationId } = data;
            if (!state.typingUsers[conversationId]) {
              state.typingUsers[conversationId] = [];
            }
            
            if (isTyping) {
              // Add user to typing list if not already there
              const existingIndex = state.typingUsers[conversationId].findIndex(u => u.userId === data.userId);
              if (existingIndex === -1) {
                state.typingUsers[conversationId].push(data);
                console.log(`✅ [ChatStore] Added ${data.userName} to typing list`);
              }
            } else {
              // Remove user from typing list
              state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
                u => u.userId !== data.userId
              );
              console.log(`✅ [ChatStore] Removed ${data.userName} from typing list`);
            }
          });
        },
        // Add other handlers as needed (status, etc.)
      });

      try {
        await socketService.connect(userId);
       
      } catch (error) {
       
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
        const response = await api.get('/conversations');
        set((state) => {
          state.conversations = response.data.data?.conversations || [];
        });
      } catch (error) {
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
        // ✅ CRITICAL FIX: Don't clear messages here - let cache loading handle it
        // This prevents race conditions and preserves instant loading
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
      });

      // Join conversation room
      socketService.joinConversation(conversationId);
      
      // ✅ CRITICAL FIX: Don't auto-fetch if cache loading is being handled elsewhere
      // This prevents duplicate network requests and delays
      
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
        
        // Use the space-specific endpoint for space chat
        const response = await api.post(`/communities/${communityId}/spaces/${spaceId}/chat/conversation`, {
          spaceName,
        });
        
        
        const conversationId = response.data.conversationId || response.data.data?.conversationId;
        
        // Store space to conversation mapping
        set((state) => {
          state.spaceConversations[spaceId] = conversationId;
        });
        
        return conversationId;
      } catch (error) {
      
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create conversation';
        });
        throw error;
      }
    },

    createDirectConversation: async (participantId: string): Promise<string> => {
      try {
        const api = useApiStore.getState();
        const response = await api.post('/conversations', {
          type: 'DIRECT',
          participantIds: [participantId],
        });
        
       
        const conversation = response.data.conversation;
        set((state) => {
          state.conversations.unshift(conversation);
        });
        
        return conversation.id;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create direct conversation';
        });
        throw error;
      }
    },

    createGroupConversation: async (participantIds: string[], name: string): Promise<string> => {
      try {
        const api = useApiStore.getState();
        const response = await api.post('/conversations', {
          type: 'GROUP',
          participantIds,
          name,
        });
        

        const conversation = response.data.conversation;
        set((state) => {
          state.conversations.unshift(conversation);
        });
        
        return conversation.id;
      } catch (error) {
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
        socketService.joinConversation(conversationId);
      }
      
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
      
      // ✅ CRITICAL FIX: Cache in SQLite for instant loading
      sqliteMessageCache.addOptimisticMessage(optimisticMessage).catch(error => {
        console.error('Failed to cache optimistic message in SQLite:', error);
      });

      return optimisticId;
    },

    sendMessageToConversation: (messageData: {
      conversationId: string;
      content: string;
      type?: 'text' | 'image' | 'file';
      senderId: string;
      senderName: string;
      senderAvatar?: string;
    }) => {
      const { conversationId, content, type = 'text', senderId, senderName, senderAvatar } = messageData;

      if (!conversationId || !content.trim()) {
        return null;
      }

      // ✅ CRITICAL FIX: Use provided user information instead of fetching
      const optimisticId = `optimistic_${Date.now()}_${Math.random()}`;

      // Send message with complete user context
      socketService.sendMessage({
        content,
        type,
        senderId, // Use provided sender ID
        senderName, // Use provided sender name
        senderAvatar: senderAvatar || '',
        conversationId,
        replyTo: undefined,
      });

      // Create optimistic message with correct sender info for immediate UI update
      const now = new Date();
      const optimisticMessage: SocketMessage = {
        id: optimisticId,
        content,
        type,
        senderId, // ✅ Use provided sender ID to prevent anonymity
        senderName, // ✅ Use provided sender name 
        senderAvatar: senderAvatar || '',
        conversationId,
        timestamp: now.toISOString(), // ✅ CRITICAL FIX: Ensure proper timestamp format
        optimisticId,
        status: 'sending',
        // ✅ Additional fields that might be expected by SQLite
        replyTo: undefined,
        edited: false,
        editedAt: undefined
      };

    

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
      
      // ✅ CRITICAL FIX: Cache in SQLite for instant loading
      sqliteMessageCache.addOptimisticMessage(optimisticMessage).catch(error => {
        console.error('Failed to cache optimistic message in SQLite:', error);
      });

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
      set((state) => {
        state.connectionStatus = {
          connected: socketStatus.connected,
          connecting: socketStatus.connecting || state.isConnecting,
          reconnectAttempts: socketStatus.reconnectAttempts,
        };
      });
    },

    // ✅ CRITICAL FIX: Force active conversation update to fix conversation ID persistence
    forceUpdateActiveConversation: (conversationId: string) => {
      console.log(`🔄 [ChatStore] Force updating active conversation to: ${conversationId}`);
      const conversation = get().conversations.find(c => c.id === conversationId);
      set((state) => {
        state.activeConversationId = conversationId;
        state.activeConversation = conversation || null;
        // Initialize messages array if it doesn't exist
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
      });
      
      // Join conversation room
      socketService.joinConversation(conversationId);
      console.log(`✅ [ChatStore] Active conversation forcefully updated to: ${conversationId}`);
    },

    // ✅ CRITICAL FIX: Force clear all chat data for clean interaction type switches
    forceClearChatData: () => {
      console.log('🧹 [ChatStore] Force clearing all chat data for clean switch');
      set((state) => {
        // ✅ INSTANT CLEAR: Professional approach - clear UI immediately
        state.messages = {};
        state.activeConversationId = null;
        state.activeConversation = null;
        state.typingUsers = {};
        state.selectedMessages = [];
        state.replyingTo = null;
        state.isLoadingMessages = false; // Clear loading states
        state.error = null; // Clear errors
      });
    },

  // Space integration helpers
  syncSpaceMessages: async (spaceId: string, spaceMessages: any[]) => {
    const conversationId = `space-${spaceId}`;
    
    console.log(`🔄 [ChatStore] Syncing ${spaceMessages.length} messages for space ${spaceId}`);
    console.log(`🎯 [ChatStore] Target conversation ID: ${conversationId}`);
    console.log(`📊 [ChatStore] Current active conversation: ${get().activeConversationId}`);
    
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

    try {
      // ✅ PROFESSIONAL APPROACH: Sync to cache first (background operation)
      await sqliteMessageCache.batchSyncMessages(conversationId, incomingChatMessages);
      
      // ✅ CRITICAL FIX: Only update UI state if this conversation is currently active
      // This prevents stale data contamination from background syncing
      const currentState = get();
      if (currentState.activeConversationId === conversationId) {
        // Load fresh data from cache (this ensures consistency)
        const { messages: cachedMessages } = await sqliteMessageCache.getMessages(conversationId, 100);
        
        set((state) => {
          // ✅ PROFESSIONAL DEDUPLICATION: Replace entire message array
          state.messages[conversationId] = cachedMessages;
        });
        console.log(`✅ [ChatStore] Updated ACTIVE conversation ${conversationId} with ${cachedMessages.length} messages from sync`);
      } else {
        // ✅ BACKGROUND SYNC: Don't update UI for inactive conversations
        console.log(`📦 [ChatStore] Background synced ${incomingChatMessages.length} messages for INACTIVE conversation ${conversationId} (active: ${currentState.activeConversationId})`);
      }
      
      // Also update legacy cache for backward compatibility
      await messageCache.mergeConversationMessages(conversationId, incomingChatMessages);
      
    } catch (error) {
      console.error('❌ [ChatStore] Failed to sync via SQLite cache:', error);
      
      // Fallback to legacy cache
      await messageCache.mergeConversationMessages(conversationId, incomingChatMessages);
      
      // Only update UI if conversation is active
      const currentState = get();
      if (currentState.activeConversationId === conversationId) {
        const cachedMessages = await messageCache.getConversationMessages(conversationId);
        set((state) => {
          state.messages[conversationId] = cachedMessages;
        });
      }
    }
  },    clearSpaceChatState: async (spaceId: string) => {
      const conversationId = `space-${spaceId}`;
      
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
      
     
    },

  // Load messages from cache when entering a conversation
  loadMessagesFromCache: async (conversationId: string) => {
    try {
      console.log(`🔄 [ChatStore] Loading messages from cache for ${conversationId}`);
      
      // ✅ CRITICAL FIX: Validate conversation ID and ensure proper state isolation
      if (!conversationId || conversationId === 'undefined') {
        console.error(`❌ [ChatStore] Invalid conversation ID: ${conversationId}`);
        return [];
      }
      
      // ✅ CRITICAL OPTIMIZATION: Skip cache if database not ready to avoid delays
      if (!sqliteMessageCache.isDatabaseReady()) {
        console.log(`⚠️ [ChatStore] Database not ready, skipping cache load for ${conversationId}`);
        return [];
      }
      
      // ✅ CRITICAL FIX: Check if conversation is still active before starting
      const currentState = get();
      if (currentState.activeConversationId !== conversationId) {
        console.log(`🚫 [ChatStore] Conversation changed during load, aborting: ${currentState.activeConversationId} !== ${conversationId}`);
        return [];
      }
      
      // ✅ CRITICAL FIX: Load from cache FIRST, then update state atomically
      const cacheStart = Date.now();
      const { messages: sqliteMessages } = await sqliteMessageCache.getMessages(conversationId, 100);
      const cacheTime = Date.now() - cacheStart;
      
      if (sqliteMessages.length > 0) {
        console.log(`⚡ [ChatStore] Loaded ${sqliteMessages.length} messages from SQLite cache in ${cacheTime}ms`);
        
        // ✅ CRITICAL FIX: Double-check conversation is still active after async operation
        const finalState = get();
        if (finalState.activeConversationId === conversationId) {
          set((state) => {
            // ✅ PROFESSIONAL DEDUPLICATION: Clear existing messages first to prevent duplicates
            state.messages[conversationId] = sqliteMessages;
          });
          console.log(`✅ [ChatStore] Updated active conversation ${conversationId} with ${sqliteMessages.length} messages`);
        } else {
          console.log(`⚠️ [ChatStore] Skipped update - conversation changed: ${finalState.activeConversationId} !== ${conversationId}`);
        }
        
        return sqliteMessages;
      }
      
      // Fallback to legacy cache if SQLite cache is empty
      console.log(`📁 [ChatStore] SQLite cache empty, falling back to legacy cache`);
      const legacyCachedMessages = await messageCache.getConversationMessages(conversationId);
      
      if (legacyCachedMessages.length > 0) {
        // Check active conversation again before updating
        const finalState = get();
        if (finalState.activeConversationId === conversationId) {
          set((state) => {
            state.messages[conversationId] = legacyCachedMessages;
          });
          console.log(`✅ [ChatStore] Loaded ${legacyCachedMessages.length} legacy messages`);
          
          // Migrate to SQLite in background
          sqliteMessageCache.batchSyncMessages(conversationId, legacyCachedMessages).catch(console.error);
        }
        
        return legacyCachedMessages;
      }
      
      // ✅ CRITICAL FIX: Only clear messages if no cache is found AND conversation is still active
      const finalState = get();
      if (finalState.activeConversationId === conversationId) {
        console.log(`📭 [ChatStore] No cached messages found for ${conversationId}, clearing state`);
        set((state) => {
          state.messages[conversationId] = [];
        });
      }
      return [];
      
    } catch (error) {
      console.error(`❌ [ChatStore] Failed to load messages from cache for ${conversationId}:`, error);
      // Clear on error only if conversation is still active
      const finalState = get();
      if (finalState.activeConversationId === conversationId) {
        set((state) => {
          state.messages[conversationId] = [];
        });
      }
      return [];
    }
  },

  // 🚀 Professional Message Retry System - Handle DB save delays and failures
  retryFailedMessages: async (conversationId?: string) => {
      const state = get();
      
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
        
          }
        }
      }
      
      return retriedCount;
    },

    // Professional message status checker for DB save delays
    checkMessageStatus: async (conversationId: string, messageId: string) => {
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
