import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { VStack, HStack } from "@/components/ui";
import { Community } from "../../stores/community";

/**
 * ✅ PROFESSIONAL COMMUNITY ACCESS GATE
 * 
 * Features:
 * - Blur overlay for private/secret communities
 * - Professional UI following industry standards (Telegram/Discord style)
 * - Type-based messaging and actions
 * - Accessibility support
 * - Customizable join actions
 */

interface CommunityAccessGateProps {
  community: Community;
  onJoinPress?: () => void;
  isJoining?: boolean;
  spaceCount?: number;
  memberCount?: number;
}

export const CommunityAccessGate: React.FC<CommunityAccessGateProps> = ({
  community,
  onJoinPress,
  isJoining = false,
  spaceCount = 0,
  memberCount = 0,
}) => {
  // Get community type specific configuration
  const getAccessConfig = () => {
    switch (community.type) {
      case 'private':
        return {
          icon: 'lock' as const,
          title: 'Private Community',
          description: 'Join this community to access spaces and content',
          buttonText: '🔒 Request to Join',
          buttonColor: 'bg-amber-500',
          showButton: true,
        };
      case 'secret':
        return {
          icon: 'lock-outline' as const,
          title: 'Secret Community',
          description: 'This community is invite-only',
          buttonText: '🔐 Invitation Required',
          buttonColor: 'bg-purple-500',
          showButton: false,
        };
      default:
        return {
          icon: 'public' as const,
          title: 'Public Community',
          description: 'Join this community to access all features',
          buttonText: '🌍 Join Community',
          buttonColor: 'bg-emerald-500',
          showButton: true,
        };
    }
  };

  const config = getAccessConfig();

  return (
    <View className="absolute inset-0 bg-black/20">
      <BlurView 
        intensity={20} 
        className="flex-1 items-center justify-center px-8"
        tint="light"
      >
        <VStack className="items-center space-y-6 bg-white/95 dark:bg-gray-800/95 p-8 rounded-2xl max-w-sm shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          {/* Icon */}
          <View className={`w-16 h-16 rounded-full items-center justify-center ${
            community.type === 'private' ? 'bg-amber-100 dark:bg-amber-900' :
            community.type === 'secret' ? 'bg-purple-100 dark:bg-purple-900' :
            'bg-emerald-100 dark:bg-emerald-900'
          }`}>
            <MaterialIcons
              name={config.icon}
              size={32}
              color={
                community.type === 'private' ? '#D97706' :
                community.type === 'secret' ? '#7C3AED' :
                '#059669'
              }
            />
          </View>

          {/* Content */}
          <VStack className="items-center space-y-3">
            <Text className="text-xl font-bold text-center text-gray-900 dark:text-gray-100">
              {config.title}
            </Text>
            
            <Text className="text-center text-gray-600 dark:text-gray-400 leading-relaxed">
              {community.description || config.description}
            </Text>

            {/* Community Stats */}
            <HStack className="items-center space-x-4 pt-2">
              <HStack className="items-center space-x-1">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {memberCount} members
                </Text>
              </HStack>
              
              <HStack className="items-center space-x-1">
                <MaterialIcons name="space-dashboard" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {spaceCount} spaces
                </Text>
              </HStack>
            </HStack>

            {/* Additional Info */}
            <Text className="text-xs text-center text-gray-500 dark:text-gray-500 pt-2">
              {community.type === 'private' 
                ? 'Your request will be reviewed by community admins'
                : community.type === 'secret'
                ? 'Contact a community member for an invitation'
                : 'Join instantly and start participating'
              }
            </Text>
          </VStack>

          {/* Join Button */}
          {config.showButton && onJoinPress && (
            <Pressable
              onPress={onJoinPress}
              disabled={isJoining}
              className={`w-full py-4 px-6 rounded-2xl active:scale-95 ${config.buttonColor} ${
                isJoining ? 'opacity-70' : ''
              } shadow-lg`}
            >
              <Text className="text-white font-bold text-center text-lg">
                {isJoining ? '⏳ Processing...' : config.buttonText}
              </Text>
            </Pressable>
          )}

          {/* Secret Community Alternative Actions */}
          {community.type === 'secret' && (
            <VStack className="w-full space-y-2">
              <Text className="text-xs text-center text-gray-500 dark:text-gray-500">
                Alternative ways to join:
              </Text>
              
              <HStack className="justify-center space-x-4">
                <Pressable className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-xl active:scale-95">
                  <HStack className="items-center justify-center space-x-2">
                    <MaterialIcons name="link" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Invite Link
                    </Text>
                  </HStack>
                </Pressable>
                
                <Pressable className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-xl active:scale-95">
                  <HStack className="items-center justify-center space-x-2">
                    <MaterialIcons name="person-add" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Member Invite
                    </Text>
                  </HStack>
                </Pressable>
              </HStack>
            </VStack>
          )}
        </VStack>
      </BlurView>
    </View>
  );
};

export default CommunityAccessGate;
