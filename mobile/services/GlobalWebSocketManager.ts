import { socketService } from '../stores/socket';
import { communityActions } from '../stores/community';
import { useAuthStore } from '../stores/auth';

/**
 * ✅ SMART WEBSOCKET MANAGER - CONTEXT-AWARE CONNECTION
 *
 * Features:
 * - Only connects when real-time features are needed
 * - Context-aware: Community List (no WS) → Space List (no WS) → Chat (WS needed)
 * - Bandwidth efficient - no unnecessary connections
 * - Automatic cleanup when leaving real-time contexts
 * - Proper lifecycle management
 */

type WebSocketContext = 'none' | 'community_realtime' | 'space_realtime' | 'chat_realtime';

class SmartWebSocketManager {
  private isConnected = false;
  private currentContext: WebSocketContext = 'none';
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private activeContexts = new Set<WebSocketContext>();

  /**
   * Request WebSocket connection for a specific context
   * Only connects if real-time features are actually needed
   */
  async requestConnection(context: WebSocketContext): Promise<void> {
    console.log(`🎯 [SmartWebSocket] Connection requested for context: ${context}`);

    this.activeContexts.add(context);

    // Only connect for real-time contexts
    if (this.needsRealTimeConnection(context)) {
      await this.ensureConnection();
    } else {
      console.log(`📱 [SmartWebSocket] Context '${context}' doesn't need real-time connection`);
    }
  }

  /**
   * Release WebSocket connection for a specific context
   */
  releaseConnection(context: WebSocketContext): void {
    console.log(`🔌 [SmartWebSocket] Connection released for context: ${context}`);

    this.activeContexts.delete(context);

    // Disconnect if no real-time contexts are active
    if (!this.hasActiveRealTimeContexts()) {
      console.log('💡 [SmartWebSocket] No real-time contexts active, disconnecting to save bandwidth');
      this.disconnect();
    }
  }

  /**
   * Check if context needs real-time WebSocket connection
   */
  private needsRealTimeConnection(context: WebSocketContext): boolean {
    return context === 'chat_realtime' || context === 'space_realtime';
  }

  /**
   * Check if any active contexts need real-time connection
   */
  private hasActiveRealTimeContexts(): boolean {
    return Array.from(this.activeContexts).some(context => this.needsRealTimeConnection(context));
  }

  /**
   * Ensure WebSocket connection is established
   */
  private async ensureConnection(): Promise<void> {
    if (this.isConnected) {
      console.log('🔄 [SmartWebSocket] Already connected');
      return;
    }

    if (this.connectionPromise) {
      console.log('🔄 [SmartWebSocket] Connection in progress, waiting...');
      return this.connectionPromise;
    }

    console.log('🚀 [SmartWebSocket] Establishing WebSocket connection...');

    this.connectionPromise = this._initializeConnection();
    await this.connectionPromise;
    this.connectionPromise = null;
  }

  private async _initializeConnection(): Promise<void> {
    try {
      // Check if user is authenticated
      const authStore = useAuthStore.getState();
      if (!authStore.isAuthenticated || !authStore.user) {
        console.log('⚠️ [SmartWebSocket] User not authenticated, skipping connection');
        return;
      }

      // Set up global event handlers BEFORE connecting
      this.setupGlobalEventHandlers();

      // Connect to WebSocket (socketService.connect() doesn't take parameters)
      await socketService.connect();

      this.isConnected = true;
      this.startHealthCheck();

      console.log('✅ [SmartWebSocket] WebSocket connection established');

    } catch (error) {
      console.error('❌ [SmartWebSocket] Failed to initialize:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  private disconnect(): void {
    if (!this.isConnected) return;

    console.log('🔌 [SmartWebSocket] Disconnecting WebSocket...');

    this.clearReconnectTimer();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    socketService.disconnect();
    this.isConnected = false;
  }

  /**
   * Set up centralized event handlers that route events to appropriate stores
   */
  private setupGlobalEventHandlers(): void {
    socketService.setEventHandlers({
      // Connection events
      onConnect: () => {
        console.log('🔗 [GlobalWebSocket] Connected to server');
        this.clearReconnectTimer();
      },

      onDisconnect: (reason: string) => {
        console.log('🔌 [GlobalWebSocket] Disconnected:', reason);
        this.scheduleReconnect();
      },

      onConnectError: (error: any) => {
        console.error('❌ [GlobalWebSocket] Connection error:', error);
        this.scheduleReconnect();
      },

      // Community events - route to community store
      onCommunityUpdate: (data) => {
        console.log('🏘️ [GlobalWebSocket] Community update:', data);
        communityActions.updateCommunityOptimistic(data.communityId, data.updates);
      },

      onMemberJoined: (data) => {
        console.log('👋 [GlobalWebSocket] Member joined:', data);
        communityActions.updateMemberCount(data.communityId, 1);
      },

      onMemberLeft: (data) => {
        console.log('👋 [GlobalWebSocket] Member left:', data);
        communityActions.updateMemberCount(data.communityId, -1);
      },

      // Space events - can be extended for space store
      onSpaceUpdate: (data) => {
        console.log('🏠 [GlobalWebSocket] Space update:', data);
        // Route to space store when implemented
      },

      // Message events - route to chat store
      onMessage: (message) => {
        console.log('💬 [GlobalWebSocket] New message:', message);
        // Route to chat store
      },

      onTyping: (data, isTyping) => {
        console.log('⌨️ [GlobalWebSocket] Typing indicator:', data, isTyping);
        // Route to chat store
      },

      onUserStatus: (data) => {
        console.log('👤 [GlobalWebSocket] User status:', data);
        // Route to user/presence store
      }
    });
  }

  /**
   * Health check to ensure connection is alive
   */
  private startHealthCheck(): void {
    this.heartbeatTimer = setInterval(() => {
      const status = socketService.getConnectionStatus();
      if (!status.connected) {
        console.log('💔 [GlobalWebSocket] Connection lost, attempting reconnect...');
        this.scheduleReconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, socketService.getConnectionStatus().reconnectAttempts), 30000);
    
    console.log(`🔄 [GlobalWebSocket] Scheduling reconnect in ${delay}ms...`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.clearReconnectTimer();
      
      try {
        await socketService.connect();
        console.log('✅ [GlobalWebSocket] Reconnected successfully');
      } catch (error) {
        console.error('❌ [GlobalWebSocket] Reconnect failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return socketService.getConnectionStatus();
  }

  /**
   * Check if WebSocket is ready for use
   */
  isReady(): boolean {
    return this.isConnected && socketService.getConnectionStatus().connected;
  }

  /**
   * Cleanup method - call when app is closing or user logs out
   */
  cleanup(): void {
    console.log('🧹 [GlobalWebSocket] Cleaning up...');
    
    this.clearReconnectTimer();
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    socketService.disconnect();
    this.isConnected = false;
    this.activeContexts.clear();
  }

  /**
   * Force reconnection (useful for debugging or manual retry)
   */
  async forceReconnect(): Promise<void> {
    console.log('🔄 [SmartWebSocket] Force reconnecting...');

    this.cleanup();
    // Request connection for chat context to force reconnect
    await this.requestConnection('chat_realtime');
  }
}

// Export singleton instance
export const smartWebSocketManager = new SmartWebSocketManager();

// Export convenience methods for different contexts
export const requestWebSocketForChat = () => smartWebSocketManager.requestConnection('chat_realtime');
export const requestWebSocketForSpace = () => smartWebSocketManager.requestConnection('space_realtime');
export const requestWebSocketForCommunity = () => smartWebSocketManager.requestConnection('community_realtime');
export const releaseWebSocketForChat = () => smartWebSocketManager.releaseConnection('chat_realtime');
export const releaseWebSocketForSpace = () => smartWebSocketManager.releaseConnection('space_realtime');
export const releaseWebSocketForCommunity = () => smartWebSocketManager.releaseConnection('community_realtime');
export const cleanupWebSocket = () => smartWebSocketManager.cleanup();
export const isWebSocketReady = () => smartWebSocketManager.isReady();
export const forceWebSocketReconnect = () => smartWebSocketManager.forceReconnect();
