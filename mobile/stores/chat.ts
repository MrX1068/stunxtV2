import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { socketService, SocketMessage, TypingIndicator, ConnectionStatus } from './socket';
import { useApiStore } from './api';
import { useAuth } from './auth';

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
  syncSpaceMessages: (spaceId: string, spaceMessages: any[]) => void;
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

      try {
        // Setup socket event handlers
        socketService.setEventHandlers({
          onMessage: (message: SocketMessage) => {
            set((state) => {
              if (!state.messages[message.conversationId]) {
                state.messages[message.conversationId] = [];
              }
              
              // Check if message already exists (avoid duplicates)
              const existingIndex = state.messages[message.conversationId].findIndex(
                (m: SocketMessage) => m.id === message.id || m.optimisticId === message.optimisticId
              );
              
              if (existingIndex >= 0) {
                // Update existing message
                state.messages[message.conversationId][existingIndex] = message;
              } else {
                // Add new message
                state.messages[message.conversationId].push(message);
                // Sort by timestamp
                state.messages[message.conversationId].sort(
                  (a: SocketMessage, b: SocketMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
              }

              // Update conversation last message
              const conversationIndex = state.conversations.findIndex((c: ChatConversation) => c.id === message.conversationId);
              if (conversationIndex >= 0) {
                state.conversations[conversationIndex].lastMessage = message;
                if (message.senderId !== userId) {
                  state.conversations[conversationIndex].unreadCount += 1;
                }
              }
            });
          },

          onMessageStatus: (data: { messageId: string; status: string; userId: string }) => {
            set((state) => {
              // Update message status across all conversations
              Object.keys(state.messages).forEach(conversationId => {
                const messageIndex = state.messages[conversationId].findIndex(
                  (m: SocketMessage) => m.id === data.messageId || m.optimisticId === data.messageId
                );
                if (messageIndex >= 0) {
                  state.messages[conversationId][messageIndex].status = data.status as any;
                }
              });
            });
          },

          onTyping: (data: TypingIndicator, isTyping: boolean) => {
            set((state) => {
              if (!state.typingUsers[data.conversationId]) {
                state.typingUsers[data.conversationId] = [];
              }
              
              const typingList = state.typingUsers[data.conversationId];
              const existingIndex = typingList.findIndex((t: TypingIndicator) => t.userId === data.userId);
              
              if (isTyping) {
                if (existingIndex === -1) {
                  typingList.push(data);
                }
              } else {
                if (existingIndex >= 0) {
                  typingList.splice(existingIndex, 1);
                }
              }
            });
          },

          onUserStatus: (data: { userId: string; status: 'online' | 'offline' }) => {
            set((state) => {
              // Update user status in all conversations
              state.conversations.forEach((conversation: ChatConversation) => {
                const participantIndex = conversation.participants.findIndex((p: ChatParticipant) => p.id === data.userId);
                if (participantIndex >= 0) {
                  conversation.participants[participantIndex].status = data.status;
                  if (data.status === 'offline') {
                    conversation.participants[participantIndex].lastSeen = new Date().toISOString();
                  }
                }
              });
            });
          },

          onMessageSent: (data: { optimisticId: string; message: any; success: boolean }) => {
            console.log('✅ Message sent confirmation received:', data);
            set((state) => {
              // Find and update optimistic message with real data
              Object.keys(state.messages).forEach(conversationId => {
                const messageIndex = state.messages[conversationId].findIndex(
                  (m: SocketMessage) => m.optimisticId === data.optimisticId
                );
                if (messageIndex >= 0) {
                  // Replace optimistic message with real message data
                  state.messages[conversationId][messageIndex] = {
                    ...data.message,
                    status: 'sent' as const,
                  };
                }
              });
            });
          },

          onMessageError: (data: { optimisticId: string; error: string; success: boolean }) => {
            console.log('❌ Message send error received:', data);
            set((state) => {
              // Find and mark optimistic message as failed
              Object.keys(state.messages).forEach(conversationId => {
                const messageIndex = state.messages[conversationId].findIndex(
                  (m: SocketMessage) => m.optimisticId === data.optimisticId
                );
                if (messageIndex >= 0) {
                  state.messages[conversationId][messageIndex].status = 'failed';
                }
              });
              
              // Set error state
              state.error = `Failed to send message: ${data.error}`;
            });
          },
        });

        await socketService.connect(userId);
        
        console.log('🔄 WebSocket connection completed, updating state...');
        set((state) => {
          state.isConnecting = false;
          state.connectionStatus = socketService.getConnectionStatus();
        });
        
        console.log('✅ Chat store connection status updated:', socketService.getConnectionStatus());
        
        // Fetch conversations after connection
        get().fetchConversations();
        
      } catch (error) {
        set((state) => {
          state.isConnecting = false;
          state.error = error instanceof Error ? error.message : 'Connection failed';
          state.connectionStatus = socketService.getConnectionStatus();
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
        if (state.connectionStatus.connected !== status.connected) {
          console.log('🔄 Connection status changed:', { 
            from: state.connectionStatus.connected, 
            to: status.connected 
          });
          state.connectionStatus = status;
        }
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

      // Get current user from auth store (this will be set by the UI component)
      const optimisticId = socketService.sendMessage({
        content,
        type,
        senderId: '', // Will be set by WebSocket with JWT user ID
        senderName: '', // Will be set by backend
        senderAvatar: '',
        conversationId: activeConversationId,
        replyTo: state.replyingTo?.id,
      });

      // Create optimistic message for immediate UI update
      const optimisticMessage: SocketMessage = {
        id: optimisticId,
        content,
        type,
        senderId: '', // Will be populated when backend confirms
        senderName: 'You',
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
      // Note: This is a workaround for Zustand stores - ideally user info should be passed as parameter
      const currentUserId = socketService.getCurrentUserId(); // We'll add this method to socket service
      const currentUserName = 'You'; // Fallback name

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

      console.log('✅ [Chat Store] Optimistic message added to state');
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
    syncSpaceMessages: (spaceId: string, spaceMessages: any[]) => {
      const conversationId = `space-${spaceId}`;
      console.log('🔄 Syncing space messages:', { spaceId, conversationId, messageCount: spaceMessages.length });
      
      // Convert space messages to chat messages format
      const chatMessages: SocketMessage[] = spaceMessages.map((msg, index) => ({
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

      set((state) => {
        state.messages[conversationId] = chatMessages;
      });
      
      console.log('✅ Space messages synced to chat store:', chatMessages.length);
    },
  }))
);

// Hook for easier usage
export const useChat = () => {
  const store = useChatStore();
  return store;
};
