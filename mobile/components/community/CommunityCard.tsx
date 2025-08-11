import React from 'react';
import { Pressable, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Box,
  VStack,
  HStack,
  Text,
} from '@/components/ui';
import { Community } from '@/stores/community';
import { formatNumber } from '@/utils/formatters';

/**
 * ✅ OPTIMIZED COMMUNITY CARD - MINIMAL & PROFESSIONAL
 *
 * Design Goals:
 * - Industry-standard community list design (Discord/Slack/Teams style)
 * - Minimal, clean appearance with essential information only
 * - Remove visual clutter and confusing elements
 * - Professional appearance with consistent design language
 * - Fixed timestamp bug - no dynamic updating timestamps
 */

interface CommunityCardProps {
  community: Community;
  onPress?: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

export function CommunityCard({
  community,
  onPress,
  variant = 'default',
}: CommunityCardProps) {

  // Generate consistent avatar background color based on community name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
      'bg-yellow-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get activity status indicator
  const isActive = community.activeMembersToday > 0;

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-70"
    >
      <Box className="mx-4 mb-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <HStack className="items-center gap-4">
          {/* Community Avatar */}
          <Box className="relative">
            {community.avatarUrl ? (
              <Image
                source={{ uri: community.avatarUrl }}
                className="w-14 h-14 rounded-2xl"
                style={{ width: 56, height: 56, borderRadius: 16 }}
              />
            ) : (
              <Box className={`w-14 h-14 rounded-2xl ${getAvatarColor(community.name)} items-center justify-center shadow-md`}>
                <Text className="text-white font-bold text-xl">
                  {community.name.charAt(0).toUpperCase()}
                </Text>
              </Box>
            )}

            {/* Verification Badge */}
            {community.isPlatformVerified && (
              <Box className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full items-center justify-center border-2 border-white dark:border-gray-800">
                <MaterialIcons name="verified" size={12} color="white" />
              </Box>
            )}

            {/* Activity Indicator */}
            {isActive && (
              <Box className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            )}
          </Box>

          {/* Community Info */}
          <VStack className="flex-1 gap-2">
            <HStack className="items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1" numberOfLines={1}>
                {community.name}
              </Text>

              {/* Join Status Indicator */}
              {community.isJoined && (
                <Box className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full ml-2">
                  <Text className="text-green-700 dark:text-green-300 text-xs font-semibold">
                    Joined
                  </Text>
                </Box>
              )}
            </HStack>

            {/* Community Stats */}
            <HStack className="items-center gap-4">
              <HStack className="items-center gap-1">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {formatNumber(community.memberCount)}
                </Text>
              </HStack>

              {isActive && (
                <HStack className="items-center gap-1">
                  <Box className="w-2 h-2 bg-green-500 rounded-full" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {community.activeMembersToday} active
                  </Text>
                </HStack>
              )}

              {/* Community Type Indicator */}
              {community.type !== 'public' && (
                <HStack className="items-center gap-1">
                  <MaterialIcons
                    name={community.type === 'private' ? 'lock' : 'lock-outline'}
                    size={14}
                    color="#6B7280"
                  />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium capitalize">
                    {community.type}
                  </Text>
                </HStack>
              )}
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
}
