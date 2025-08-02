import React, { useState } from 'react';
import { FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { MaterialIcons } from '@expo/vector-icons';
import type { Space, Post } from '@/stores';

interface FeedSpaceProps {
  space: Space;
  posts?: Post[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function FeedSpace({ space, posts = [], isLoading = false, onRefresh }: FeedSpaceProps) {
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
        <HStack space="md" className="items-center">
          <Box className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
            <Text size="md" className="text-primary-600 font-bold">
              {item.author.fullName.charAt(0).toUpperCase()}
            </Text>
          </Box>
          
          <VStack className="flex-1">
            <Text size="md" className="font-semibold text-typography-900">
              {item.author.fullName}
            </Text>
            <Text size="sm" className="text-typography-500">
              {formatTime(item.createdAt)}
            </Text>
          </VStack>

          <Button variant="link" size="sm" className="p-0">
            <MaterialIcons name="more-vert" size={20} color="#6B7280" />
          </Button>
        </HStack>

        {/* Content */}
        <VStack space="sm">
          {item.title && (
            <Text size="lg" className="font-bold text-typography-900">
              {item.title}
            </Text>
          )}
          <Text className="text-typography-700 leading-relaxed">
            {item.content}
          </Text>
          
          {/* Featured Image */}
          {item.featuredImage && (
            <Box className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              {/* Image placeholder - replace with actual Image component when needed */}
              <Box className="flex-1 items-center justify-center">
                <MaterialIcons name="image" size={48} color="#D1D5DB" />
              </Box>
            </Box>
          )}
          
          {/* Tags */}
          {item.tags.length > 0 && (
            <HStack space="xs" className="flex-wrap">
              {item.tags.map((tag: string, index: number) => (
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
                  size={20} 
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
                <MaterialIcons name="chat-bubble-outline" size={20} color="#6B7280" />
                <Text size="sm" className="text-typography-600">
                  {item.commentCount}
                </Text>
              </HStack>
            </Button>
          </HStack>

          <Button variant="link" size="sm" className="p-0">
            <MaterialIcons name="share" size={20} color="#6B7280" />
          </Button>
        </HStack>
      </VStack>
    </Box>
  );

  const renderHeader = () => (
    <Box className="px-6 py-4 bg-primary-50 dark:bg-primary-900/20 border-b border-outline-100">
      <VStack space="sm">
        <HStack space="sm" className="items-center">
          <MaterialIcons name="dynamic-feed" size={20} color="#6366F1" />
          <Text size="lg" className="font-bold text-typography-900">
            Community Feed
          </Text>
        </HStack>
        <Text size="sm" className="text-typography-600">
          Stay updated with the latest posts and activities from this space.
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
            Loading feed...
          </Text>
        </Box>
      );
    }

    return (
      <Box className="items-center justify-center py-12 px-6">
        <MaterialIcons name="dynamic-feed" size={64} color="#D1D5DB" />
        <Text size="lg" className="font-bold mt-4 mb-2 text-center">
          No Posts Yet
        </Text>
        <Text className="text-typography-500 text-center">
          This feed is empty. Share something to get the conversation started!
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
