import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  Animated,
} from 'react-native';
import {
  VStack,
  HStack,
  Box,
  Text,
} from '@/components/ui';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat, SocketMessage, ChatConversation } from '@/stores';

interface ChatScreenProps {
  conversationId: string;
  spaceId?: string;
  spaceName?: string;
}

export default function ChatScreen({ conversationId, spaceId, spaceName }: ChatScreenProps) {
  const {
    connect,
    setActiveConversation,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    fetchMessages,
    activeConversation,
    messages,
    typingUsers,
    connectionStatus,
    isLoadingMessages,
    error,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get current conversation messages
  const conversationMessages = messages[conversationId] || [];
  const currentTypingUsers = typingUsers[conversationId] || [];

  useEffect(() => {
    // Connect to chat and set active conversation
    connect('current-user-id').then(() => {
      setActiveConversation(conversationId);
    });

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Scroll to bottom when keyboard appears
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (conversationMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversationMessages.length]);

  // Animate connection status
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: connectionStatus.connected ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [connectionStatus.connected]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const optimisticId = sendMessage(inputText.trim());
    setInputText('');
    
    // Stop typing indicator
    stopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    
    // Handle typing indicators
    if (text.length > 0) {
      startTyping();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    } else {
      stopTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    stopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const renderMessage = ({ item, index }: { item: SocketMessage; index: number }) => {
    const isOwnMessage = item.senderId === 'current-user-id'; // Replace with actual user ID
    const showAvatar = !isOwnMessage && (index === 0 || conversationMessages[index - 1]?.senderId !== item.senderId);
    const showTimestamp = index === 0 || 
      new Date(item.timestamp).getTime() - new Date(conversationMessages[index - 1]?.timestamp).getTime() > 300000; // 5 minutes

    return (
      <VStack space="xs" className={`px-4 ${showTimestamp ? 'mt-4' : 'mt-1'}`}>
        {showTimestamp && (
          <Text className="text-xs text-center text-gray-500">
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        )}
        
        <HStack space="sm" className={`${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          {!isOwnMessage && showAvatar && (
            <Box className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center">
              <Text className="text-white text-xs font-semibold">
                {item.senderName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </Box>
          )}
          
          {!isOwnMessage && !showAvatar && (
            <Box className="w-8" />
          )}
          
          <VStack 
            space="xs" 
            className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}
          >
            {!isOwnMessage && showAvatar && (
              <Text className="text-xs text-gray-600 ml-1">
                {item.senderName}
              </Text>
            )}
            
            <Box
              className={`px-3 py-2 rounded-2xl ${
                isOwnMessage
                  ? 'bg-blue-500 rounded-br-md'
                  : 'bg-gray-100 rounded-bl-md'
              }`}
            >
              <Text
                className={`text-sm ${
                  isOwnMessage ? 'text-white' : 'text-gray-900'
                }`}
              >
                {item.content}
              </Text>
            </Box>
            
            <HStack space="xs" className="items-center">
              {isOwnMessage && (
                <MaterialIcons
                  name={
                    item.status === 'read'
                      ? 'done-all'
                      : item.status === 'delivered'
                      ? 'done-all'
                      : item.status === 'sent'
                      ? 'done'
                      : item.status === 'failed'
                      ? 'error'
                      : 'schedule'
                  }
                  size={12}
                  color={
                    item.status === 'read'
                      ? '#3B82F6'
                      : item.status === 'failed'
                      ? '#EF4444'
                      : '#9CA3AF'
                  }
                />
              )}
              
              {item.edited && (
                <Text className="text-xs text-gray-400">edited</Text>
              )}
            </HStack>
          </VStack>
        </HStack>
      </VStack>
    );
  };

  const renderTypingIndicator = () => {
    if (currentTypingUsers.length === 0) return null;

    const typingText = currentTypingUsers.length === 1
      ? `${currentTypingUsers[0].userName} is typing...`
      : `${currentTypingUsers.length} people are typing...`;

    return (
      <HStack space="sm" className="px-4 py-2 items-center">
        <Box className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center">
          <MaterialIcons name="more-horiz" size={16} color="#6B7280" />
        </Box>
        <Text className="text-sm text-gray-500 italic">{typingText}</Text>
      </HStack>
    );
  };

  const renderConnectionStatus = () => {
    if (connectionStatus.connected) return null;

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        }}
        className="absolute top-0 left-0 right-0 z-10"
      >
        <Box className="bg-yellow-500 px-4 py-2">
          <Text className="text-white text-center text-sm font-medium">
            {connectionStatus.connecting ? 'Connecting...' : 'Disconnected - Trying to reconnect...'}
          </Text>
        </Box>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <VStack className="flex-1">
          {/* Connection Status */}
          {renderConnectionStatus()}
          
          {/* Header */}
          <HStack className="px-4 py-3 border-b border-gray-200 items-center space-x-3">
            <Box className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center">
              <MaterialIcons name="group" size={20} color="white" />
            </Box>
            <VStack className="flex-1">
              <Text className="font-semibold text-gray-900">
                {spaceName || activeConversation?.name || 'Chat'}
              </Text>
              <Text className="text-xs text-gray-500">
                {activeConversation?.participants?.length || 0} members
              </Text>
            </VStack>
            <TouchableOpacity>
              <MaterialIcons name="more-vert" size={24} color="#6B7280" />
            </TouchableOpacity>
          </HStack>

          {/* Messages */}
          <Box className="flex-1">
            <FlatList
              ref={flatListRef}
              data={conversationMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id || item.optimisticId || String(Math.random())}
              showsVerticalScrollIndicator={false}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              onContentSizeChange={() => {
                if (conversationMessages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
              ListFooterComponent={renderTypingIndicator}
            />
          </Box>

          {/* Input Area */}
          <Box 
            className="px-4 py-3 border-t border-gray-200 bg-white"
            style={{ 
              paddingBottom: Platform.OS === 'ios' ? Math.max(keyboardHeight ? 10 : 20, 20) : 10 
            }}
          >
            <HStack space="sm" className="items-end">
              <Box className="flex-1">
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Type a message..."
                  multiline
                  maxLength={4000}
                  className="border border-gray-300 rounded-2xl px-4 py-2 text-base max-h-24"
                  style={{
                    minHeight: 40,
                    textAlignVertical: 'center',
                  }}
                />
              </Box>
              
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!inputText.trim() || !connectionStatus.connected}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  inputText.trim() && connectionStatus.connected
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() && connectionStatus.connected ? 'white' : '#9CA3AF'}
                />
              </TouchableOpacity>
            </HStack>
            
            {inputText.length > 0 && (
              <Text className="text-xs text-gray-400 mt-1 text-right">
                {inputText.length}/4000
              </Text>
            )}
          </Box>
        </VStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
