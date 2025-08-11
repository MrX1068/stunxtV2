import { useEffect, useRef } from 'react';
import { socketService } from '../stores/socket';
import { useAuth } from '../stores/auth';

/**
 * ✅ SMART WEBSOCKET HOOK - CONTEXT-AWARE CONNECTION MANAGEMENT
 * 
 * Usage Strategy:
 * - Community List Screen: NO WebSocket (just REST API)
 * - Space List Screen: NO WebSocket (just REST API) 
 * - Chat Screen: YES WebSocket (real-time messaging)
 * - Live Events: YES WebSocket (real-time updates)
 * 
 * Benefits:
 * - Saves bandwidth - only connects when needed
 * - Better battery life - no unnecessary background connections
 * - Cleaner architecture - explicit about when real-time is needed
 */

export type WebSocketFeature = 
  | 'chat_messaging'      // Real-time chat messages
  | 'live_typing'         // Typing indicators
  | 'presence_status'     // User online/offline status
  | 'live_events'         // Live community events
  | 'space_collaboration' // Real-time space collaboration
  | 'voice_chat';         // Voice/video chat features

interface UseSmartWebSocketOptions {
  features: WebSocketFeature[];
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing WebSocket connections based on required features
 */
export function useSmartWebSocket(options: UseSmartWebSocketOptions) {
  const { features, autoConnect = true, onConnect, onDisconnect, onError } = options;
  const { isAuthenticated } = useAuth();
  const isConnectedRef = useRef(false);
  const featuresRef = useRef<Set<WebSocketFeature>>(new Set());

  // Update features when they change
  useEffect(() => {
    featuresRef.current = new Set(features);
  }, [features]);

  // Connect when features require it and user is authenticated
  useEffect(() => {
    const shouldConnect = autoConnect && isAuthenticated && features.length > 0;
    
    if (shouldConnect && !isConnectedRef.current) {
      console.log(`🚀 [SmartWebSocket] Connecting for features: ${features.join(', ')}`);
      connectWebSocket();
    } else if (!shouldConnect && isConnectedRef.current) {
      console.log('🔌 [SmartWebSocket] Disconnecting - no longer needed');
      disconnectWebSocket();
    }
  }, [features, isAuthenticated, autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnectedRef.current) {
        console.log('🧹 [SmartWebSocket] Component unmounting, disconnecting...');
        disconnectWebSocket();
      }
    };
  }, []);

  const connectWebSocket = async () => {
    try {
      if (isConnectedRef.current) return;

      console.log('🔗 [SmartWebSocket] Establishing connection...');
      
      // Set up event handlers based on required features
      setupEventHandlers();
      
      // Connect to WebSocket
      await socketService.connect();
      
      isConnectedRef.current = true;
      onConnect?.();
      
      console.log('✅ [SmartWebSocket] Connected successfully');
      
    } catch (error) {
      console.error('❌ [SmartWebSocket] Connection failed:', error);
      onError?.(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const disconnectWebSocket = () => {
    if (!isConnectedRef.current) return;

    console.log('🔌 [SmartWebSocket] Disconnecting...');
    
    socketService.disconnect();
    isConnectedRef.current = false;
    onDisconnect?.();
  };

  const setupEventHandlers = () => {
    const handlers: any = {};

    // Only set up handlers for required features
    if (featuresRef.current.has('chat_messaging')) {
      handlers.onMessage = (message: any) => {
        console.log('💬 [SmartWebSocket] New message:', message);
        // Route to chat store
      };
    }

    if (featuresRef.current.has('live_typing')) {
      handlers.onTyping = (data: any, isTyping: boolean) => {
        console.log('⌨️ [SmartWebSocket] Typing indicator:', data, isTyping);
        // Route to chat store
      };
    }

    if (featuresRef.current.has('presence_status')) {
      handlers.onUserStatus = (data: any) => {
        console.log('👤 [SmartWebSocket] User status:', data);
        // Route to presence store
      };
    }

    if (featuresRef.current.has('live_events')) {
      handlers.onCommunityUpdate = (data: any) => {
        console.log('🏘️ [SmartWebSocket] Community update:', data);
        // Route to community store
      };
      
      handlers.onMemberJoined = (data: any) => {
        console.log('👋 [SmartWebSocket] Member joined:', data);
        // Route to community store
      };
      
      handlers.onMemberLeft = (data: any) => {
        console.log('👋 [SmartWebSocket] Member left:', data);
        // Route to community store
      };
    }

    if (featuresRef.current.has('space_collaboration')) {
      handlers.onSpaceUpdate = (data: any) => {
        console.log('🏠 [SmartWebSocket] Space update:', data);
        // Route to space store
      };
    }

    // Set handlers on socket service
    socketService.setEventHandlers(handlers);
  };

  const getConnectionStatus = () => {
    return {
      isConnected: isConnectedRef.current,
      socketStatus: socketService.getConnectionStatus(),
      activeFeatures: Array.from(featuresRef.current),
    };
  };

  return {
    isConnected: isConnectedRef.current,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    getStatus: getConnectionStatus,
  };
}

/**
 * Convenience hooks for specific use cases
 */

// For chat screens - needs real-time messaging
export function useChatWebSocket(options?: Omit<UseSmartWebSocketOptions, 'features'>) {
  return useSmartWebSocket({
    ...options,
    features: ['chat_messaging', 'live_typing', 'presence_status'],
  });
}

// For live events - needs real-time community updates
export function useLiveEventsWebSocket(options?: Omit<UseSmartWebSocketOptions, 'features'>) {
  return useSmartWebSocket({
    ...options,
    features: ['live_events'],
  });
}

// For space collaboration - needs real-time space updates
export function useSpaceWebSocket(options?: Omit<UseSmartWebSocketOptions, 'features'>) {
  return useSmartWebSocket({
    ...options,
    features: ['space_collaboration', 'presence_status'],
  });
}

// For voice/video features
export function useVoiceWebSocket(options?: Omit<UseSmartWebSocketOptions, 'features'>) {
  return useSmartWebSocket({
    ...options,
    features: ['voice_chat', 'presence_status'],
  });
}
