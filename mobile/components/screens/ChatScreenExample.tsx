import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { useChatWebSocket } from '../../hooks/useSmartWebSocket';

/**
 * ✅ EXAMPLE: SMART WEBSOCKET USAGE IN CHAT SCREEN
 * 
 * This demonstrates the optimal WebSocket strategy:
 * - WebSocket ONLY connects when user enters chat
 * - Automatically disconnects when user leaves chat
 * - Bandwidth efficient - no unnecessary connections
 */

interface ChatScreenExampleProps {
  spaceId: string;
  communityId: string;
}

const ChatScreenExample: React.FC<ChatScreenExampleProps> = ({ spaceId, communityId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // 🎯 SMART WEBSOCKET - Only connects when this chat screen is active
  const { isConnected, connect, disconnect, getStatus } = useChatWebSocket({
    onConnect: () => {
      console.log('💬 [ChatScreen] WebSocket connected for real-time chat');
      // Join the specific space room for targeted events
      // socketService.emit('join_space', { spaceId, communityId });
    },
    
    onDisconnect: () => {
      console.log('💬 [ChatScreen] WebSocket disconnected - chat no longer active');
    },
    
    onError: (error) => {
      console.error('❌ [ChatScreen] WebSocket error:', error);
    }
  });

  // Load initial messages via REST API (not WebSocket)
  useEffect(() => {
    const loadMessages = async () => {
      try {
        // Use REST API for initial message load
        // const response = await apiStore.get(`/spaces/${spaceId}/messages`);
        // setMessages(response.data.messages);
        console.log('📨 [ChatScreen] Loading initial messages via REST API...');
      } catch (error) {
        console.error('❌ [ChatScreen] Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [spaceId]);

  // Set up real-time message handlers (only when WebSocket is connected)
  useEffect(() => {
    if (!isConnected) return;

    // These handlers are automatically set up by useChatWebSocket
    // but you can add additional logic here
    console.log('🔄 [ChatScreen] Setting up real-time message handlers...');

    return () => {
      console.log('🧹 [ChatScreen] Cleaning up message handlers...');
    };
  }, [isConnected]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      if (isConnected) {
        // Send via WebSocket for real-time delivery
        console.log('⚡ [ChatScreen] Sending message via WebSocket...');
        // socketService.emit('send_message', { spaceId, content: inputText });
      } else {
        // Fallback to REST API if WebSocket not available
        console.log('📡 [ChatScreen] Sending message via REST API...');
        // await apiStore.post(`/spaces/${spaceId}/messages`, { content: inputText });
      }
      
      setInputText('');
    } catch (error) {
      console.error('❌ [ChatScreen] Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    if (isConnected) {
      // Send typing indicator via WebSocket
      // socketService.emit('typing', { spaceId, isTyping: true });
      console.log('⌨️ [ChatScreen] Sending typing indicator...');
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header with connection status */}
      <View className="p-4 bg-gray-100 border-b">
        <Text className="text-lg font-bold">Chat Room</Text>
        <Text className="text-sm text-gray-600">
          {isConnected ? '🟢 Real-time connected' : '🔴 Offline mode'}
        </Text>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="p-3 border-b border-gray-100">
            <Text className="font-semibold">{item.senderName}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
        className="flex-1"
      />

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <View className="px-4 py-2 bg-gray-50">
          <Text className="text-sm text-gray-600">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}

      {/* Message Input */}
      <View className="flex-row p-4 border-t border-gray-200">
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          onFocus={handleTyping}
          placeholder="Type a message..."
          className="flex-1 p-3 border border-gray-300 rounded-lg mr-2"
        />
        <Pressable
          onPress={sendMessage}
          className="bg-blue-500 px-4 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Send</Text>
        </Pressable>
      </View>

      {/* Debug Info */}
      <View className="p-2 bg-gray-100">
        <Text className="text-xs text-gray-500">
          WebSocket Status: {JSON.stringify(getStatus(), null, 2)}
        </Text>
      </View>
    </View>
  );
};

export default ChatScreenExample;
