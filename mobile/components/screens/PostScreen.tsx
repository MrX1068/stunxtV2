import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { communitySpaceApi } from '../../services/communitySpaceApi';
import { useSpaceContent } from '../../stores/contentStore';
import { useAuth } from '../../stores/auth';
import { useSpaces } from '../../stores/posts';
import { PostContentList, CreatePostButton } from '../PostContentComponents';
import { CreatePostModal } from '../CreatePostModal';
// Removed InfoScreenModal - now using route-based navigation
import type { SpaceContent } from '../../stores/contentStore';

/**
 * ✅ POST SPACE SCREEN
 *
 * Features:
 * - Complete post content fetching and display
 * - RBAC-based create post functionality
 * - Professional UI with loading states and error handling
 * - Pull-to-refresh and pagination support
 * - Integration with content store and API
 */

interface PostScreenProps {
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
    ownerId?: string;
    memberRole?: string;
    type?: string;
  };
}

const PostScreen: React.FC<PostScreenProps> = ({
  spaceId: propSpaceId,
  spaceData,
  hideHeader = false,
}) => {
  const insets = useSafeAreaInsets();
  const { spaceId: paramSpaceId } = useLocalSearchParams<{ spaceId: string }>();

  const spaceId = propSpaceId || spaceData?.id || paramSpaceId;
  const [joiningSpace, setJoiningSpace] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Removed showSpaceInfo state - now using route navigation

  // Hooks
  const { user } = useAuth();
  const { currentSpace } = useSpaces();

  // Content store for this specific space
  const {
    contents,
    isLoading,
    isCreating,
    error,
    pagination,
    fetchContent,
    addReaction,
    removeReaction,
    clearErrors,
  } = useSpaceContent(spaceId || '');

  console.log("spaceData, ",spaceData)
  // Use passed spaceData or fetch from store
  const [space, setSpace] = useState(
    spaceData || currentSpace || {
      id: spaceId || '',
      name: 'Post Space',
      interactionType: 'post',
      memberCount: 0,
      isJoined: false,
      description: '',
      communityId: '',
      communityName: 'Community',
      ownerId: '',
      memberRole: 'member',
      type: 'public',
    }
  );

  // Load content on mount and when spaceId changes
  useEffect(() => {
    if (spaceId && space.communityId && space.isJoined) {
      loadContent();
    }
  }, [spaceId, space.communityId, space.isJoined]);

  // Load content function
  const loadContent = useCallback(async () => {
    if (!spaceId || !space.communityId) return;

    try {
      await fetchContent({
        communityId: space.communityId,
        spaceId,
        type: 'posts',
        limit: 20,
        offset: 0,
      });
    } catch (error) {
      console.error('❌ [PostScreen] Failed to load content:', error);
    }
  }, [spaceId, space.communityId, fetchContent]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    clearErrors();
    await loadContent();
    setRefreshing(false);
  }, [loadContent, clearErrors]);

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (!spaceId || !space.communityId || isLoading || !pagination.hasMore) return;

    try {
      await fetchContent({
        communityId: space.communityId,
        spaceId,
        type: 'posts',
        limit: 20,
        offset: contents.length,
      });
    } catch (error) {
      console.error('❌ [PostScreen] Failed to load more content:', error);
    }
  }, [spaceId, space.communityId, isLoading, pagination.hasMore, fetchContent, contents.length]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Handle content interactions
  const handleContentPress = useCallback((content: SpaceContent) => {
    // For now, show content details in alert
    Alert.alert(
      content.title || 'Post',
      content.content,
      [{ text: 'OK' }]
    );
  }, []);

  const handleAuthorPress = useCallback((authorId: string) => {
    // For now, show author info in alert
    Alert.alert('Author', `User ID: ${authorId}`, [{ text: 'OK' }]);
  }, []);

  const handleReactionAdd = useCallback(async (contentId: string, reactionType: string) => {
    try {
      await addReaction(contentId, reactionType);
    } catch (error) {
      console.error('❌ [PostScreen] Failed to add reaction:', error);
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
    }
  }, [addReaction]);

  const handleReactionRemove = useCallback(async (contentId: string, reactionType: string) => {
    try {
      await removeReaction(contentId, reactionType);
    } catch (error) {
      console.error('❌ [PostScreen] Failed to remove reaction:', error);
      Alert.alert('Error', 'Failed to remove reaction. Please try again.');
    }
  }, [removeReaction]);

  const handleComment = useCallback((_contentId: string) => {
    // Navigate to comment view or show comment modal
    Alert.alert('Comments', 'Comment functionality will be implemented soon.');
  }, []);

  const handleCreatePost = useCallback(() => {
    if (!space.isJoined) {
      Alert.alert(
        'Join Required',
        'You need to join this space before creating posts.',
        [{ text: 'OK' }]
      );
      return;
    }

    setShowCreateModal(true);
  }, [space.isJoined]);

  const handlePostCreated = useCallback((newPost: SpaceContent) => {
    console.log('✅ [PostScreen] New post created:', newPost.id);
    // The content store will automatically update the list
    // Optionally scroll to top or show success message
  }, []);

  // Handle space join
  const handleJoinSpace = useCallback(async () => {
    if (!space || !spaceId) return;

    try {
      setJoiningSpace(true);

      await communitySpaceApi.joinSpace(space.communityId, space.id);

      Alert.alert(
        "Welcome!",
        `You've successfully joined ${space.name}. Start posting!`,
        [{ text: "Start Posting" }]
      );

      // Update local space state and load content
      setSpace((prevSpace: any) => ({
        ...prevSpace,
        isJoined: true,
        memberCount: (prevSpace?.memberCount || 0) + 1
      }));

      // Load content after joining
      setTimeout(() => {
        loadContent();
      }, 500);

    } catch (error) {
      console.error("❌ [PostScreen] Join failed:", error);
      Alert.alert(
        "Join Failed",
        "Unable to join the space right now. Please try again.",
        [{ text: "Try Again" }]
      );
    } finally {
      setJoiningSpace(false);
    }
  }, [space, loadContent]);

  // RBAC: Check permissions
  const canCreatePost = useCallback(() => {
    if (!user || !space) return false;

    // Must be joined to create posts
    if (!space.isJoined) return false;
     console.log(space, "space.isJoined", space.isJoined, "space.interactionType", space.interactionType, "space.memberRole", space.memberRole);
    // For post spaces, check if user has posting permissions
    if (space.interactionType === 'post') {
      // Basic permission check - members and above can create posts
      const memberRole = space.memberRole;
      return memberRole && ['moderator', 'admin', 'owner'].includes(memberRole);
    }

    return false;
  }, [user, space]);

  const canAccessSpace = useCallback(() => {
    if (!user || !space) return false;

    // Public spaces can be accessed by anyone
    if (space.type === 'public') return true;

    // Private spaces require membership
    return space.isJoined || space.ownerId === user.id;
  }, [user, space]);

  // Determine if user should see join button
  const shouldShowJoinButton = useCallback(() => {
    if (!space || !canAccessSpace()) return false;
    return !space.isJoined;
  }, [space, canAccessSpace]);

  // Determine if user should see create post button
  const shouldShowCreateButton = useCallback(() => {
    return space.isJoined && canCreatePost();
  }, [space.isJoined, canCreatePost]);

  if (!space || !space.id) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center" style={{ paddingTop: insets.top }}>
        <Text className="text-red-500">Space not found</Text>
        <Pressable onPress={handleBack} className="mt-4 px-4 py-2 bg-blue-500 rounded-xl">
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: hideHeader ? 0 : insets.top }}>
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
                    Post Space • {space.memberCount} members
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
            <MaterialIcons name="article" size={24} color="#3B82F6" />
          </View>
        </View>
      </View>
      )}

      {/* Content Area */}
      {space.isJoined ? (
        <View className="flex-1">
          <PostContentList
            contents={contents}
            isLoading={isLoading}
            error={error}
            onContentPress={handleContentPress}
            onAuthorPress={handleAuthorPress}
            onReactionAdd={handleReactionAdd}
            onReactionRemove={handleReactionRemove}
            onComment={handleComment}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            hasMore={pagination.hasMore}
          />

          {/* Create Post Button (RBAC controlled) */}
          {shouldShowCreateButton() && (
            <CreatePostButton
              onPress={handleCreatePost}
              disabled={isCreating}
              isLoading={isCreating}
            />
          )}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 bg-purple-500/20 rounded-full items-center justify-center mb-6">
            <MaterialIcons name="article" size={40} color="#8B5CF6" />
          </View>

          <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Post Space
          </Text>

          <Text className="text-lg text-gray-600 dark:text-gray-400 text-center mb-4">
            {space.name}
          </Text>

          <Text className="text-sm text-gray-500 dark:text-gray-500 text-center max-w-xs">
            Join this space to view and create posts. Share articles, discussions, and engage with the community.
          </Text>

          {space.description && (
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mt-6 max-w-sm">
              <Text className="text-gray-700 dark:text-gray-300 text-center">
                {space.description}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom Join Button (if not joined) */}
      {shouldShowJoinButton() && (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-gray-800/95 border-t border-gray-200 dark:border-gray-700">
          <Pressable
            onPress={handleJoinSpace}
            disabled={joiningSpace}
            className={`py-4 px-6 rounded-2xl active:scale-95 bg-purple-500 ${joiningSpace ? "opacity-70" : ""}`}
          >
            <Text className="text-white font-bold text-center text-lg">
              {joiningSpace ? "⏳ Joining..." : "📝 Join Post Space"}
            </Text>
            <Text className="text-white/80 text-center text-sm mt-1">
              Start creating and sharing posts
            </Text>
          </Pressable>
        </View>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        spaceId={spaceId || ''}
        communityId={space.communityId}
        spaceName={space.name}
        onPostCreated={handlePostCreated}
      />

      {/* ✅ SPACE INFO - Now uses dedicated route /space-info/[communityId]/[spaceId] */}
    </View>
  );
};

export default PostScreen;
