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
  const { currentSpace, fetchSpace, fetchSpaceContent, joinSpace, leaveSpace, createSpacePost, spaceContents, isLoading, isLoadingContent, error } = useSpaces();
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
    stopTyping,
    forceClearChatData,
    activeConversationId
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
  
  // ✅ CRITICAL FIX: Debounce debug logs to prevent spam
  const [lastDebugTime, setLastDebugTime] = useState(0);
  const debugState = () => {
    const now = Date.now();
    if (now - lastDebugTime > 1000) { // Only log every 1 second
      console.log("🔍 DEBUG STATE:", { 
        id, 
        conversationId, 
        currentSpaceId: currentSpace?.id, 
        messagesCount: conversationId ? (messages[conversationId]?.length || 0) : 0,
        spaceContentsCount: currentSpace?.id ? (spaceContents[currentSpace.id]?.length || 0) : 0,
        connectionStatus: connectionStatus.connected
      });
      setLastDebugTime(now);
    }
  };
  
  // Call debug state only when needed
  React.useEffect(() => {
    debugState();
  }, [id, conversationId, currentSpace?.id, messages, connectionStatus.connected]);
  useEffect(() => {
    // 🚀 CRITICAL FIX: Instant space navigation with immediate conversation setup
    if (id) {
      const newConversationId = `space-${id}`;
      const previousConversationId = conversationId;
      
      console.log('🔄 Navigating to space:', id, 'from previous:', previousConversationId);
      
      // STEP 1: Immediately set the new conversation ID for instant UI update
      if (previousConversationId !== newConversationId) {
        if (previousConversationId) {
          console.log('🗑️ Clearing previous conversation:', previousConversationId);
          // Clear only memory state, preserve SQLite cache
          useChatStore.setState((state) => {
            delete state.messages[previousConversationId];
            if (state.activeConversationId === previousConversationId) {
              state.activeConversationId = null;
              state.activeConversation = null;
            }
          });
        }
        
        // Immediately set new conversation ID to prevent stale state
        setConversationId(newConversationId);
      }
      
      // STEP 2: Reset UI state
      setIsConnecting(false);
      setChatMessage('');
      
      // STEP 3: Fetch space data in parallel with cache loading
      fetchSpace(id);
    }
    
    // Cleanup function - only clear on component unmount
    return () => {
      // Only cleanup if we're actually leaving the component
      if (conversationId) {
        console.log('🧹 Component unmounting, cleaning up:', conversationId);
        clearSpaceChatState(conversationId);
      }
    };
  }, [id]);

  // ✅ CRITICAL FIX: Handle interaction type changes (post ↔ chat)
  useEffect(() => {
    if (currentSpace?.id) {
      const expectedConversationId = `space-${currentSpace.id}`;
      
      if (currentSpace.interactionType === 'chat') {
        // Switching TO chat - ensure proper initialization
        if (!conversationId || conversationId !== expectedConversationId) {
          console.log('🔄 Switching to chat mode, initializing conversation:', expectedConversationId);
          
          // Force clear all chat data for clean switch
          useChatStore.getState().forceClearChatData();
          
          setConversationId(expectedConversationId);
        }
      } else {
        // Switching FROM chat - clear chat state completely
        if (conversationId) {
          console.log('🗑️ Switching from chat mode, clearing conversation:', conversationId);
          
          // Use the new force clear method for complete cleanup
          useChatStore.getState().forceClearChatData();
          
          setConversationId(null);
          setChatMessage('');
        }
      }
    }
  }, [currentSpace?.id, currentSpace?.interactionType]);

  // Sync space content with chat messages for chat spaces (optimized)
  useEffect(() => {
    if (currentSpace?.interactionType === 'chat' && 
        currentSpace.id && 
        spaceContents[currentSpace.id] && 
        Array.isArray(spaceContents[currentSpace.id]) && 
        spaceContents[currentSpace.id].length > 0 &&
        conversationId === `space-${currentSpace.id}`) {
      
      // ✅ CRITICAL FIX: Only sync once and don't interfere with real-time messages
      const existingMessages = messages[conversationId] || [];
      const hasApiMessages = existingMessages.some(msg => !msg.optimisticId);
      
      // Only sync API messages if we don't already have them
      if (!hasApiMessages) {
        console.log('🔄 Syncing API messages to chat store for space:', currentSpace.id);
        syncSpaceMessages(currentSpace.id, spaceContents[currentSpace.id]);
      }
    }
  }, [currentSpace?.id, spaceContents]);

  // Clear chat state when switching spaces to prevent cache confusion
  useEffect(() => {
    return () => {
      if (currentSpace?.id && currentSpace.interactionType === 'chat') {
        clearSpaceChatState(currentSpace.id);
      }
    };
  }, [currentSpace?.id]);

  // Setup chat conversation for chat spaces
  useEffect(() => {
    if (currentSpace?.interactionType === 'chat' && currentSpace.id) {
      const expectedConversationId = `space-${currentSpace.id}`;
      
      // ✅ CRITICAL FIX: Always initialize if conversation ID doesn't match current space
      if (!conversationId || conversationId !== expectedConversationId) {
        console.log('🚀 Space chat needs initialization:', {
          currentSpaceId: currentSpace.id,
          conversationId,
          expectedConversationId
        });
        initializeSpaceChat();
      }
    }
  }, [currentSpace?.id, currentSpace?.interactionType, conversationId]);

  // Monitor connection status for chat spaces
  useEffect(() => {
    if (currentSpace?.interactionType === 'chat') {
    

      // Start periodic status checking
      const statusCheckInterval = setInterval(() => {
       
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
      console.log('🚀 Initializing space chat for:', currentSpace.id);
      
      // ✅ CRITICAL FIX: Always use current space ID for conversation ID
      const convId = `space-${currentSpace.id}`;
      
      // Update local state if different
      if (conversationId !== convId) {
        console.log('🔄 Updating conversation ID from', conversationId, 'to', convId);
        setConversationId(convId);
      }
      
      // ✅ CRITICAL FIX: Force active conversation update AND load cache in parallel for speed
      const [, cachedMessages] = await Promise.all([
        // Force update active conversation
        Promise.resolve(useChatStore.getState().forceUpdateActiveConversation(convId)),
        // Load cache immediately in parallel
        loadMessagesFromCache(convId)
      ]);
      
      console.log(`⚡ [ChatStore] Loaded ${cachedMessages.length} messages from cache in parallel`);
      
      // Background operations - don't block UI
      Promise.all([
        // Connect to WebSocket if needed
        connectionStatus.connected ? Promise.resolve() : connect(user.id),
        // Join space chat
        joinSpaceChat(currentSpace.id, currentSpace.name, currentSpace.communityId)
      ]).then(() => {
        console.log('✅ Space chat initialized successfully');
      }).catch((error) => {
        console.error('❌ Background chat initialization failed:', error);
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize space chat:', error);
    }
  };

  const handleRefreshContent = async () => {
    if (!currentSpace?.id || !currentSpace?.communityId) return;
    
    setRefreshing(true);
    try {
      const contentType = getContentType();
      await fetchSpaceContent({ 
        spaceId: currentSpace.id, 
        communityId: currentSpace.communityId, 
        type: contentType 
      });
    } catch (error) {
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
  
  // ✅ CRITICAL FIX: Override permission for owners and add debugging
  const actualCanSendMessage = canSendMessage || isOwner || (currentSpace?.isJoined && currentSpace?.interactionType === 'chat');
  
  // ✅ CRITICAL FIX: Debounce permission debug logs
  const [lastPermissionDebugTime, setLastPermissionDebugTime] = useState(0);
  const debugPermissions = () => {
    const now = Date.now();
    if (now - lastPermissionDebugTime > 2000) { // Only log every 2 seconds
      console.log('🔍 Permission Debug:', {
        userId: user?.id,
        spaceId: currentSpace?.id,
        ownerId: currentSpace?.ownerId,
        isOwner,
        isJoined: currentSpace?.isJoined,
        memberRole: currentSpace?.memberRole,
        interactionType: currentSpace?.interactionType,
        canSendMessage,
        actualCanSendMessage
      });
      setLastPermissionDebugTime(now);
    }
  };
  
  // Call permission debug only when relevant values change
  React.useEffect(() => {
    if (currentSpace && user) {
      debugPermissions();
    }
  }, [currentSpace?.id, currentSpace?.isJoined, actualCanSendMessage]);

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
    if (!chatMessage.trim() || !conversationId || !currentSpace || !user) return;

    console.log('🔍 USER DEBUG:', {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl
    });

    try {
      // For space chat, send via WebSocket and create optimistic message
      if (currentSpace.interactionType === 'chat') {
        
        // ✅ CRITICAL FIX: Provide all required user data for SQLite
        const optimisticId = sendMessageToConversation({
          conversationId,
          content: chatMessage.trim(),
          type: 'text',
          senderId: user.id,
          senderName: user.username || user.fullName || 'Unknown User',
          senderAvatar: user.avatarUrl || ''
        });
     
        setChatMessage('');
        
        // TODO: When backend space messaging is implemented, also send via API
        // await api.post(`/communities/${currentSpace.communityId}/spaces/${currentSpace.id}/messages`, {
        //   content: chatMessage.trim(),
        //   type: 'text'
        // });
      } else {
        // Fallback for non-space conversations
        await sendMessage(chatMessage.trim(), 'text');
        setChatMessage('');
      }
    } catch (error) {
      console.error('❌ Send message error:', error);
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
      await fetchSpaceContent({ 
        spaceId: currentSpace.id, 
        communityId: currentSpace.communityId, 
        type: 'posts' 
      });
      
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  };

  const handleTypingStart = () => {
    console.log('🔍 TYPING START DEBUG:', {
      conversationId,
      connected: connectionStatus.connected,
      actualCanSendMessage,
      isOwner,
      userId: user?.id
    });
    
    if (conversationId && connectionStatus.connected && actualCanSendMessage) {
      // Only set active conversation once when starting typing
      const currentActiveId = useChatStore.getState().activeConversationId;
      if (currentActiveId !== conversationId) {
        console.log('🔄 Setting active conversation for typing:', conversationId);
        useChatStore.getState().setActiveConversation(conversationId);
      }
      
      console.log('📝 Starting typing indicator...');
      useChatStore.getState().startTyping();
      
      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set a timeout to stop typing after 2 seconds of inactivity
      const timeout = setTimeout(() => {
        handleTypingStop();
      }, 2000);
      
      setTypingTimeout(timeout);
    } else {
      console.log('❌ Cannot start typing:', {
        hasConversationId: !!conversationId,
        isConnected: connectionStatus.connected,
        canSend: actualCanSendMessage
      });
    }
  };

  const handleTypingStop = () => {
    if (conversationId && connectionStatus.connected) {
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
                            No messages yetss
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
                    placeholder={actualCanSendMessage ? "Type a message..." : "Join space to send messages"}
                    value={chatMessage}
                    onChangeText={(text) => {
                      setChatMessage(text);
                      // Only trigger typing when actually typing (not deleting to empty)
                      if (text.length > 0 && connectionStatus.connected && actualCanSendMessage) {
                        handleTypingStart();
                      }
                    }}
                    onFocus={() => {
                      // Start typing indicator when focusing if there's content
                      if (chatMessage.length > 0 && connectionStatus.connected && actualCanSendMessage) {
                        handleTypingStart();
                      }
                    }}
                    onBlur={handleTypingStop}
                    multiline={true}
                    textAlignVertical="center"
                    editable={connectionStatus.connected && actualCanSendMessage}
                  />
                  <TouchableOpacity 
                    className={`w-10 h-10 rounded-full items-center justify-center ${
                      chatMessage.trim() && connectionStatus.connected && actualCanSendMessage
                        ? 'bg-blue-500' 
                        : 'bg-gray-300'
                    }`}
                    onPress={handleSendMessage}
                    disabled={!chatMessage.trim() || !connectionStatus.connected || !actualCanSendMessage}
                  >
                    <MaterialIcons 
                      name="send" 
                      size={20} 
                      color={chatMessage.trim() && connectionStatus.connected && actualCanSendMessage ? 'white' : 'gray'} 
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

                  {spaceContents[currentSpace?.id] && spaceContents[currentSpace.id].length > 0 ? (
                    <VStack space="md">
                      {spaceContents[currentSpace.id].map((item: any, index: number) => (
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
