/**
 * ✅ INTEGRATION EXAMPLE: Community & Space Info Screens
 * 
 * This file demonstrates how to integrate the new Community and Space info screens
 * into existing components by making headers clickable.
 * 
 * USAGE PATTERNS:
 * 1. Import the InfoScreenModal component
 * 2. Add state for modal visibility
 * 3. Make headers clickable with onPress handlers
 * 4. Pass the appropriate data to the modal
 */

import React, { useState, useCallback } from 'react';
import { View, Pressable, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { HStack, VStack } from '../ui';
import { InfoScreenModal } from '../modals/InfoScreenModal';
import { Community } from '../../stores/community';
import { Space } from '../../stores/posts';

// ==================== COMMUNITY HEADER INTEGRATION ====================

interface CommunityHeaderWithInfoProps {
  community: Community;
  onBack?: () => void;
  children?: React.ReactNode;
}

export function CommunityHeaderWithInfo({ 
  community, 
  onBack, 
  children 
}: CommunityHeaderWithInfoProps) {
  const [showCommunityInfo, setShowCommunityInfo] = useState(false);

  const handleCommunityInfoPress = useCallback(() => {
    setShowCommunityInfo(true);
  }, []);

  return (
    <>
      {/* Header */}
      <View className="px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Top Navigation Row */}
        <HStack className="items-center justify-between mb-4">
          {onBack && (
            <Pressable
              onPress={onBack}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
            >
              <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
            </Pressable>
          )}
          
          {children}
        </HStack>

        {/* ✅ CLICKABLE COMMUNITY INFO - Tap to open info screen */}
        <Pressable
          onPress={handleCommunityInfoPress}
          className="active:scale-[0.98] active:opacity-80"
        >
          <VStack className="space-y-3">
            <HStack className="items-center justify-between">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {community.name}
              </Text>
              
              {/* Info Icon Hint */}
              <MaterialIcons name="info-outline" size={20} color="#6B7280" />
            </HStack>

            <Text className="text-gray-600 dark:text-gray-400">
              {community.description}
            </Text>

            <HStack className="items-center space-x-4">
              <HStack className="items-center space-x-1">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {community.memberCount || 0} members
                </Text>
              </HStack>

              <HStack className="items-center space-x-1">
                <MaterialIcons name="space-dashboard" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {community.spaceCount || 0} spaces
                </Text>
              </HStack>

              <View
                className={`px-2 py-1 rounded-full ${
                  community.type === "private"
                    ? "bg-orange-100 dark:bg-orange-900"
                    : community.type === "secret"
                    ? "bg-purple-100 dark:bg-purple-900"
                    : "bg-green-100 dark:bg-green-900"
                }`}
              >
                <Text
                  className={`text-xs font-medium capitalize ${
                    community.type === "private"
                      ? "text-orange-700 dark:text-orange-300"
                      : community.type === "secret"
                      ? "text-purple-700 dark:text-purple-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {community.type}
                </Text>
              </View>
            </HStack>
            
            {/* Tap hint */}
            <Text className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Tap for community info
            </Text>
          </VStack>
        </Pressable>
      </View>

      {/* ✅ COMMUNITY INFO MODAL */}
      <InfoScreenModal
        isOpen={showCommunityInfo}
        onClose={() => setShowCommunityInfo(false)}
        type="community"
        community={community}
      />
    </>
  );
}

// ==================== SPACE HEADER INTEGRATION ====================

interface SpaceHeaderWithInfoProps {
  space: Space;
  communityId: string;
  onBack?: () => void;
  children?: React.ReactNode;
}

export function SpaceHeaderWithInfo({ 
  space, 
  communityId, 
  onBack, 
  children 
}: SpaceHeaderWithInfoProps) {
  const [showSpaceInfo, setShowSpaceInfo] = useState(false);

  const handleSpaceInfoPress = useCallback(() => {
    setShowSpaceInfo(true);
  }, []);

  // Get space type icon
  const getSpaceIcon = () => {
    switch (space.interactionType) {
      case 'chat':
        return 'chat';
      case 'post':
        return 'article';
      default:
        return 'forum';
    }
  };

  return (
    <>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <HStack className="items-center justify-between">
          <HStack className="items-center space-x-3">
            {onBack && (
              <Pressable
                onPress={onBack}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
              >
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </Pressable>
            )}
            
            {/* ✅ CLICKABLE SPACE INFO - Tap to open info screen */}
            <Pressable
              onPress={handleSpaceInfoPress}
              className="flex-1 active:scale-[0.98] active:opacity-80"
            >
              <VStack>
                <HStack className="items-center space-x-2">
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">
                    {space.name}
                  </Text>
                  <MaterialIcons name="info-outline" size={16} color="#6B7280" />
                </HStack>
                
                <HStack className="items-center space-x-2 mt-1">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {space.interactionType === 'chat' ? 'Chat' : 'Post'} Space • {space.memberCount} members
                  </Text>
                </HStack>
                
                <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Tap for space info
                </Text>
              </VStack>
            </Pressable>
          </HStack>
          
          <HStack className="items-center space-x-2">
            <MaterialIcons name={getSpaceIcon() as any} size={24} color="#3B82F6" />
            {children}
          </HStack>
        </HStack>
      </View>

      {/* ✅ SPACE INFO MODAL */}
      <InfoScreenModal
        isOpen={showSpaceInfo}
        onClose={() => setShowSpaceInfo(false)}
        type="space"
        space={space}
        communityId={communityId}
      />
    </>
  );
}

// ==================== USAGE EXAMPLES ====================

/**
 * EXAMPLE 1: Integrating into CommunityDetailScreen
 * 
 * Replace the existing header section with:
 * 
 * ```tsx
 * import { CommunityHeaderWithInfo } from '../examples/InfoScreenIntegrationExample';
 * 
 * // In your component:
 * <CommunityHeaderWithInfo 
 *   community={community} 
 *   onBack={handleBack}
 * >
 *   {// Your existing header buttons (Create Space, Join Request Badge, etc.)}
 *   <HStack className="items-center space-x-3">
 *     <JoinRequestBadge ... />
 *     <CreateSpaceButton ... />
 *   </HStack>
 * </CommunityHeaderWithInfo>
 * ```
 */

/**
 * EXAMPLE 2: Integrating into ChatScreen
 * 
 * Replace the existing header section with:
 * 
 * ```tsx
 * import { SpaceHeaderWithInfo } from '../examples/InfoScreenIntegrationExample';
 * 
 * // In your component:
 * <SpaceHeaderWithInfo 
 *   space={space} 
 *   communityId={communityId}
 *   onBack={handleBack}
 * >
 *   {// Your existing header buttons (settings, etc.)}
 *   <Pressable onPress={handleSettings}>
 *     <MaterialIcons name="more-vert" size={24} color="#6B7280" />
 *   </Pressable>
 * </SpaceHeaderWithInfo>
 * ```
 */

/**
 * EXAMPLE 3: Integrating into PostScreen
 * 
 * Replace the existing header section with:
 * 
 * ```tsx
 * import { SpaceHeaderWithInfo } from '../examples/InfoScreenIntegrationExample';
 * 
 * // In your component:
 * <SpaceHeaderWithInfo 
 *   space={space} 
 *   communityId={communityId}
 *   onBack={handleBack}
 * />
 * ```
 */

/**
 * EXAMPLE 4: Simple Integration Pattern
 * 
 * For any component that displays community or space info:
 * 
 * ```tsx
 * import { InfoScreenModal } from '../modals/InfoScreenModal';
 * 
 * function YourComponent() {
 *   const [showInfo, setShowInfo] = useState(false);
 * 
 *   return (
 *     <>
 *       <Pressable onPress={() => setShowInfo(true)}>
 *         <Text>Community/Space Name</Text>
 *       </Pressable>
 * 
 *       <InfoScreenModal
 *         isOpen={showInfo}
 *         onClose={() => setShowInfo(false)}
 *         type="community" // or "space"
 *         community={community} // for community type
 *         space={space} // for space type
 *         communityId={communityId} // for space type
 *       />
 *     </>
 *   );
 * }
 * ```
 */
