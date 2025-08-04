import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, ActivityIndicator, RefreshControl, View, TouchableOpacity, StatusBar, Alert, TextInput } from 'react-native';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { MaterialIcons } from '@expo/vector-icons';
import { useSpaces, useAuth, useChatStore } from '@/stores';
import { PermissionManager } from '@/utils/permissions';
import type { Space } from '@/stores';
import EmojiPicker from '@/components/chat/EmojiPicker';

export default function SpaceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentSpace, fetchSpace, fetchSpaceContent, joinSpace, leaveSpace, createSpacePost, spaceContent, isLoading, isLoadingContent, error } = useSpaces();
  const { user } = useAuth();
  const { 
    connect, 
    joinSpaceChat, 
    sendMessage, 
    sendMessageToConversation,
    messages, 
    connectionStatus, 
    spaceConversations,
    syncSpaceMessages,
    clearSpaceChatState,
    loadMessagesFromCache,
    retryFailedMessages,
    typingUsers,
    startTyping,
    stopTyping
  } = useChatStore();
  
  const [isJoining, setIsJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 🚀 Professional Space Navigation Cleanup - Reset conversation state when space changes
    if (id) {
      // Clear previous space conversation state immediately using professional cache system
      const previousConversationId = conversationId;
      setConversationId(null);
      setIsConnecting(false);
      
      // Clear previous space chat state if it exists
      if (previousConversationId) {
        console.log('🧹 Clearing previous space chat state:', previousConversationId);
        clearSpaceChatState(previousConversationId);
      }
      
      // Fetch new space data
      fetchSpace(id);
      
      console.log('🔄 Professional space navigation cleanup completed for space:', id);
    }
    
    // Cleanup function when component unmounts or space ID changes
    return () => {
      console.log('🧹 Cleaning up space detail screen state');
      if (conversationId) {
        clearSpaceChatState(conversationId);
      }
      setConversationId(null);
      setIsConnecting(false);
    };
  }, [id]);

  // Sync space content with chat messages for chat spaces (optimized)
  useEffect(() => {
    if (currentSpace?.interactionType === 'chat' && 
        currentSpace.id && 
        spaceContent && 
        Array.isArray(spaceContent) && 
        spaceContent.length > 0) {
      console.log('🔄 Syncing space content with chat messages');
      // Use a timeout to debounce rapid updates
      const timeoutId = setTimeout(() => {
        syncSpaceMessages(currentSpace.id, spaceContent);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentSpace?.id, currentSpace?.interactionType, spaceContent?.length]);

  // Clear chat state when switching spaces to prevent cache confusion
  useEffect(() => {
    return () => {
      if (currentSpace?.id && currentSpace.interactionType === 'chat') {
        console.log('🧹 Cleaning up chat state for space:', currentSpace.id);
        clearSpaceChatState(currentSpace.id);
      }
    };
  }, [currentSpace?.id]);

  // Setup chat conversation for chat spaces
  useEffect(() => {
    if (currentSpace?.interactionType === 'chat' && currentSpace.id && !conversationId) {
      initializeSpaceChat();
    }
  }, [currentSpace?.id, currentSpace?.interactionType, conversationId]);

  // Monitor connection status for chat spaces
  useEffect(() => {
    if (currentSpace?.interactionType === 'chat') {
      console.log('🔍 Connection Status Monitor:', {
        connected: connectionStatus.connected,
        connecting: connectionStatus.connecting,
        error: connectionStatus.error,
        conversationId,
        spaceId: currentSpace.id,
        spaceName: currentSpace.name
      });

      // Start periodic status checking
      const statusCheckInterval = setInterval(() => {
        console.log('🔄 Periodic connection status refresh');
        useChatStore.getState().refreshConnectionStatus();
      }, 5000); // Check every 5 seconds

      return () => {
        clearInterval(statusCheckInterval);
      };
    }
  }, [connectionStatus, conversationId, currentSpace?.interactionType]);

  const initializeSpaceChat = async () => {
    if (!currentSpace?.id || !user) return;
    
    try {
      setIsConnecting(true);
      console.log('🚀 Initializing space chat for:', currentSpace.name);
      
      // Get conversation ID first (this is fast)
      const convId = `space-${currentSpace.id}`;
      setConversationId(convId);
      
      // Load cached messages immediately for instant display
      await loadMessagesFromCache(convId);
      console.log('✅ Messages loaded from professional cache for conversation:', convId);
      
      // Connect to WebSocket in parallel (don't block UI)
      const connectPromise = connectionStatus.connected 
        ? Promise.resolve()
        : connect(user.id);
      
      // Join space chat in parallel
      const joinPromise = joinSpaceChat(
        currentSpace.id, 
        currentSpace.name, 
        currentSpace.communityId
      );
      
      // Wait for both operations
      await Promise.all([connectPromise, joinPromise]);
      
      console.log('✅ Space chat initialized, conversation ID:', convId);
      
    } catch (error) {
      console.error('❌ Failed to initialize space chat:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshContent = async () => {
    if (!currentSpace?.id) return;
    
    setRefreshing(true);
    try {
      const contentType = getContentType();
      await fetchSpaceContent(currentSpace.id, contentType);
    } catch (error) {
      console.error('Failed to refresh content:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getContentType = (): 'messages' | 'posts' => {
    if (!currentSpace) return 'posts';
    return currentSpace.interactionType === 'chat' ? 'messages' : 'posts';
  };

  const handleJoinSpace = async () => {
    if (!currentSpace || !id) return;
    
    try {
      setIsJoining(true);
      await joinSpace(id);
      
      // Refresh space data to get updated isJoined status
      await fetchSpace(id);
      await handleRefreshContent();
    } catch (error) {
      console.error('Failed to join space:', error);
      alert('Failed to join space. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveSpace = async () => {
    if (!currentSpace || !id) return;
    
    try {
      setIsJoining(true);
      await leaveSpace(id);
    } catch (error) {
      console.error('Failed to leave space:', error);
      alert('Failed to leave space. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const getSpaceIcon = () => {
    if (!currentSpace) return 'public';
    
    switch (currentSpace.type) {
      case 'private': return 'lock';
      case 'secret': return 'visibility-off';
      default: return 'public';
    }
  };

  const getInteractionTypeIcon = () => {
    if (!currentSpace) return 'chat';
    
    switch (currentSpace.interactionType) {
      case 'chat': return 'chat';
      case 'post': return 'article';
      case 'forum': return 'forum';
      case 'feed': return 'dynamic-feed';
      default: return 'chat';
    }
  };

  const isOwner = currentSpace?.ownerId === user?.id;
  const canJoin = currentSpace && !currentSpace.isJoined && !isOwner;
  const canLeave = currentSpace && currentSpace.isJoined && !isOwner;
  const canViewContent = currentSpace && (currentSpace.isJoined || isOwner || currentSpace.type === 'public');

  // 🚀 Professional Space Join Logic (Telegram/Discord Pattern)
  const getSpaceJoinActionConfig = () => {
    if (!currentSpace) return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    
    // Owner - no join button needed
    if (isOwner) {
      return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    }
    
    // Already joined - show leave option in settings
    if (currentSpace.isJoined) {
      return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    }
    
    // Privacy-based join actions
    switch (currentSpace.type) {
      case 'public':
        return { 
          show: true, 
          text: '🌍 Join Space', 
          variant: 'solid' as const, 
          color: 'bg-emerald-600',
          description: 'Join this public space and start participating'
        };
      case 'private':
        return { 
          show: true, 
          text: '🔒 Request Access', 
          variant: 'solid' as const, 
          color: 'bg-amber-600',
          description: 'Send access request to space moderators'
        };
      case 'secret':
        return { 
          show: false, 
          text: '', 
          variant: 'solid' as const, 
          color: 'bg-purple-600',
          description: 'This space is invite-only'
        };
      default:
        return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    }
  };

  const spaceJoinActionConfig = getSpaceJoinActionConfig();

  // 🛡️ Professional Role-Based Permissions
  const canCreatePost = PermissionManager.canCreatePostInSpace(user, currentSpace);
  const canSendMessage = PermissionManager.canSendMessageInSpace(user, currentSpace);
  const canManageSpace = PermissionManager.canManageSpace(user, currentSpace);
  
  console.log('🔐 Space Permission Status:', {
    userId: user?.id,
    spaceId: currentSpace?.id,
    canCreatePost,
    canSendMessage,
    canManageSpace,
    userRole: user?.role,
    memberRole: currentSpace?.memberRole,
    isOwner: currentSpace?.ownerId === user?.id,
    isJoined: currentSpace?.isJoined,
    interactionType: currentSpace?.interactionType
  });

  // 🚀 Fetch space content when currentSpace is available AND user has access
  useEffect(() => {
    if (currentSpace?.id && canViewContent) {
      handleRefreshContent();
    }
  }, [currentSpace?.id, currentSpace?.interactionType, canViewContent]);

  // Professional space join handler
  const handleJoinSpaceAction = async () => {
    if (!currentSpace || !spaceJoinActionConfig.show) return;
    
    try {
      setIsJoining(true);
      
      if (currentSpace.type === 'private') {
        // TODO: Implement space access request system
        await joinSpace(currentSpace.id);
        Alert.alert(
          'Request Sent',
          'Your access request has been sent to space moderators. You\'ll be notified when it\'s reviewed.',
          [{ text: 'OK' }]
        );
      } else {
        await joinSpace(currentSpace.id);
        
        // Refresh space data to get updated isJoined status
        await fetchSpace(currentSpace.id);
        
        Alert.alert(
          'Welcome!',
          `You've successfully joined ${currentSpace.name}. ${
            currentSpace.interactionType === 'chat' 
              ? 'Start chatting with other members!' 
              : 'Explore posts and discussions!'
          }`,
          [{ text: 'Start Exploring' }]
        );
      }
    } catch (error) {
      console.error('Failed to join space:', error);
      Alert.alert(
        'Join Failed',
        'Unable to join the space right now. Please try again.',
        [{ text: 'Try Again' }]
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !conversationId || !currentSpace) return;

    console.log('📤 [Space Detail] handleSendMessage called:', {
      message: chatMessage.trim(),
      conversationId,
      spaceId: currentSpace.id,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    try {
      // For space chat, send via WebSocket and create optimistic message
      if (currentSpace.interactionType === 'chat') {
        console.log('💬 [Space Detail] Sending space chat message...');
        
        // Send via WebSocket using the new sendMessageToConversation method
        // This will handle optimistic message creation automatically
        console.log('🌐 [Space Detail] Sending via WebSocket with sendMessageToConversation...');
        const optimisticId = sendMessageToConversation(conversationId, chatMessage.trim(), 'text');
        console.log('✅ [Space Detail] WebSocket send initiated, optimisticId:', optimisticId);
        
        setChatMessage('');
        console.log('✅ [Space Detail] Space message sent successfully');
        
        // TODO: When backend space messaging is implemented, also send via API
        // await api.post(`/communities/${currentSpace.communityId}/spaces/${currentSpace.id}/messages`, {
        //   content: chatMessage.trim(),
        //   type: 'text'
        // });
      } else {
        console.log('💬 [Space Detail] Sending regular message...');
        // Fallback for non-space conversations
        await sendMessage(chatMessage.trim(), 'text');
        setChatMessage('');
      }
    } catch (error) {
      console.error('❌ [Space Detail] Failed to send message:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        conversationId,
        spaceId: currentSpace.id
      });
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleCreatePost = async () => {
    if (!currentSpace || !postTitle.trim() || !postContent.trim()) {
      Alert.alert('Error', 'Please fill in both title and content');
      return;
    }

    try {
      await createSpacePost(currentSpace.id, {
        title: postTitle.trim(),
        content: postContent.trim()
      });
      
      // Clear form and close modal
      setPostTitle('');
      setPostContent('');
      setShowCreatePost(false);
      
      // Refresh content
      await fetchSpaceContent(currentSpace.id);
      
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handleTypingStart = () => {
    if (conversationId) {
      useChatStore.getState().startTyping();
      
      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set a timeout to stop typing after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        handleTypingStop();
      }, 3000);
      
      setTypingTimeout(timeout);
    }
  };

  const handleTypingStop = () => {
    if (conversationId) {
      useChatStore.getState().stopTyping();
      
      // Clear timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setChatMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (isLoading && !currentSpace) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <VStack className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Loading space...</Text>
        </VStack>
      </SafeAreaView>
    );
  }

  if (error && !currentSpace) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <VStack className="flex-1 justify-center items-center p-6">
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-lg font-semibold text-gray-900">Error Loading Space</Text>
          <Text className="mt-2 text-center text-gray-600">{error}</Text>
          <Button 
            onPress={() => id && fetchSpace(id)} 
            className="mt-4 bg-blue-500 px-6 py-2 rounded-lg"
          >
            <ButtonText className="text-white">Try Again</ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    );
  }

  if (!currentSpace) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <VStack className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Space not found</Text>
        </VStack>
      </SafeAreaView>
    );
  }

  // For chat spaces, we'll display messages in the same content view
  // TODO: Implement dedicated ChatScreen component later

  return (
    <SafeAreaView className="flex-1 bg-white" style={{ paddingTop: StatusBar.currentHeight }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <VStack className="flex-1">
        {/* Header */}
        <HStack className="px-4 py-3 border-b border-gray-200 items-center space-x-3">
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <Box className="w-12 h-12 rounded-xl bg-blue-500 items-center justify-center">
            <MaterialIcons 
              name={getInteractionTypeIcon() as any} 
              size={24} 
              color="white" 
            />
          </Box>
          
          <VStack className="flex-1">
            <HStack className="items-center space-x-2">
              <Text className="text-lg font-bold text-gray-900">
                {currentSpace.name}
              </Text>
              <MaterialIcons 
                name={getSpaceIcon() as any} 
                size={16} 
                color="#6B7280" 
              />
            </HStack>
            <Text className="text-sm text-gray-600">
              {currentSpace.memberCount || 0} members • {currentSpace.interactionType}
            </Text>
          </VStack>
          
          <TouchableOpacity>
            <MaterialIcons name="more-vert" size={24} color="#6B7280" />
          </TouchableOpacity>
        </HStack>

        {/* Description */}
        {currentSpace.description && (
          <Box className="px-4 py-3 border-b border-gray-100">
            <Text className="text-gray-700">{currentSpace.description}</Text>
          </Box>
        )}

        {/* RBAC-based Action Buttons */}
        <HStack className="px-4 py-3 border-b border-gray-100 space-x-2">        
          {/* Leave Space Button (Members) */}
          {canLeave && (
            <Button
              onPress={handleLeaveSpace}
              disabled={isJoining}
              className="bg-red-500 rounded-lg flex-1"
            >
              <ButtonText className="text-white font-medium">
                {isJoining ? 'Leaving...' : 'Leave Space'}
              </ButtonText>
            </Button>
          )}
        </HStack>

        {/* Content Area */}
        <Box className="flex-1">
          {!canViewContent ? (
            <VStack className="flex-1 justify-center items-center p-6">
              <MaterialIcons name="lock" size={64} color="#9CA3AF" />
              <Text className="mt-4 text-lg font-semibold text-gray-900">
                Private Space
              </Text>
              <Text className="mt-2 text-center text-gray-600">
                You need to join this space to view its content.
              </Text>
              {canJoin && (
                <Button
                  onPress={handleJoinSpace}
                  disabled={isJoining}
                  className="mt-4 bg-blue-500 rounded-lg"
                >
                  <ButtonText className="text-white font-medium">
                    {isJoining ? 'Joining...' : 'Join Space'}
                  </ButtonText>
                </Button>
              )}
            </VStack>
          ) : (currentSpace as any).interactionType === 'chat' ? (
            // Real-time chat interface for chat-type spaces
            <VStack className="flex-1">
              {/* Connection Status */}
              {isConnecting && (
                <Box className="bg-yellow-100 px-4 py-2 border-b border-yellow-200">
                  <Text className="text-yellow-800 text-sm text-center">
                    🔄 Connecting to chat...
                  </Text>
                </Box>
              )}
              
              {connectionStatus.connected && (
                <Box className="bg-green-100 px-4 py-2 border-b border-green-200">
                  <Text className="text-green-800 text-sm text-center">
                    ✅ Connected to chat • {conversationId ? 'Ready to send messages' : 'Initializing...'}
                  </Text>
                </Box>
              )}
              
              {!connectionStatus.connected && !isConnecting && (
                <Box className="bg-red-100 px-4 py-2 border-b border-red-200">
                  <HStack className="items-center justify-between">
                    <Text className="text-red-800 text-sm flex-1">
                      ⚠️ Disconnected from chat • Tap to retry
                    </Text>
                    <TouchableOpacity 
                      onPress={() => retryFailedMessages(conversationId || undefined)}
                      className="bg-red-600 px-3 py-1 rounded-lg ml-2"
                    >
                      <Text className="text-white text-xs font-semibold">Retry Failed</Text>
                    </TouchableOpacity>
                  </HStack>
                </Box>
              )}

              {/* Messages Area */}
              <ScrollView
                className="flex-1 px-4"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefreshContent}
                    colors={['#3B82F6']}
                  />
                }
              >
                <Box className="py-4">
                  {(() => {
                    // Get messages for this conversation
                    const conversationMessages = conversationId ? messages[conversationId] || [] : [];
                    
                    if (conversationMessages.length > 0) {
                      return (
                        <VStack space="md">
                          {conversationMessages.map((message: any, index: number) => (
                            <Box 
                              key={message.id || index} 
                              className={`rounded-lg p-3 max-w-[80%] ${
                                message.senderId === user?.id 
                                  ? 'bg-blue-500 self-end' 
                                  : 'bg-white border border-gray-200'
                              }`}
                            >
                              <VStack space="xs">
                                {message.senderId !== user?.id && (
                                  <Text className="font-semibold text-gray-900 text-xs">
                                    {message.senderName || 'Anonymous'}
                                  </Text>
                                )}
                                <Text className={`${
                                  message.senderId === user?.id ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {message.content}
                                </Text>
                                <HStack className="items-center justify-between">
                                  <Text className={`text-xs ${
                                    message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                                  }`}>
                                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString() : 'Now'}
                                    {message.status && (
                                      <Text className="ml-1">
                                        {message.status === 'sending' ? '⏳' : 
                                         message.status === 'sent' ? '✓' : 
                                         message.status === 'delivered' ? '✓✓' : 
                                         message.status === 'failed' ? '❌' : ''}
                                      </Text>
                                    )}
                                  </Text>
                                  
                                  {/* 🚀 Professional Retry Button for Failed Messages */}
                                  {message.status === 'failed' && message.senderId === user?.id && (
                                    <TouchableOpacity 
                                      onPress={() => retryFailedMessages(conversationId || undefined)}
                                      className="bg-red-500 px-2 py-1 rounded ml-2"
                                    >
                                      <Text className="text-white text-xs">Retry</Text>
                                    </TouchableOpacity>
                                  )}
                                </HStack>
                              </VStack>
                            </Box>
                          ))}
                        </VStack>
                      );
                    } else {
                      return (
                        <VStack className="justify-center items-center py-12">
                          <MaterialIcons name="chat-bubble-outline" size={64} color="#9CA3AF" />
                          <Text className="mt-4 text-lg font-semibold text-gray-900">
                            No messages yet
                          </Text>
                          <Text className="mt-2 text-center text-gray-600">
                            Be the first to start a conversation in this space.
                          </Text>
                        </VStack>
                      );
                    }
                  })()}
                </Box>
              </ScrollView>
              
              {/* Chat Input */}
              <Box className="border-t border-gray-200 bg-white px-4 py-3">
                {/* Typing Indicators */}
                {(() => {
                  const typingUsers = conversationId ? useChatStore.getState().typingUsers[conversationId] || [] : [];
                  if (typingUsers.length > 0) {
                    return (
                      <Box className="mb-2">
                        <Text className="text-sm text-gray-500 italic">
                          {typingUsers.length === 1 
                            ? `${typingUsers[0].userName} is typing...`
                            : `${typingUsers.length} people are typing...`
                          }
                        </Text>
                      </Box>
                    );
                  }
                  return null;
                })()}
                
                <HStack className="items-end space-x-2">
                  <TouchableOpacity 
                    className="w-10 h-10 rounded-full items-center justify-center bg-gray-100"
                    onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Text className="text-xl">😊</Text>
                  </TouchableOpacity>
                  
                  <TextInput
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 max-h-20"
                    placeholder={canSendMessage ? "Type a message..." : "Join space to send messages"}
                    value={chatMessage}
                    onChangeText={(text) => {
                      setChatMessage(text);
                      handleTypingStart();
                    }}
                    onFocus={handleTypingStart}
                    onBlur={handleTypingStop}
                    multiline={true}
                    textAlignVertical="center"
                    editable={connectionStatus.connected && canSendMessage}
                  />
                  <TouchableOpacity 
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      chatMessage.trim() && connectionStatus.connected && canSendMessage
                        ? 'bg-blue-500' 
                        : 'bg-gray-300'
                    }`}
                    onPress={handleSendMessage}
                    disabled={!chatMessage.trim() || !connectionStatus.connected || !canSendMessage}
                  >
                    <MaterialIcons 
                      name="send" 
                      size={20} 
                      color={chatMessage.trim() && connectionStatus.connected && canSendMessage ? 'white' : 'gray'} 
                    />
                  </TouchableOpacity>
                </HStack>
              </Box>
            </VStack>
          ) : (
            <ScrollView
              className="flex-1"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefreshContent}
                  colors={['#3B82F6']}
                />
              }
            >
              {isLoadingContent ? (
                <VStack className="justify-center items-center py-12">
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text className="mt-4 text-gray-600">Loading content...</Text>
                </VStack>
              ) : (
                <Box className="p-4">
                  {/* 🛡️ Role-Based Create Post Button */}
                  {canViewContent && canCreatePost && (
                    <TouchableOpacity 
                      className="bg-blue-500 rounded-lg p-3 mb-4"
                      onPress={() => setShowCreatePost(true)}
                    >
                      <HStack className="items-center justify-center space-x-2">
                        <MaterialIcons name="add" size={20} color="white" />
                        <Text className="text-white font-medium">Create New Post</Text>
                      </HStack>
                    </TouchableOpacity>
                  )}

                  {spaceContent && spaceContent.length > 0 ? (
                    <VStack space="md">
                      {spaceContent.map((item: any, index: number) => (
                        <Box key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          {/* Display content based on space type */}
                          {currentSpace.interactionType === 'chat' ? (
                            // Chat message layout
                            <VStack space="sm">
                              <HStack className="items-center space-x-2">
                                <Text className="font-semibold text-gray-900 text-sm">
                                  {item.author?.username || item.sender?.username || 'Anonymous'}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : 'Now'}
                                </Text>
                              </HStack>
                              <Text className="text-gray-800">
                                {item.content || item.message || 'Message'}
                              </Text>
                            </VStack>
                          ) : (
                            // Post layout
                            <VStack space="sm">
                              <Text className="font-medium text-gray-900">
                                {item.title || item.content || 'Content'}
                              </Text>
                              {item.content && item.title && (
                                <Text className="text-gray-600">
                                  {item.content}
                                </Text>
                              )}
                              <HStack className="items-center space-x-2">
                                <Text className="text-xs text-gray-500">
                                  By {item.author?.username || 'Anonymous'}
                                </Text>
                                <Text className="text-xs text-gray-500">•</Text>
                                <Text className="text-xs text-gray-500">
                                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}
                                </Text>
                              </HStack>
                            </VStack>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <VStack className="justify-center items-center py-12">
                      <MaterialIcons name="article" size={64} color="#9CA3AF" />
                      <Text className="mt-4 text-lg font-semibold text-gray-900">
                        No content yet
                      </Text>
                      <Text className="mt-2 text-center text-gray-600">
                        Be the first to create a post in this space.
                      </Text>
                    </VStack>
                  )}
                </Box>
              )}
            </ScrollView>
          )}
        </Box>

        {/* Create Post Modal */}
        {showCreatePost && (
          <View 
            className="absolute inset-0 bg-black/50 justify-center items-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <View className="bg-white rounded-lg p-6 m-4 w-11/12 max-w-md">
              <Text className="text-xl font-bold mb-4">Create New Post</Text>
              
              <Text className="text-sm font-medium text-gray-700 mb-2">Title</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-4"
                placeholder="Enter post title"
                value={postTitle}
                onChangeText={setPostTitle}
                multiline={false}
              />
              
              <Text className="text-sm font-medium text-gray-700 mb-2">Content</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-6 min-h-24"
                placeholder="What would you like to share?"
                value={postContent}
                onChangeText={setPostContent}
                multiline={true}
                textAlignVertical="top"
              />
              
              <HStack className="justify-end space-x-3">
                <TouchableOpacity 
                  className="px-4 py-2 rounded-lg border border-gray-300"
                  onPress={() => {
                    setShowCreatePost(false);
                    setPostTitle('');
                    setPostContent('');
                  }}
                >
                  <Text className="text-gray-600">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="px-4 py-2 bg-blue-500 rounded-lg"
                  onPress={handleCreatePost}
                  disabled={!postTitle.trim() || !postContent.trim()}
                  style={{
                    opacity: (!postTitle.trim() || !postContent.trim()) ? 0.5 : 1
                  }}
                >
                  <Text className="text-white font-medium">Create Post</Text>
                </TouchableOpacity>
              </HStack>
            </View>
          </View>
        )}
      </VStack>
      
      {/* 🚀 Professional Bottom Join Button for Spaces (Telegram/Discord Pattern) */}
      {spaceJoinActionConfig.show && (
        <Box className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 shadow-2xl">
          <VStack space="sm">
            {spaceJoinActionConfig.description && (
              <Text size="sm" className="text-center text-gray-600 dark:text-gray-400">
                {spaceJoinActionConfig.description}
              </Text>
            )}
            <Button
              size="lg"
              onPress={handleJoinSpaceAction}
              disabled={isJoining}
              className={`${spaceJoinActionConfig.color} shadow-lg rounded-xl`}
            >
              <ButtonText size="lg" className="text-white font-semibold">
                {isJoining ? '⏳ Processing...' : spaceJoinActionConfig.text}
              </ButtonText>
            </Button>
          </VStack>
        </Box>
      )}
      
      {/* Emoji Picker */}
      <EmojiPicker
        visible={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />
    </SafeAreaView>
  );
}
