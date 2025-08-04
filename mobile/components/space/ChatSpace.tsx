import React, { useState, useRef, useEffect } from 'react';
import { FlatList, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
} from '@/components/ui';
import { MaterialIcons } from '@expo/vector-icons';
import type { Space, Post } from '@/stores';

interface Message {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  type: 'text' | 'image' | 'file';
}

interface ChatSpaceProps {
  space: Space;
  messages?: Post[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ChatSpace({ space, messages: postMessages = [], isLoading = false, onRefresh }: ChatSpaceProps) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Convert posts to messages format
  const messages: Message[] = postMessages.map((post: Post) => ({
    id: post.id,
    content: post.content || post.title,
    authorId: post.authorId,
    authorName: post.author?.fullName || 'Unknown User',
    authorAvatar: post.author?.avatar,
    createdAt: post.createdAt,
    type: 'text' as const,
  }));

  // Show welcome message if no real messages
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      // You can add a welcome message here if needed
    }
  }, [messages.length, isLoading]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    setIsSending(true);
    try {
      // TODO: Send to real API
      // await sendMessageToAPI(space.id, messageText);
      
      setMessageText('');
      
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.authorId === 'current-user';
    const isSystem = item.authorId === 'system';

    if (isSystem) {
      return (
        <Box className="items-center py-2 px-4">
          <Box className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-full">
            <Text size="sm" className="text-gray-600 dark:text-gray-400">
              {item.content}
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box className={`px-4 py-2 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <HStack 
          space="sm" 
          className={`max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
          {!isCurrentUser && (
            <Box className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
              <Text size="xs" className="text-primary-600 font-bold">
                {item.authorName.charAt(0).toUpperCase()}
              </Text>
            </Box>
          )}
          
          <VStack 
            space="xs" 
            className={`${isCurrentUser ? 'items-end' : 'items-start'}`}
          >
            {!isCurrentUser && (
              <Text size="xs" className="text-gray-500 px-3">
                {item.authorName}
              </Text>
            )}
            
            <Box 
              className={`px-4 py-3 rounded-2xl ${
                isCurrentUser 
                  ? 'bg-primary-600 rounded-br-md' 
                  : 'bg-gray-100 dark:bg-gray-800 rounded-bl-md'
              }`}
            >
              <Text 
                className={`${
                  isCurrentUser 
                    ? 'text-white' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                {item.content}
              </Text>
            </Box>
            
            <Text size="xs" className="text-gray-400 px-3">
              {formatTime(item.createdAt)}
            </Text>
          </VStack>
        </HStack>
      </Box>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <VStack className="flex-1">
        {/* Messages List */}
        {isLoading ? (
          <VStack className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text className="mt-4 text-typography-600">Loading messages...</Text>
          </VStack>
        ) : messages.length === 0 ? (
          <VStack className="flex-1 items-center justify-center px-6">
            <MaterialIcons name="chat" size={64} color="#D1D5DB" />
            <Text size="xl" className="font-bold mt-4 mb-2 text-center">No messages yet</Text>
            <Text className="text-typography-600 text-center">
              Be the first to start the conversation in {space.name}!
            </Text>
          </VStack>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 8 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            refreshControl={
              <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={handleRefresh}
                tintColor="#6366F1"
              />
            }
          />
        )}

        {/* Message Input */}
        <Box className="px-4 py-3 border-t border-outline-200 bg-background-0">
          <HStack space="md" className="items-end">
            <Pressable className="p-2">
              <MaterialIcons name="add" size={24} color="#6366F1" />
            </Pressable>
            
            <Box className="flex-1">
              <Input variant="outline" size="md" className="bg-gray-50 dark:bg-gray-800">
                <InputField
                  placeholder="Type a message..."
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={1000}
                  style={{ maxHeight: 100 }}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                />
              </Input>
              
              {messageText.length > 0 && (
                <Text size="xs" className="text-gray-400 mt-1 ml-3">
                  {messageText.length}/1000
                </Text>
              )}
            </Box>

            <Pressable 
              onPress={sendMessage}
              disabled={!messageText.trim() || isSending}
              className={`p-3 rounded-full ${
                messageText.trim() 
                  ? 'bg-primary-600' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <MaterialIcons 
                name="send" 
                size={20} 
                color={messageText.trim() ? 'white' : '#9CA3AF'} 
              />
            </Pressable>
          </HStack>
        </Box>
      </VStack>
    </KeyboardAvoidingView>
  );
}
