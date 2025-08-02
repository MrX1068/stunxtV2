import React, { useState, useEffect } from 'react';
import { FlatList, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
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

interface PostSpaceProps {
  space: Space;
  posts?: Post[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function PostSpace({ space, posts = [], isLoading = false, onRefresh }: PostSpaceProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  const handleLikePost = (postId: string) => {
    // TODO: Implement like functionality with API
    console.log('Like post:', postId);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Box className="bg-background-0 border-b border-outline-100 px-6 py-5">
      <VStack space="md">
        {/* Header */}
        <HStack className="justify-between items-start">
          <HStack space="md" className="flex-1">
            <Box className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
              <Text size="sm" className="text-primary-600 font-bold">
                {item.author.fullName.charAt(0).toUpperCase()}
              </Text>
            </Box>
            
            <VStack className="flex-1">
              <HStack space="xs" className="items-center">
                <Text size="sm" className="font-semibold text-typography-900">
                  {item.author.fullName}
                </Text>
              </HStack>
              <Text size="xs" className="text-typography-500">
                {formatTime(item.createdAt)}
              </Text>
            </VStack>
          </HStack>
        </HStack>

        {/* Content */}
        <VStack space="sm">
          <Text size="lg" className="font-bold text-typography-900">
            {item.title}
          </Text>
          <Text className="text-typography-700 leading-relaxed">
            {item.content}
          </Text>
          
          {/* Tags */}
          {item.tags.length > 0 && (
            <HStack space="xs" className="flex-wrap">
              {item.tags.map((tag, index) => (
                <Box 
                  key={index}
                  className="bg-primary-50 border border-primary-200 px-2 py-1 rounded-full"
                >
                  <Text size="xs" className="text-primary-700">
                    #{tag}
                  </Text>
                </Box>
              ))}
            </HStack>
          )}
        </VStack>

        {/* Actions */}
        <HStack className="justify-between items-center pt-2">
          <HStack space="lg">
            <Button
              variant="link"
              size="sm"
              onPress={() => handleLikePost(item.id)}
              className="p-0"
            >
              <HStack space="xs" className="items-center">
                <MaterialIcons 
                  name={item.isLiked ? "favorite" : "favorite-border"} 
                  size={18} 
                  color={item.isLiked ? "#EF4444" : "#6B7280"} 
                />
                <Text 
                  size="sm" 
                  className={`${item.isLiked ? 'text-error-600' : 'text-typography-600'}`}
                >
                  {item.likeCount}
                </Text>
              </HStack>
            </Button>

            <Button variant="link" size="sm" className="p-0">
              <HStack space="xs" className="items-center">
                <MaterialIcons name="chat-bubble-outline" size={18} color="#6B7280" />
                <Text size="sm" className="text-typography-600">
                  {item.commentCount}
                </Text>
              </HStack>
            </Button>
          </HStack>

          <Button variant="link" size="sm" className="p-0">
            <MaterialIcons name="share" size={18} color="#6B7280" />
          </Button>
        </HStack>
      </VStack>
    </Box>
  );

  const renderHeader = () => (
    <Box className="px-6 py-4 bg-primary-50 dark:bg-primary-900/20 border-b border-outline-100">
      <VStack space="sm">
        <HStack space="sm" className="items-center">
          <MaterialIcons name="article" size={20} color="#6366F1" />
          <Text size="lg" className="font-bold text-typography-900">
            Posts & Announcements
          </Text>
        </HStack>
        <Text size="sm" className="text-typography-600">
          Stay updated with the latest posts and announcements from this space.
        </Text>
      </VStack>
    </Box>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <Box className="items-center justify-center py-12 px-6">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text size="sm" className="text-typography-500 text-center mt-4">
            Loading posts...
          </Text>
        </Box>
      );
    }

    return (
      <Box className="items-center justify-center py-12 px-6">
        <MaterialIcons name="article" size={64} color="#D1D5DB" />
        <Text size="lg" className="font-bold mt-4 mb-2 text-center">
          No Posts Yet
        </Text>
        <Text className="text-typography-500 text-center">
          This space doesn't have any posts yet. Check back later for updates!
        </Text>
      </Box>
    );
  };

  return (
    <VStack className="flex-1">
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
        }}
      />
    </VStack>
  );
}
