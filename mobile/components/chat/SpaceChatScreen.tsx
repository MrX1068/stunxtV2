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
  RefreshControl,
} from 'react-native';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore, useAuth, useSpaces } from '@/stores';
import type { ChatConversation } from '@/stores/chat';
import type { SocketMessage } from '@/stores/socket';

interface SpaceChatScreenProps {
  spaceId: string;
  spaceName?: string;
  communityId?: string;
  onClose?: () => void;
  onBack?: () => void;
}

export default function SpaceChatScreen({ spaceId, spaceName, communityId, onClose, onBack }: SpaceChatScreenProps) {
  const { user } = useAuth();
  const { currentSpace } = useSpaces();
  const {
    connect,
    joinSpaceChat,
    sendMessage,
    sendMessageToConversation,
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
    setActiveConversation,
  } = useChatStore();

  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get current conversation messages
  const conversationMessages = conversationId ? (messages[conversationId] || []) : [];
  const currentTypingUsers = conversationId ? (typingUsers[conversationId] || []) : [];

  useEffect(() => {
    initializeChat();

    // Keyboard listeners
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
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
  }, [spaceId]);

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

  const initializeChat = async () => {
    try {
      if (!user?.id) {
        console.error('User not authenticated');
        return;
      }

      // Connect to chat
      await connect(user.id);
      
      // Join or create space conversation
      const convId = await joinSpaceChat(spaceId, spaceName || currentSpace?.name || 'Space Chat', communityId);
      setConversationId(convId);
      
      console.log('✅ Space chat initialized:', { spaceId, conversationId: convId });
    } catch (error) {
      console.error('Failed to initialize space chat:', error);
      Alert.alert('Error', 'Failed to connect to chat. Please try again.');
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !conversationId) return;

    console.log('📤 [SpaceChatScreen] Sending message via sendMessageToConversation:', {
      conversationId,
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    });

    const optimisticId = sendMessageToConversation(conversationId, inputText.trim(), 'text');
    console.log('✅ [SpaceChatScreen] Message sent, optimisticId:', optimisticId);
    
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
    const isOwnMessage = item.senderId === user?.id;
    const showAvatar = !isOwnMessage && (index === 0 || conversationMessages[index - 1]?.senderId !== item.senderId);
    const showTimestamp = index === 0 || 
      new Date(item.timestamp).getTime() - new Date(conversationMessages[index - 1]?.timestamp).getTime() > 300000; // 5 minutes

    return (
      <VStack space="xs" className={`px-4 ${showTimestamp ? 'mt-4' : 'mt-1'}`}>
        {showTimestamp && (
          <Text className="text-xs text-center text-gray-500">
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              month: 'short',
              day: 'numeric'
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
                  ? 'bg-blue-500 rounded-br-sm' 
                  : 'bg-gray-200 rounded-bl-sm'
              }`}
            >
              <Text className={`${isOwnMessage ? 'text-white' : 'text-gray-900'} text-base`}>
                {item.content}
              </Text>
            </Box>
            
            <HStack space="xs" className={`items-center ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <Text className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              
              {isOwnMessage && (
                <MaterialIcons 
                  name={item.status === 'read' ? 'done-all' : item.status === 'delivered' ? 'done-all' : 'done'} 
                  size={12} 
                  color={item.status === 'read' ? '#3B82F6' : '#9CA3AF'} 
                />
              )}
            </HStack>
          </VStack>
        </HStack>
      </VStack>
    );
  };

  const renderTypingIndicator = () => {
    if (currentTypingUsers.length === 0) return null;

    const typingNames = currentTypingUsers.map(u => u.userName).join(', ');
    const typingText = currentTypingUsers.length === 1 
      ? `${typingNames} is typing...` 
      : `${typingNames} are typing...`;

    return (
      <Box className="px-4 py-2">
        <HStack space="sm" className="items-center">
          <Box className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center">
            <Text className="text-gray-600 text-xs">●●●</Text>
          </Box>
          <Text className="text-gray-500 text-sm italic">{typingText}</Text>
        </HStack>
      </Box>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <Box className="border-b border-gray-200 bg-white">
        <HStack className="items-center justify-between px-4 py-3">
          <HStack className="items-center space-x-3 flex-1">
            {(onClose || onBack) && (
              <TouchableOpacity onPress={onBack || onClose}>
                <MaterialIcons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
            )}
            
            <VStack className="flex-1">
              <Text className="font-semibold text-gray-900 text-lg">
                {spaceName}
              </Text>
              <Text className="text-sm text-gray-500">
                Space Chat • {currentSpace?.memberCount || 0} members
              </Text>
            </VStack>
          </HStack>
          
          <HStack className="items-center space-x-2">
            <Box 
              className={`w-2 h-2 rounded-full ${
                connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'
              }`} 
            />
            <TouchableOpacity>
              <MaterialIcons name="more-vert" size={24} color="#374151" />
            </TouchableOpacity>
          </HStack>
        </HStack>
      </Box>

      {/* Connection Status Overlay */}
      <Animated.View 
        className="absolute top-20 left-4 right-4 z-10"
        style={{ opacity: fadeAnim }}
      >
        <Box className="bg-red-500 rounded-lg px-4 py-2">
          <Text className="text-white text-center font-medium">
            {connectionStatus.connecting ? 'Connecting...' : 'Disconnected'}
          </Text>
        </Box>
      </Animated.View>

      {/* Messages */}
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={conversationMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || item.optimisticId || item.timestamp}
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl 
              refreshing={isLoadingMessages} 
              onRefresh={() => conversationId && fetchMessages(conversationId)}
            />
          }
          onContentSizeChange={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          }}
          ListFooterComponent={renderTypingIndicator}
        />

        {/* Input */}
        <Box 
          className="border-t border-gray-200 bg-white px-4 py-2"
          style={{ paddingBottom: Math.max(keyboardHeight > 0 ? 8 : 12, 12) }}
        >
          <HStack className="items-end space-x-2">
            <Box className="flex-1 bg-gray-100 rounded-full px-4 py-2">
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={`Message ${spaceName}...`}
                multiline
                maxLength={2000}
                className="text-base text-gray-900 max-h-24"
                style={{ 
                  fontSize: 16,
                  lineHeight: 20,
                  textAlignVertical: 'center'
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
              <MaterialIcons 
                name="send" 
                size={20} 
                color={inputText.trim() && connectionStatus.connected ? 'white' : '#9CA3AF'} 
              />
            </TouchableOpacity>
          </HStack>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
