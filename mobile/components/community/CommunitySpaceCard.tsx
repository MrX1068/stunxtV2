import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Box, HStack, VStack } from "@/components/ui";
import { CommunitySpace } from "../../services/communitySpaceApi";
import { SpaceAccessGate } from "./SpaceAccessGate";

/**
 * ✅ PROFESSIONAL COMMUNITY SPACE CARD
 * 
 * Features:
 * - Industry-standard design following Discord/Slack patterns
 * - Space type indicators and interaction type icons
 * - Member count and activity indicators
 * - Join/Leave functionality with proper states
 * - Accessibility support
 * - Professional spacing and typography
 */

interface CommunitySpaceCardProps {
  space: CommunitySpace;
  onPress?: () => void;
  canAccess?: boolean;
  variant?: 'default' | 'compact';
  // New props for access control
  communityName?: string;
  onJoinCommunityPress?: () => void;
  isJoiningCommunity?: boolean;
}

// Helper function to get space type color
const getSpaceTypeColor = (type: string) => {
  switch (type) {
    case 'public':
      return 'bg-green-500';
    case 'private':
      return 'bg-orange-500';
    case 'secret':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

// Helper function to get interaction type icon
const getInteractionTypeIcon = (type: string) => {
  switch (type) {
    case 'chat':
      return 'chat';
    case 'post':
      return 'article';
    case 'forum':
      return 'forum';
    case 'feed':
      return 'dynamic-feed';
    default:
      return 'chat';
  }
};

// Helper function to get category icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'announcements':
      return 'campaign';
    case 'general':
      return 'chat';
    case 'discussion':
      return 'forum';
    case 'projects':
      return 'work';
    case 'support':
      return 'help';
    case 'social':
      return 'people';
    case 'gaming':
      return 'sports-esports';
    case 'tech':
      return 'computer';
    case 'creative':
      return 'palette';
    case 'education':
      return 'school';
    case 'business':
      return 'business';
    case 'entertainment':
      return 'movie';
    case 'sports':
      return 'sports';
    case 'news':
      return 'newspaper';
    default:
      return 'tag';
  }
};

// Helper function to format member count
const formatMemberCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Helper function to format last activity
const formatLastActivity = (lastActivity?: string): string => {
  if (!lastActivity) return '';
  
  const now = new Date();
  const activity = new Date(lastActivity);
  const diffMs = now.getTime() - activity.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return activity.toLocaleDateString();
};

export const CommunitySpaceCard: React.FC<CommunitySpaceCardProps> = ({
  space,
  onPress,
  canAccess = true,
  variant = 'default',
  // New props for access control
  communityName,
  onJoinCommunityPress,
  isJoiningCommunity = false,
}) => {
  const isCompact = variant === 'compact';
  const isActive = space.status === 'active';
  const hasRecentActivity = space.lastActivityAt && 
    (Date.now() - new Date(space.lastActivityAt).getTime()) < 24 * 60 * 60 * 1000; // 24 hours

  return (
    <Pressable
      onPress={canAccess ? onPress : undefined}
      className={`active:opacity-70 ${!canAccess ? 'opacity-60' : ''}`}
      disabled={!canAccess}
    >
      <Box className={`mx-4 mb-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm ${
        !isActive ? 'opacity-75' : ''
      } relative`}>
        <HStack className="items-start gap-4">
          {/* Space Icon/Avatar */}
          <Box className="relative">
            <Box className={`w-12 h-12 rounded-xl ${getSpaceTypeColor(space.type)} items-center justify-center shadow-md`}>
              <MaterialIcons 
                name={getCategoryIcon(space.category) as any} 
                size={24} 
                color="white" 
              />
            </Box>
            
            {/* Activity Indicator */}
            {hasRecentActivity && (
              <Box className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            )}
            
            {/* Interaction Type Badge */}
            <Box className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 rounded-full items-center justify-center border-2 border-white dark:border-gray-800">
              <MaterialIcons 
                name={getInteractionTypeIcon(space.interactionType) as any} 
                size={10} 
                color="white" 
              />
            </Box>
          </Box>

          {/* Space Info */}
          <VStack className="flex-1 gap-2">
            <HStack className="items-center justify-between">
              <VStack className="flex-1">
                <HStack className="items-center gap-2">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100" numberOfLines={1}>
                    {space.name}
                  </Text>
                  
                  {/* Space Type Indicator */}
                  {space.type !== 'public' && (
                    <MaterialIcons
                      name={space.type === 'private' ? 'lock' : 'lock-outline'}
                      size={14}
                      color="#6B7280"
                    />
                  )}
                </HStack>

                {/* Description */}
                {space.description && !isCompact && (
                  <Text 
                    className="text-sm text-gray-600 dark:text-gray-400 mt-1" 
                    numberOfLines={2}
                  >
                    {space.description}
                  </Text>
                )}
              </VStack>

              {/* Join Status */}
              {space.isJoined && (
                <Box className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full ml-2">
                  <Text className="text-green-700 dark:text-green-300 text-xs font-semibold">
                    Joined
                  </Text>
                </Box>
              )}
            </HStack>

            {/* Space Stats */}
            <HStack className="items-center gap-4">
              {/* Member Count */}
              <HStack className="items-center gap-1">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {formatMemberCount(space.memberCount)}
                </Text>
              </HStack>

              {/* Message Count */}
              {space.messageCount > 0 && (
                <HStack className="items-center gap-1">
                  <MaterialIcons name="chat-bubble-outline" size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {formatMemberCount(space.messageCount)}
                  </Text>
                </HStack>
              )}

              {/* Last Activity */}
              {space.lastActivityAt && (
                <HStack className="items-center gap-1">
                  <MaterialIcons name="schedule" size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {formatLastActivity(space.lastActivityAt)}
                  </Text>
                </HStack>
              )}

              {/* Category Badge */}
              <Box className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                <Text className="text-xs text-gray-600 dark:text-gray-400 font-medium capitalize">
                  {space.category}
                </Text>
              </Box>
            </HStack>

            {/* Last Message Preview */}
            {space.lastMessage && !isCompact && (
              <Box className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl mt-2">
                <HStack className="items-start gap-2">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {space.lastMessage.authorName}:
                  </Text>
                  <Text 
                    className="text-xs text-gray-600 dark:text-gray-300 flex-1" 
                    numberOfLines={2}
                  >
                    {space.lastMessage.content}
                  </Text>
                </HStack>
              </Box>
            )}

            {/* Note: Join buttons removed - users navigate to space detail to join */}
          </VStack>
        </HStack>

        {/* Space Access Gate Overlay for Non-Community-Members */}
        {!canAccess && communityName && (
          <SpaceAccessGate
            space={space}
            communityName={communityName}
            onJoinCommunityPress={onJoinCommunityPress}
            isJoiningCommunity={isJoiningCommunity}
            className="absolute inset-0"
          />
        )}
      </Box>
    </Pressable>
  );
};

export default CommunitySpaceCard;
