import { useEffect, useCallback, useRef, useState } from 'react';
import { useSmartWebSocket } from './useSmartWebSocket';
import { useRealtimeChatStore } from '../stores/realtimeChat';
import { realtimeChatService } from '../services/realtimeChatService';
import { useAuth } from '../stores/auth';
import { socketService } from '../stores/socket';

/**
 * Custom hook for real-time chat functionality
 * Integrates with existing useSmartWebSocket hook and manages chat state
 */
export const useRealtimeChat = () => {
  const { user } = useAuth();

  // Use individual selectors to prevent infinite loops
  const connectionStatus = useRealtimeChatStore((state) => state.connectionStatus);
  const activeConversation = useRealtimeChatStore((state) => state.activeConversation);
  const conversations = useRealtimeChatStore((state) => state.conversations);

  // Actions (stable references)
  const storeConnect = useRealtimeChatStore((state) => state.connect);
  const storeDisconnect = useRealtimeChatStore((state) => state.disconnect);
  const storeJoinConversation = useRealtimeChatStore((state) => state.joinConversation);
  const storeLeaveConversation = useRealtimeChatStore((state) => state.leaveConversation);
  const storeSetActiveConversation = useRealtimeChatStore((state) => state.setActiveConversation);
  const storeSendMessage = useRealtimeChatStore((state) => state.sendMessage);
  const storeLoadMessages = useRealtimeChatStore((state) => state.loadMessages);
  const storeLoadCachedMessages = useRealtimeChatStore((state) => state.loadCachedMessages);
  const storeStartTyping = useRealtimeChatStore((state) => state.startTyping);
  const storeStopTyping = useRealtimeChatStore((state) => state.stopTyping);
  const storeMarkMessagesRead = useRealtimeChatStore((state) => state.markMessagesRead);
  const storeClearError = useRealtimeChatStore((state) => state.clearError);
  const storeReset = useRealtimeChatStore((state) => state.reset);

  const initializationRef = useRef(false);

  // WebSocket connection using existing hook
  const {
    isConnected,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
  } = useSmartWebSocket({
    features: ['chat_messaging', 'live_typing', 'presence_status'],
    autoConnect: true, // Auto-connect when chat is needed
    onConnect: () => {
      console.log('✅ [useRealtimeChat] WebSocket connected');
    },
    onDisconnect: () => {
      console.log('🔌 [useRealtimeChat] WebSocket disconnected');
    },
    onError: (error) => {
      console.error('❌ [useRealtimeChat] WebSocket error:', error);
    },
  });

  // Get socket from socketService
  const getSocket = useCallback(() => {
    return socketService.getSocket();
  }, []);

  // Initialize chat service when socket and user are available
  useEffect(() => {
    const currentSocket = getSocket();
    console.log('🔍 [useRealtimeChat] Socket status:', {
      hasSocket: !!currentSocket,
      isConnected: currentSocket?.connected,
      hasUser: !!user?.id,
      isWebSocketConnected: isConnected,
      isInitialized: initializationRef.current
    });

    if (currentSocket && user?.id && isConnected && !initializationRef.current) {
      console.log('🚀 [useRealtimeChat] Initializing chat service...');

      // Add a small delay to ensure socket is fully ready
      const initTimer = setTimeout(() => {
        realtimeChatService.initialize(currentSocket, user.id);
        initializationRef.current = true;

        // Update connection status in store
        storeConnect(user.id).catch((error: any) => {
          console.error('❌ [useRealtimeChat] Failed to connect to chat store:', error);
        });
      }, 100);

      return () => clearTimeout(initTimer);
    }
  }, [getSocket, user?.id, isConnected, storeConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (initializationRef.current) {
        realtimeChatService.cleanup();
        initializationRef.current = false;
      }
    };
  }, []);

  // Enhanced connect function
  const connect = useCallback(async () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('🚀 [useRealtimeChat] Connecting to chat service...');

      // Ensure WebSocket is connected
      if (!isConnected) {
        await connectWebSocket();
        // Wait for connection to stabilize
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Ensure chat service is initialized
      if (!initializationRef.current) {
        const currentSocket = getSocket();
        console.log('🔍 [useRealtimeChat] Connect - Socket status:', {
          hasSocket: !!currentSocket,
          isConnected: currentSocket?.connected,
          socketId: currentSocket?.id
        });

        if (currentSocket && currentSocket.connected) {
          realtimeChatService.initialize(currentSocket, user.id);
          initializationRef.current = true;
          console.log('✅ [useRealtimeChat] Chat service initialized successfully');
        } else {
          console.warn('⚠️ [useRealtimeChat] Socket not available or not connected, will retry on next connection');
        }
      }

      // Connect to store
      await storeConnect(user.id);

      console.log('✅ [useRealtimeChat] Connected to chat service');
    } catch (error) {
      console.error('❌ [useRealtimeChat] Failed to connect:', error);
      throw error;
    }
  }, [connectWebSocket, user?.id, isConnected, storeConnect, getSocket]);

  // Enhanced disconnect function
  const disconnect = useCallback(() => {
    realtimeChatService.cleanup();
    disconnectWebSocket();
    storeDisconnect();
    initializationRef.current = false;
    console.log('🔌 [useRealtimeChat] Disconnected from chat service');
  }, [disconnectWebSocket, storeDisconnect]);

  // Join conversation with WebSocket integration
  const joinConversation = useCallback(async (conversationId: string, spaceContext?: { spaceId: string; communityId: string; spaceName: string }) => {
    if (!isConnected) {
      throw new Error('Not connected to chat service');
    }

    try {
      // Join via WebSocket
      await realtimeChatService.joinConversation(conversationId);

      // Update store with space context
      await storeJoinConversation(conversationId, spaceContext);
      storeSetActiveConversation(conversationId);

      console.log(`✅ [useRealtimeChat] Joined conversation: ${conversationId}${spaceContext ? ` (space: ${spaceContext.spaceName})` : ''}`);
    } catch (error) {
      console.error(`❌ [useRealtimeChat] Failed to join conversation:`, error);
      throw error;
    }
  }, [isConnected, storeJoinConversation, storeSetActiveConversation]);

  // Leave conversation
  const leaveConversation = useCallback((conversationId: string) => {
    realtimeChatService.leaveConversation(conversationId);
    storeLeaveConversation(conversationId);

    if (activeConversation === conversationId) {
      storeSetActiveConversation('');
    }

    console.log(`👋 [useRealtimeChat] Left conversation: ${conversationId}`);
  }, [storeLeaveConversation, activeConversation, storeSetActiveConversation]);

  // Send message with WebSocket integration
  const sendMessage = useCallback((params: {
    conversationId: string;
    content: string;
    type?: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
  }) => {
    if (!isConnected) {
      throw new Error('Not connected to chat service');
    }

    // Create optimistic message in store
    const optimisticId = storeSendMessage(params);

    // Send via WebSocket
    realtimeChatService.sendMessage({
      conversationId: params.conversationId,
      content: params.content,
      type: params.type,
      optimisticId,
    });

    return optimisticId;
  }, [isConnected, storeSendMessage]);

  // Load messages with WebSocket-first caching strategy
  const loadMessages = useCallback(async (conversationId: string, limit = 50, before?: string) => {
    try {
      // Load from cache first if no before parameter (initial load)
      if (!before) {
        await storeLoadCachedMessages(conversationId);
      }

      // Then load from server via WebSocket (faster than REST)
      await storeLoadMessages(conversationId, limit, before);

      console.log(`✅ [useRealtimeChat] Loaded messages via WebSocket for ${conversationId}`);
    } catch (error) {
      console.error(`❌ [useRealtimeChat] Failed to load messages:`, error);
      throw error;
    }
  }, [storeLoadCachedMessages, storeLoadMessages]);

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (!isConnected) return;

    realtimeChatService.startTyping(conversationId);
    storeStartTyping(conversationId);
  }, [isConnected, storeStartTyping]);

  const stopTyping = useCallback((conversationId: string) => {
    if (!isConnected) return;

    realtimeChatService.stopTyping(conversationId);
    storeStopTyping(conversationId);
  }, [isConnected, storeStopTyping]);

  // Mark messages as read
  const markMessagesRead = useCallback((conversationId: string, messageId: string) => {
    if (!isConnected) return;

    realtimeChatService.markMessagesRead(conversationId, messageId);
    storeMarkMessagesRead(conversationId, messageId);
  }, [isConnected, storeMarkMessagesRead]);

  // Get conversation data
  const getConversation = useCallback((conversationId: string) => {
    return conversations[conversationId] || null;
  }, [conversations]);

  // Get current messages for active conversation
  const getCurrentMessages = useCallback(() => {
    if (!activeConversation) return [];
    return conversations[activeConversation]?.messages || [];
  }, [activeConversation, conversations]);

  // Get typing users for active conversation
  const getCurrentTypingUsers = useCallback(() => {
    if (!activeConversation) return [];
    return conversations[activeConversation]?.typingUsers || [];
  }, [activeConversation, conversations]);

  return {
    // Connection state
    isConnected: isConnected && connectionStatus.connected,
    isConnecting: connectionStatus.connecting,
    connectionError: connectionStatus.error,

    // Active conversation
    activeConversation,

    // Connection management
    connect,
    disconnect,

    // Conversation management
    joinConversation,
    leaveConversation,
    setActiveConversation: storeSetActiveConversation,

    // Message operations
    sendMessage,
    loadMessages,

    // Typing indicators
    startTyping,
    stopTyping,

    // Message status
    markMessagesRead,

    // Data access
    getConversation,
    getCurrentMessages,
    getCurrentTypingUsers,
    conversations,

    // Utility
    clearError: storeClearError,
    reset: storeReset,
  };
};

/**
 * Hook for space-specific chat functionality
 * Creates or joins a space conversation
 */
export const useSpaceChat = (spaceId: string, spaceName: string, communityId?: string) => {
  const chat = useRealtimeChat();
  const conversationId = `space-${spaceId}`;
  const [hasJoined, setHasJoined] = useState(false);

  // Auto-join space conversation when hook is used (prevent infinite loop)
  useEffect(() => {
    if (chat.isConnected && spaceId && !hasJoined) {
      console.log(`🚀 [useSpaceChat] Joining space chat: ${conversationId}`);

      // Add a small delay to prevent rapid re-joins
      const joinTimer = setTimeout(() => {
        // Pass space context for proper REST API fallback
        const spaceContext = communityId ? {
          spaceId,
          communityId,
          spaceName
        } : undefined;

        chat.joinConversation(conversationId, spaceContext)
          .then(() => {
            setHasJoined(true);
            console.log(`✅ [useSpaceChat] Successfully joined: ${conversationId}${spaceContext ? ` (space: ${spaceName})` : ''}`);
          })
          .catch((error) => {
            console.error(`❌ [useSpaceChat] Failed to join space chat:`, error);
          });
      }, 100);

      return () => clearTimeout(joinTimer);
    }
  }, [chat.isConnected, spaceId, conversationId, hasJoined]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spaceId && hasJoined) {
        console.log(`🧹 [useSpaceChat] Cleaning up space chat: ${conversationId}`);
        chat.leaveConversation(conversationId);
      }
    };
  }, [spaceId, conversationId, hasJoined]);

  return {
    ...chat,
    conversationId,
    spaceName,
    spaceId,
    communityId,
    hasJoined,
  };
};
