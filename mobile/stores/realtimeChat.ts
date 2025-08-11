import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { sqliteMessageCache } from './sqliteMessageCache';
import { useApiStore } from './api';

// Types based on backend message entity
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  optimisticId?: string;
  replyTo?: string;
  isEdited?: boolean;
  editedAt?: string;
  metadata?: Record<string, any>;
}

export interface TypingUser {
  userId: string;
  userName: string;
  timestamp: string;
}

export interface ConversationState {
  messages: ChatMessage[];
  typingUsers: TypingUser[];
  isLoading: boolean;
  hasMore: boolean;
  lastMessageId?: string;
  unreadCount: number;
  // Space context for space conversations
  spaceContext?: {
    spaceId: string;
    communityId: string;
    spaceName: string;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: string;
}

interface RealtimeChatState {
  // Connection state
  connectionStatus: ConnectionStatus;
  activeConversation: string | null;
  
  // Conversations data
  conversations: Record<string, ConversationState>;
  
  // WebSocket instance
  socket: any;
  
  // Actions
  connect: (userId: string) => Promise<void>;
  disconnect: () => void;
  
  // Conversation management
  joinConversation: (conversationId: string, spaceContext?: { spaceId: string; communityId: string; spaceName: string }) => Promise<void>;
  leaveConversation: (conversationId: string) => void;
  setActiveConversation: (conversationId: string) => void;
  
  // Message operations
  sendMessage: (params: {
    conversationId: string;
    content: string;
    type?: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
  }) => string; // Returns optimistic ID
  
  loadMessages: (conversationId: string, limit?: number, before?: string) => Promise<void>;
  loadCachedMessages: (conversationId: string) => Promise<void>;
  
  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  
  // Message status
  markMessagesRead: (conversationId: string, messageId: string) => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useRealtimeChatStore = create<RealtimeChatState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      connectionStatus: {
        connected: false,
        connecting: false,
      },
      activeConversation: null,
      conversations: {},
      socket: null,

      // Connection management
      connect: async (userId: string) => {
        const state = get();
        if (state.connectionStatus.connected || state.connectionStatus.connecting) {
          return;
        }

        set((draft) => {
          draft.connectionStatus.connecting = true;
          draft.connectionStatus.error = undefined;
        });

        try {
          console.log('🚀 [RealtimeChat] Connecting to messaging service...');
          
          // Connection will be handled by useSmartWebSocket hook
          set((draft) => {
            draft.connectionStatus.connected = true;
            draft.connectionStatus.connecting = false;
            draft.connectionStatus.lastConnected = new Date().toISOString();
          });

          console.log('✅ [RealtimeChat] Connected successfully');
        } catch (error) {
          console.error('❌ [RealtimeChat] Connection failed:', error);
          set((draft) => {
            draft.connectionStatus.connected = false;
            draft.connectionStatus.connecting = false;
            draft.connectionStatus.error = error instanceof Error ? error.message : 'Connection failed';
          });
          throw error;
        }
      },

      disconnect: () => {
        const state = get();
        if (state.socket) {
          state.socket.disconnect();
        }
        
        set((draft) => {
          draft.connectionStatus.connected = false;
          draft.connectionStatus.connecting = false;
          draft.socket = null;
          draft.activeConversation = null;
        });
        
        console.log('🔌 [RealtimeChat] Disconnected');
      },

      // Conversation management
      joinConversation: async (conversationId: string, spaceContext?: { spaceId: string; communityId: string; spaceName: string }) => {
        const state = get();

        // Initialize conversation state if not exists
        if (!state.conversations[conversationId]) {
          set((draft) => {
            draft.conversations[conversationId] = {
              messages: [],
              typingUsers: [],
              isLoading: false,
              hasMore: true,
              unreadCount: 0,
              spaceContext, // Store space context for space conversations
            };
          });
        } else if (spaceContext && !state.conversations[conversationId].spaceContext) {
          // Update existing conversation with space context if not already set
          set((draft) => {
            draft.conversations[conversationId].spaceContext = spaceContext;
          });
        }

        // Load cached messages first for instant UI
        await get().loadCachedMessages(conversationId);

        console.log(`✅ [RealtimeChat] Joined conversation: ${conversationId}${spaceContext ? ` (space: ${spaceContext.spaceName})` : ''}`);
      },

      leaveConversation: (conversationId: string) => {
        // Stop typing if user was typing
        get().stopTyping(conversationId);
        
        console.log(`👋 [RealtimeChat] Left conversation: ${conversationId}`);
      },

      setActiveConversation: (conversationId: string) => {
        const currentState = get();
        if (currentState.activeConversation !== conversationId) {
          set((draft) => {
            draft.activeConversation = conversationId;
          });
        }
      },

      // Message operations
      sendMessage: ({ conversationId, content, type = 'text', senderId, senderName, senderAvatar }) => {
        const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const timestamp = new Date().toISOString();

        // Create optimistic message
        const optimisticMessage: ChatMessage = {
          id: optimisticId,
          conversationId,
          senderId,
          senderName,
          senderAvatar,
          type: type as any,
          content,
          status: 'pending',
          timestamp,
          optimisticId,
        };

        // Add to store immediately for optimistic UI
        set((draft) => {
          if (!draft.conversations[conversationId]) {
            draft.conversations[conversationId] = {
              messages: [],
              typingUsers: [],
              isLoading: false,
              hasMore: true,
              unreadCount: 0,
            };
          }
          draft.conversations[conversationId].messages.push(optimisticMessage);
        });

        // Cache optimistic message (convert to SocketMessage format)
        const socketMessage = {
          ...optimisticMessage,
          type: optimisticMessage.type === 'video' || optimisticMessage.type === 'audio' ? 'file' : optimisticMessage.type
        } as any;
        sqliteMessageCache.addOptimisticMessage(socketMessage);

        console.log(`📤 [RealtimeChat] Sent optimistic message: ${optimisticId}`);
        return optimisticId;
      },

      loadMessages: async (conversationId: string, limit = 50, before?: string) => {
        set((draft) => {
          if (!draft.conversations[conversationId]) {
            draft.conversations[conversationId] = {
              messages: [],
              typingUsers: [],
              isLoading: false,
              hasMore: true,
              unreadCount: 0,
            };
          }
          draft.conversations[conversationId].isLoading = true;
        });

        try {
          // Use WebSocket-based message loading for faster performance
          const { realtimeChatService } = await import('../services/realtimeChatService');

          const result = await realtimeChatService.fetchMessages({
            conversationId,
            limit,
            before,
          });

          console.log(`✅ [RealtimeChat] Loaded ${result.messages.length} messages via WebSocket for ${conversationId}`);

          // Messages are automatically handled by the service's event handlers
          // No need to manually update the store here

        } catch (error) {
          console.error(`❌ [RealtimeChat] Failed to load messages via WebSocket:`, error);

          // Fallback to REST API if WebSocket fails
          try {
            console.log(`🔄 [RealtimeChat] WebSocket failed, falling back to REST API for ${conversationId}`);

            const apiStore = useApiStore.getState();

            // Check if this is a space conversation
            const isSpaceConversation = conversationId.startsWith('space-');

            if (isSpaceConversation) {
              // Get space context from stored conversation data
              const currentState = get();
              const conversation = currentState.conversations[conversationId];

              if (!conversation?.spaceContext) {
                // Fallback: Extract spaceId from conversationId (format: space-{spaceId})
                const spaceId = conversationId.replace('space-', '');
                console.error(`❌ [RealtimeChat] Space context missing for ${conversationId}. Available conversations:`, Object.keys(currentState.conversations));
                throw new Error(`Space context not found for conversation ${conversationId}. Please ensure the space conversation is properly initialized with spaceId: ${spaceId} and communityId. This usually happens when the space chat is not properly joined via useSpaceChat hook.`);
              }

              const { spaceId, communityId, spaceName } = conversation.spaceContext;

              // Use the correct space content endpoint for messages
              const params = new URLSearchParams({
                type: 'messages',
                limit: limit.toString(),
                ...(before && { before }),
              });

              console.log(`📥 [RealtimeChat] Using space content endpoint: /communities/${communityId}/spaces/${spaceId}/content?${params}`);
              console.log(`🔧 [RealtimeChat] Space context found - spaceId: ${spaceId}, communityId: ${communityId}`);

              const response = await apiStore.get<{
                success: boolean;
                data: {
                  posts: any[];
                  total: number;
                  hasMore: boolean;
                };
                message: string;
              }>(`/communities/${communityId}/spaces/${spaceId}/content?${params}`);

              if (response.success && response.data) {
                // Transform space content (messages) to chat message format
                const spaceMessages = response.data.posts || [];
                const messages: ChatMessage[] = spaceMessages.map((msg: any) => ({
                  id: msg.id,
                  conversationId: conversationId,
                  senderId: msg.authorId || msg.author?.id,
                  senderName: msg.author?.fullName || msg.author?.username || 'Unknown',
                  senderAvatar: msg.author?.avatar,
                  content: msg.content,
                  type: msg.type || 'text',
                  timestamp: msg.createdAt,
                  status: 'sent',
                  metadata: {
                    isSpaceMessage: true,
                    spaceId: spaceId,
                    communityId: communityId,
                    ...msg.metadata
                  }
                }));

                // Update store with messages
                set((draft) => {
                  if (!draft.conversations[conversationId]) {
                    draft.conversations[conversationId] = {
                      messages: [],
                      typingUsers: [],
                      isLoading: false,
                      hasMore: true,
                      unreadCount: 0,
                    };
                  }

                  // For initial load (no before), replace messages
                  // For pagination (with before), prepend messages
                  if (!before) {
                    draft.conversations[conversationId].messages = messages;
                  } else {
                    draft.conversations[conversationId].messages = [
                      ...messages,
                      ...draft.conversations[conversationId].messages
                    ];
                  }

                  draft.conversations[conversationId].hasMore = response.data.hasMore;
                  draft.conversations[conversationId].isLoading = false;
                });

                console.log(`✅ [RealtimeChat] Successfully loaded ${messages.length} space messages via REST API fallback for ${conversationId}`);
              }
            } else {
              // For non-space conversations, use the original endpoint
              const params = new URLSearchParams({
                limit: limit.toString(),
                ...(before && { before }),
              });

              const response = await apiStore.get(`/conversations/${conversationId}/messages?${params}`);

            if (response.success && response.data) {
              const messages: ChatMessage[] = response.data.messages.map((msg: any) => ({
                id: msg.id,
                conversationId: msg.conversationId,
                senderId: msg.senderId,
                senderName: msg.sender?.username || msg.sender?.fullName || 'User',
                senderAvatar: msg.sender?.avatarUrl,
                type: msg.type,
                content: msg.content,
                status: msg.status,
                timestamp: msg.createdAt,
                isEdited: msg.isEdited,
                editedAt: msg.editedAt,
                metadata: msg.metadata,
              }));

              // Cache messages using batch sync
              const socketMessages = messages.map(msg => ({
                ...msg,
                type: msg.type === 'video' || msg.type === 'audio' ? 'file' : msg.type
              })) as any[];
              await sqliteMessageCache.batchSyncMessages(conversationId, socketMessages);

              set((draft) => {
                const conversation = draft.conversations[conversationId];
                if (before) {
                  // Prepend older messages
                  conversation.messages = [...messages, ...conversation.messages];
                } else {
                  // Replace with fresh messages
                  conversation.messages = messages;
                }
                conversation.hasMore = messages.length === limit;
                conversation.isLoading = false;
                conversation.lastMessageId = messages[messages.length - 1]?.id;
              });

              console.log(`✅ [RealtimeChat] Successfully loaded ${messages.length} messages via REST API fallback for ${conversationId}`);
            }
            } // Close the else block for non-space conversations
          } catch (fallbackError) {
            console.error(`❌ [RealtimeChat] REST API fallback also failed:`, fallbackError);
            set((draft) => {
              draft.conversations[conversationId].isLoading = false;
            });
          }
        }
      },

      loadCachedMessages: async (conversationId: string) => {
        try {
          const cachedResult = await sqliteMessageCache.getMessages(conversationId, 50);
          const cachedMessages = cachedResult.messages;

          if (cachedMessages.length > 0) {
            // Convert SocketMessage to ChatMessage
            const chatMessages: ChatMessage[] = cachedMessages.map(msg => ({
              id: msg.id,
              conversationId: msg.conversationId,
              senderId: msg.senderId,
              senderName: msg.senderName,
              senderAvatar: msg.senderAvatar,
              type: msg.type as any,
              content: msg.content,
              status: msg.status as any,
              timestamp: msg.timestamp,
              optimisticId: msg.optimisticId,
              replyTo: msg.replyTo,
              isEdited: msg.edited,
              editedAt: msg.editedAt,
            }));

            set((draft) => {
              if (!draft.conversations[conversationId]) {
                draft.conversations[conversationId] = {
                  messages: [],
                  typingUsers: [],
                  isLoading: false,
                  hasMore: true,
                  unreadCount: 0,
                };
              }
              draft.conversations[conversationId].messages = chatMessages;
            });

            console.log(`💾 [RealtimeChat] Loaded ${chatMessages.length} cached messages for ${conversationId}`);
          }
        } catch (error) {
          console.error(`❌ [RealtimeChat] Failed to load cached messages:`, error);
        }
      },

      // Typing indicators
      startTyping: (conversationId: string) => {
        // Will be handled by WebSocket events
        console.log(`👀 [RealtimeChat] Started typing in ${conversationId}`);
      },

      stopTyping: (conversationId: string) => {
        // Will be handled by WebSocket events
        console.log(`👀 [RealtimeChat] Stopped typing in ${conversationId}`);
      },

      // Message status
      markMessagesRead: (conversationId: string, messageId: string) => {
        // Will be handled by WebSocket events
        console.log(`👁️ [RealtimeChat] Marked messages as read in ${conversationId} up to ${messageId}`);
      },

      // Utility
      clearError: () => {
        set((draft) => {
          draft.connectionStatus.error = undefined;
        });
      },

      reset: () => {
        set((draft) => {
          draft.connectionStatus = { connected: false, connecting: false };
          draft.activeConversation = null;
          draft.conversations = {};
          draft.socket = null;
        });
      },
    }))
  )
);

// Store is exported above, hook is in hooks/useRealtimeChat.ts
