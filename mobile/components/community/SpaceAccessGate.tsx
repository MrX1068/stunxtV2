import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { CommunitySpace } from '../../services/communitySpaceApi';

/**
 * ✅ SPACE ACCESS GATE COMPONENT
 * 
 * Features:
 * - Professional blur overlay for restricted spaces
 * - Clear messaging about community membership requirement
 * - Consistent design with CommunityAccessGate
 * - Professional call-to-action for joining community
 */

interface SpaceAccessGateProps {
  space: CommunitySpace;
  communityName: string;
  onJoinCommunityPress?: () => void;
  isJoiningCommunity?: boolean;
  className?: string;
}

export const SpaceAccessGate: React.FC<SpaceAccessGateProps> = ({
  space,
  communityName,
  onJoinCommunityPress,
  isJoiningCommunity = false,
  className = '',
}) => {
  return (
    <View className={`relative ${className}`}>
      {/* Blur Overlay */}
      <BlurView
        intensity={20}
        tint="light"
        className="absolute inset-0 z-10 rounded-2xl overflow-hidden"
      >
        <View className="flex-1 items-center justify-center p-6 bg-white/30 dark:bg-gray-900/30">
          {/* Lock Icon */}
          <View className="w-16 h-16 bg-blue-500/20 rounded-full items-center justify-center mb-4">
            <MaterialIcons name="lock" size={32} color="#3B82F6" />
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Join Community to Access Spaces
          </Text>

          {/* Description */}
          <Text className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 max-w-xs">
            Join <Text className="font-semibold">{communityName}</Text> to access{' '}
            <Text className="font-semibold">{space.name}</Text> and other community spaces
          </Text>

          {/* Space Preview Info */}
          <View className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 mb-6 w-full max-w-xs">
            <View className="flex-row items-center mb-2">
              <MaterialIcons 
                name={space.interactionType === 'chat' ? 'chat' : 'article'} 
                size={16} 
                color="#6B7280" 
              />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2 font-medium">
                {space.name}
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <MaterialIcons name="people" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                  {space.memberCount} members
                </Text>
              </View>
              
              <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                <Text className="text-xs text-blue-700 dark:text-blue-300 font-medium capitalize">
                  {space.category}
                </Text>
              </View>
            </View>
          </View>

          {/* Join Community Button */}
          {onJoinCommunityPress && (
            <Pressable
              onPress={onJoinCommunityPress}
              disabled={isJoiningCommunity}
              className={`py-3 px-6 bg-blue-500 rounded-xl active:scale-95 ${
                isJoiningCommunity ? 'opacity-70' : ''
              }`}
            >
              <Text className="text-white font-semibold text-center">
                {isJoiningCommunity ? '⏳ Joining...' : `🌍 Join ${communityName}`}
              </Text>
            </Pressable>
          )}

          {/* Alternative Access Info */}
          <Text className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4 max-w-xs">
            Community membership is required to view and participate in spaces
          </Text>
        </View>
      </BlurView>
    </View>
  );
};
