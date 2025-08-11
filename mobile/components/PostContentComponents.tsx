import React from 'react';
import { View, Pressable, Text, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { ReactionButton, ReactionSummary } from './reactions/ReactionButton';
import type { SpaceContent } from '../stores/contentStore';

interface PostContentCardProps {
  content: SpaceContent;
  onPress: (content: SpaceContent) => void;
  onAuthorPress: (authorId: string) => void;
  onReactionAdd: (contentId: string, reactionType: string) => void;
  onReactionRemove: (contentId: string, reactionType: string) => void;
  onComment: (contentId: string) => void;
}

/**
 * Post Content Card - Displays individual post content
 */
export function PostContentCard({
  content,
  onPress,
  onAuthorPress,
  onReactionAdd,
  onReactionRemove,
  onComment
}: PostContentCardProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getReadingTime = () => {
    if (content.metadata?.readingTime) {
      return `${content.metadata.readingTime} min read`;
    }
    // Estimate reading time (average 200 words per minute)
    const wordCount = content.content.split(' ').length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    return `${readingTime} min read`;
  };

  return (
    <Pressable 
      onPress={() => onPress(content)}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-3 active:scale-[0.98]"
    >
      <View className="gap-3">
        {/* Author Header */}
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => onAuthorPress(content.author.id)}>
            <Avatar 
              src={content.author.avatarUrl}
              size={40}
              fallbackText={content.author.fullName}
            />
          </Pressable>
          
          <View className="flex-1">
            <Pressable onPress={() => onAuthorPress(content.author.id)}>
              <Text className="font-semibold text-gray-900 dark:text-white">
                {content.author.fullName}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  @{content.author.username}
                </Text>
                {content.space && (
                  <>
                    <Text className="text-sm text-gray-400 dark:text-gray-500">•</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {content.space.name}
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>
          
          <View className="items-end">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {formatTimeAgo(content.createdAt)}
            </Text>
            {content.type === 'post' && (
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {getReadingTime()}
              </Text>
            )}
          </View>
        </View>

        {/* Content */}
        <View className="gap-2">
          {content.title && (
            <Text className="font-bold text-lg text-gray-900 dark:text-white">
              {content.title}
            </Text>
          )}
          
          <Text 
            className="text-gray-700 dark:text-gray-300 leading-relaxed" 
            numberOfLines={content.type === 'post' ? 4 : 2}
          >
            {content.content}
          </Text>
          
          {/* Tags */}
          {content.metadata?.tags && content.metadata.tags.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              <View className="flex-row gap-2">
                {content.metadata.tags.map((tag, index) => (
                  <View 
                    key={index}
                    className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full"
                  >
                    <Text className="text-xs text-blue-600 dark:text-blue-400">
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Actions */}
        <View className="flex-row justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
          <View className="flex-row gap-4">
            {/* Reactions */}
            <ReactionButton
              contentId={content.id}
              currentReaction={content.reactions?.userReaction || content.userReaction}
              reactionCounts={{
                like: content.reactions?.likes || 0,
                love: 0, // TODO: Update content store to support all reaction types
                laugh: 0,
                wow: 0,
                sad: 0,
                angry: 0,
                care: 0,
                celebrate: 0,
                support: 0,
                insightful: 0,
                funny: 0,
                confused: 0,
              }}
              onReactionAdd={onReactionAdd}
              onReactionRemove={onReactionRemove}
              showCounts={true}
              size="sm"
            />
            
            {/* Comments */}
            <Pressable 
              onPress={() => onComment(content.id)}
              className="flex-row items-center gap-1 active:scale-95"
            >
              <MaterialIcons name="chat-bubble-outline" size={20} color="#6B7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {content.comments?.count || 0}
              </Text>
            </Pressable>
            
            {/* Share */}
            <Pressable className="flex-row items-center gap-1 active:scale-95">
              <MaterialIcons name="share" size={20} color="#6B7280" />
            </Pressable>
          </View>
          
          {/* Status indicator */}
          <View className="flex-row items-center gap-1">
            {content.status === 'draft' && (
              <View className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                <Text className="text-xs text-yellow-600 dark:text-yellow-400">Draft</Text>
              </View>
            )}
            {content.visibility === 'private' && (
              <MaterialIcons name="lock" size={16} color="#6B7280" />
            )}
            {content.visibility === 'members_only' && (
              <MaterialIcons name="group" size={16} color="#6B7280" />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

interface PostContentListProps {
  contents: SpaceContent[];
  isLoading: boolean;
  error: string | null;
  onContentPress: (content: SpaceContent) => void;
  onAuthorPress: (authorId: string) => void;
  onReactionAdd: (contentId: string, reactionType: string) => void;
  onReactionRemove: (contentId: string, reactionType: string) => void;
  onComment: (contentId: string) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * Post Content List - Displays list of post content with loading states
 */
export function PostContentList({
  contents,
  isLoading,
  error,
  onContentPress,
  onAuthorPress,
  onReactionAdd,
  onReactionRemove,
  onComment,
  onRefresh,
  onLoadMore,
  hasMore = false,
}: PostContentListProps) {
  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4 text-center">
          Failed to Load Content
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-center mt-2">
          {error}
        </Text>
        {onRefresh && (
          <Pressable 
            onPress={onRefresh}
            className="bg-blue-500 px-4 py-2 rounded-xl mt-4 active:scale-95"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (isLoading && contents.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <MaterialIcons name="article" size={48} color="#6B7280" />
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
          Loading Content...
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-center mt-2">
          Fetching the latest posts and discussions
        </Text>
      </View>
    );
  }

  if (contents.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <MaterialIcons name="article" size={48} color="#6B7280" />
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
          No Content Yet
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-center mt-2">
          Be the first to create a post in this space!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 px-4"
      showsVerticalScrollIndicator={false}
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
        
        if (isCloseToBottom && hasMore && !isLoading && onLoadMore) {
          onLoadMore();
        }
      }}
      scrollEventThrottle={400}
    >
      <View className="py-4">
        {contents.map((content) => (
          <PostContentCard
            key={content.id}
            content={content}
            onPress={onContentPress}
            onAuthorPress={onAuthorPress}
            onReactionAdd={onReactionAdd}
            onReactionRemove={onReactionRemove}
            onComment={onComment}
          />
        ))}
        
        {/* Load More Indicator */}
        {isLoading && contents.length > 0 && (
          <View className="items-center py-4">
            <Text className="text-gray-500 dark:text-gray-400">Loading more...</Text>
          </View>
        )}
        
        {/* End of Content Indicator */}
        {!hasMore && contents.length > 0 && (
          <View className="items-center py-4">
            <Text className="text-gray-500 dark:text-gray-400">You've reached the end</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

interface CreatePostButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * Create Post Button - Floating action button for creating new posts
 */
export function CreatePostButton({ onPress, disabled = false, isLoading = false }: CreatePostButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      className={`absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg active:scale-95 ${
        disabled ? 'opacity-50' : ''
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}
    >
      {isLoading ? (
        <MaterialIcons name="hourglass-empty" size={24} color="white" />
      ) : (
        <MaterialIcons name="add" size={24} color="white" />
      )}
    </Pressable>
  );
}
