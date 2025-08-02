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

interface ForumSpaceProps {
  space: Space;
  threads?: Post[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ForumSpace({ space, threads = [], isLoading = false, onRefresh }: ForumSpaceProps) {
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

  const renderThread = ({ item }: { item: Post }) => (
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
          <Text className="text-typography-700 leading-relaxed" numberOfLines={3}>
            {item.content}
          </Text>
          
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

        {/* Thread Stats */}
        <HStack className="justify-between items-center pt-2">
          <HStack space="lg">
            <HStack space="xs" className="items-center">
              <MaterialIcons name="chat-bubble-outline" size={16} color="#6B7280" />
              <Text size="sm" className="text-typography-600">
                {item.commentCount} replies
              </Text>
            </HStack>

            <HStack space="xs" className="items-center">
              <MaterialIcons name="visibility" size={16} color="#6B7280" />
              <Text size="sm" className="text-typography-600">
                {item.viewCount} views
              </Text>
            </HStack>
          </HStack>

          <Button variant="link" size="sm" className="p-0">
            <MaterialIcons name="arrow-forward" size={16} color="#6366F1" />
          </Button>
        </HStack>

        {/* Last Activity */}
        <Box className="bg-background-50 dark:bg-background-900/50 px-3 py-2 rounded-lg">
          <HStack className="justify-between items-center">
            <Text size="xs" className="text-typography-500">
              Last activity: {formatTime(item.updatedAt)}
            </Text>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );

  const renderHeader = () => (
    <Box className="px-6 py-4 bg-primary-50 dark:bg-primary-900/20 border-b border-outline-100">
      <VStack space="sm">
        <HStack space="sm" className="items-center">
          <MaterialIcons name="forum" size={20} color="#6366F1" />
          <Text size="lg" className="font-bold text-typography-900">
            Discussion Forum
          </Text>
        </HStack>
        <Text size="sm" className="text-typography-600">
          Join discussions, ask questions, and connect with the community.
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
            Loading discussions...
          </Text>
        </Box>
      );
    }

    return (
      <Box className="items-center justify-center py-12 px-6">
        <MaterialIcons name="forum" size={64} color="#D1D5DB" />
        <Text size="lg" className="font-bold mt-4 mb-2 text-center">
          No Discussions Yet
        </Text>
        <Text className="text-typography-500 text-center">
          Be the first to start a discussion in this forum!
        </Text>
      </Box>
    );
  };

  return (
    <VStack className="flex-1">
      <FlatList
        data={threads}
        renderItem={renderThread}
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
