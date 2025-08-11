import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { communitySpaceApi } from '../../services/communitySpaceApi';
import { useSpaceChat } from '../../hooks/useRealtimeChat';
import { useAuth } from '../../stores/auth';
// Removed InfoScreenModal - now using route-based navigation
import type { ChatMessage } from '../../stores/realtimeChat';

/**
 * ✅ PROFESSIONAL REAL-TIME CHAT INTERFACE
 *
 * Features:
 * - Real-time messaging via WebSocket
 * - Professional chat UI (WhatsApp/Telegram style)
 * - SQLite message caching for instant loading
 * - Typing indicators and delivery status
 * - Optimistic UI updates
 * - Connection state management
 * - Message retry functionality
 */

interface ChatScreenProps {
  spaceId?: string;
  hideHeader?: boolean;
  spaceData?: {
    id: string;
    name: string;
    interactionType: string;
    description: string;
    memberCount: number;
    isJoined: boolean;
    communityId: string;
    communityName: string;
  };
}

const ChatScreen: React.FC<ChatScreenProps> = ({
  spaceId: propSpaceId,
  spaceData,
  hideHeader = false,
}) => {
  const insets = useSafeAreaInsets();
  const { spaceId: paramSpaceId } = useLocalSearchParams<{ spaceId: string }>();

  const spaceId = propSpaceId || spaceData?.id || paramSpaceId;

  // Chat state
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [joiningSpace, setJoiningSpace] = useState(false);
  // Removed showSpaceInfo state - now using route navigation

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Store hooks
  const { user } = useAuth();

  // Use passed spaceData or create simple space object
  const [space, setSpace] = useState(
    spaceData || {
      id: spaceId || '',
      name: 'Chat Space',
      interactionType: 'chat',
      memberCount: 0,
      isJoined: false,
      description: '',
      communityId: '',
      communityName: 'Community',
    }
  );

  // Real-time chat integration (memoize to prevent re-renders)
  const chat = useSpaceChat(
    spaceId || '',
    space.name,
    space.communityId
  );

  // Get current conversation data (memoize to prevent infinite loops)
  const conversation = useCallback(() => {
    return chat.getConversation(chat.conversationId);
  }, [chat.conversationId, chat.conversations]);

  const conversationData = conversation();
  const messages = conversationData?.messages || [];
  const typingUsers = conversationData?.typingUsers || [];
  const isLoadingMessages = conversationData?.isLoading || false;

  // Initialize chat on mount (prevent multiple initializations)
  useEffect(() => {
    let isMounted = true;
    let initializationTimeout: ReturnType<typeof setTimeout>;

    const initialize = async () => {
      if (isMounted && spaceId && user?.id) {
        // Add a delay to prevent rapid initialization attempts
        initializationTimeout = setTimeout(async () => {
          if (isMounted) {
            await initializeChat();
          }
        }, 200);
      }
    };

    initialize();

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
      isMounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [spaceId, user?.id]); // Only depend on spaceId and user.id

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Animate connection status
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: chat.isConnected ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [chat.isConnected]);

  // Initialize chat connection
  const initializeChat = async () => {
    try {
      if (!user?.id) {
        console.error('❌ [ChatScreen] User not authenticated');
        Alert.alert('Error', 'Please log in to access chat.');
        return;
      }

      if (!spaceId) {
        console.error('❌ [ChatScreen] No space ID provided');
        Alert.alert('Error', 'Invalid space. Please try again.');
        return;
      }

      console.log('🚀 [ChatScreen] Initializing chat for space:', spaceId);

      // Ensure chat is connected before loading messages
      if (!chat.isConnected) {
        console.log('🔄 [ChatScreen] Connecting to chat service...');
        await chat.connect();

        // Wait for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Load initial messages only if we have a conversation ID
      if (chat.conversationId) {
        console.log('📥 [ChatScreen] Loading initial messages...');

        // Try to load messages with retry logic
        let retries = 3;
        while (retries > 0) {
          try {
            await chat.loadMessages(chat.conversationId);
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            console.warn(`⚠️ [ChatScreen] Message loading failed, retries left: ${retries}`, error);
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }

      console.log('✅ [ChatScreen] Chat initialized successfully');

    } catch (error) {
      console.error('❌ [ChatScreen] Failed to initialize chat:', error);
      // Don't show alert for initialization errors, just log them
      console.log('🔄 [ChatScreen] Chat will retry connection automatically');
    }
  };

  // Handle back navigation
  const handleBack = useCallback(() => {
    // Clean up before leaving
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    chat.stopTyping(chat.conversationId);
    router.back();
  }, [chat]);

  // Handle sending messages
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || !user) return;

    console.log('📤 [ChatScreen] Sending message:', inputText.trim());

    // Send message with user context
    const optimisticId = chat.sendMessage({
      conversationId: chat.conversationId,
      content: inputText.trim(),
      type: 'text',
      senderId: user.id,
      senderName: user.username || user.fullName || 'You',
      senderAvatar: user.avatarUrl,
    });

    console.log('✅ [ChatScreen] Message sent with optimistic ID:', optimisticId);

    setInputText('');

    // Stop typing indicator
    chat.stopTyping(chat.conversationId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, user, chat]);

  // Handle input changes with typing indicators
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);

    // Handle typing indicators
    if (text.length > 0) {
      chat.startTyping(chat.conversationId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        chat.stopTyping(chat.conversationId);
      }, 3000);
    } else {
      chat.stopTyping(chat.conversationId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [chat]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, []);

  // Handle input blur
  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    chat.stopTyping(chat.conversationId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [chat]);

  // Handle space join - Simple fix with communityId
  const handleJoinSpace = useCallback(async () => {
    if (!space || !space.id) return;

    // Simple validation
    if (!space.communityId) {
      Alert.alert(
        "Join Failed",
        "Community information missing. Please go back and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setJoiningSpace(true);

      // ✅ SIMPLE FIX: Use communitySpaceApi directly with communityId and spaceId
      await communitySpaceApi.joinSpace(space.communityId, space.id);

      Alert.alert(
        "Welcome!",
        `You've successfully joined ${space.name}. Start chatting!`,
        [{ text: "Start Chatting" }]
      );

      // Update local space state
      setSpace((prevSpace: any) => ({
        ...prevSpace,
        isJoined: true,
        memberCount: (prevSpace?.memberCount || 0) + 1
      }));

      // Initialize chat after joining
      await initializeChat();

    } catch (error) {
      console.error("❌ [ChatScreen] Join failed:", error);
      Alert.alert(
        "Join Failed",
        "Unable to join the space right now. Please try again.",
        [{ text: "Try Again" }]
      );
    } finally {
      setJoiningSpace(false);
    }
  }, [space]);

  // Render individual message
  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwnMessage = item.senderId === user?.id;
    const showAvatar = !isOwnMessage && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const showTimestamp = index === 0 ||
      new Date(item.timestamp).getTime() - new Date(messages[index - 1]?.timestamp).getTime() > 300000; // 5 minutes
// console.log("chat item render =>>>>>>>>>>> ",item)
    return (
      <View className={`px-4 ${showTimestamp ? 'mt-4' : 'mt-1'}`}>
        {showTimestamp && (
          <Text className="text-xs text-center text-gray-500 mb-2">
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        )}

        <View className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1`}>
          {!isOwnMessage && showAvatar && (
            <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-2">
              <Text className="text-white text-xs font-semibold">
                {item.senderName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          {!isOwnMessage && !showAvatar && (
            <View className="w-10" />
          )}

          <View className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            {!isOwnMessage && showAvatar && (
              <Text className="text-xs text-gray-600 mb-1 ml-1">
                {item.senderName}
              </Text>
            )}

            <View
              className={`px-3 py-2 rounded-2xl ${
                isOwnMessage
                  ? 'bg-blue-500 rounded-br-sm'
                  : 'bg-gray-200 dark:bg-gray-700 rounded-bl-sm'
              }`}
            >
              <Text className={`${isOwnMessage ? 'text-white' : 'text-gray-900 dark:text-white'} text-base`}>
                {item.content}
              </Text>
            </View>

            <View className={`flex-row items-center mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <Text className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>

              {isOwnMessage && (
                <MaterialIcons
                  name={
                    item.status === 'read' ? 'done-all' :
                    item.status === 'delivered' ? 'done-all' :
                    item.status === 'sent' ? 'done' :
                    item.status === 'failed' ? 'error' : 'schedule'
                  }
                  size={12}
                  color={
                    item.status === 'read' ? '#3B82F6' :
                    item.status === 'failed' ? '#EF4444' : '#9CA3AF'
                  }
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }, [user?.id, messages]);

  // Render typing indicator
  const renderTypingIndicator = useCallback(() => {
    if (typingUsers.length === 0) return null;

    const typingNames = typingUsers.map(u => u.userName).join(', ');
    const typingText = typingUsers.length === 1
      ? `${typingNames} is typing...`
      : `${typingNames} are typing...`;

    return (
      <View className="px-4 py-2">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-gray-300 items-center justify-center mr-2">
            <Text className="text-gray-600 text-xs">●●●</Text>
          </View>
          <Text className="text-gray-500 text-sm italic">{typingText}</Text>
        </View>
      </View>
    );
  }, [typingUsers]);

  // Determine if user should see join button
  const shouldShowJoinButton = useCallback(() => {
    if (!space) return false;
    return !space.isJoined;
  }, [space]);

  // Show error state
  if (!space || !space.id) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center" style={{ paddingTop: insets.top }}>
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-red-500 text-lg font-semibold mt-4">Space not found</Text>
        <Text className="text-gray-500 text-center mt-2 px-6">
          The chat space you're looking for doesn't exist or has been removed.
        </Text>
        <Pressable onPress={handleBack} className="mt-6 px-6 py-3 bg-blue-500 rounded-xl">
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Show join screen if not joined
  if (shouldShowJoinButton()) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Pressable
                onPress={handleBack}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
              >
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </Pressable>

              {/* ✅ CLICKABLE SPACE INFO - Tap to open info screen */}
              <Pressable
                onPress={() => router.push({
                  pathname: `/space-info/${space.communityId}/${space.id}` as any,
                  params: { spaceData: JSON.stringify(space) }
                })}
                className="flex-1 active:scale-[0.98] active:opacity-80"
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xl font-bold text-gray-900 dark:text-white">
                      {space.name}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      Chat Space • {space.memberCount} members
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Tap for space info & member management
                    </Text>
                  </View>

                  {/* Info Icon Hint */}
                  <MaterialIcons name="info-outline" size={20} color="#6B7280" />
                </View>
              </Pressable>
            </View>

            <View className="flex-row items-center space-x-2">
              <MaterialIcons name="chat" size={24} color="#3B82F6" />
            </View>
          </View>
        </View>

        {/* Join Content */}
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 bg-blue-500/20 rounded-full items-center justify-center mb-6">
            <MaterialIcons name="chat" size={40} color="#3B82F6" />
          </View>

          <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Join to Chat
          </Text>

          <Text className="text-lg text-gray-600 dark:text-gray-400 text-center mb-4">
            {space.name}
          </Text>

          <Text className="text-sm text-gray-500 dark:text-gray-500 text-center max-w-xs mb-6">
            Join this space to start chatting with other members in real-time.
          </Text>

          {space.description && (
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 max-w-sm">
              <Text className="text-gray-700 dark:text-gray-300 text-center">
                {space.description}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleJoinSpace}
            disabled={joiningSpace}
            className={`py-4 px-8 rounded-2xl active:scale-95 bg-blue-500 ${joiningSpace ? "opacity-70" : ""}`}
          >
            <Text className="text-white font-bold text-center text-lg">
              {joiningSpace ? "⏳ Joining..." : "💬 Join Chat Space"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Show loading state while connecting
  if (!chat.isConnected) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-3">
              <Pressable
                onPress={handleBack}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
              >
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </Pressable>

              <View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  {space.name}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Chat Space • {space.memberCount} members
                </Text>
              </View>
            </View>

            <View className="flex-row items-center space-x-2">
              <View
                className={`w-2 h-2 rounded-full ${
                  chat.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </View>
          </View>
        </View>

        {/* Loading Content */}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-500 mt-4">Connecting to chat...</Text>
        </View>
      </View>
    );
  }

  // Main chat interface
  return (
    <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: hideHeader ? 0 : insets.top }}>
      {/* Header - Only show if not hidden */}
      {!hideHeader && (
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-3">
            <Pressable
              onPress={handleBack}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
            >
              <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
            </Pressable>

            <View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                {space.name}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Chat Space • {space.memberCount} members
              </Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            <View
              className={`w-2 h-2 rounded-full ${
                chat.isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <TouchableOpacity>
              <MaterialIcons name="more-vert" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      )}

      {/* Connection Status Overlay */}
      <Animated.View
        className="absolute top-20 left-4 right-4 z-10"
        style={{ opacity: fadeAnim }}
      >
        <View className="bg-red-500 rounded-lg px-4 py-2">
          <Text className="text-white text-center font-medium">
            {chat.isConnecting ? 'Connecting...' : 'Disconnected'}
          </Text>
        </View>
      </Animated.View>

      {/* Messages */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || item.optimisticId || item.timestamp}
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingMessages}
              onRefresh={() => chat.loadMessages(chat.conversationId)}
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
        <View
          className="border-t border-gray-200 bg-white px-4 py-2"
          style={{ paddingBottom: Math.max(keyboardHeight > 0 ? 8 : 12, 12) }}
        >
          <View className="flex-row items-end space-x-2">
            <View className="flex-1 bg-gray-100 rounded-full px-4 py-2">
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={`Message ${space.name}...`}
                multiline
                maxLength={2000}
                className="text-base text-gray-900 max-h-24"
                style={{
                  fontSize: 16,
                  lineHeight: 20,
                  textAlignVertical: 'center'
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputText.trim() || !chat.isConnected}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() && chat.isConnected
                  ? 'bg-blue-500'
                  : 'bg-gray-300'
              }`}
            >
              <MaterialIcons
                name="send"
                size={20}
                color={inputText.trim() && chat.isConnected ? 'white' : '#9CA3AF'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ✅ SPACE INFO - Now uses dedicated route /space-info/[communityId]/[spaceId] */}
    </View>
  );
};

export default ChatScreen;
