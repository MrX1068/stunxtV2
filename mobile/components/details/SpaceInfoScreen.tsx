import React, { useState, useCallback } from 'react';
import { View, ScrollView, Pressable, Alert, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/text';
import { Button, ButtonText } from '../ui/button';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';
import { Avatar } from '../Avatar';
import { MemberList } from './MemberList';
import { SpaceInviteManagement } from './SpaceInviteManagement';
import { useSpaces } from '../../stores/posts';
import { useAuth } from '../../stores/auth';
import { Space } from '../../stores/posts';

// Flexible space type that can handle both Space and custom space objects
type FlexibleSpace = Space | {
  id: string;
  name: string;
  interactionType: string;
  description?: string;
  memberCount: number;
  isJoined: boolean;
  communityId: string;
  memberRole?: string;
  type?: string;
  createdAt?: string;
  avatarUrl?: string;
  joinedAt?: string;
};

interface SpaceInfoScreenProps {
  space: FlexibleSpace;
  communityId: string;
  onClose: () => void;
}

export function SpaceInfoScreen({ space, communityId, onClose }: SpaceInfoScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leaveSpace } = useSpaces();
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'settings'>('info');
  const [isLeaving, setIsLeaving] = useState(false);

  // Get user's role in this space
  const userRole = space.memberRole || 'member';
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || isOwner;
  const isModerator = userRole === 'moderator' || isAdmin;

  // Handle leave space
  const handleLeaveSpace = useCallback(async () => {
    if (isOwner) {
      Alert.alert(
        'Cannot Leave',
        'You cannot leave a space you own. Transfer ownership first or delete the space.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Leave Space',
      `Are you sure you want to leave "${space.name}"? You'll lose access to all content in this space.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLeaving(true);
              await leaveSpace(space.id);
              
              Alert.alert(
                'Left Space',
                `You have left "${space.name}".`,
                [{ text: 'OK', onPress: onClose }]
              );
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to leave space. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  }, [space.id, space.name, isOwner, leaveSpace, onClose]);

  // Handle share space
  const handleShareSpace = useCallback(async () => {
    try {
      const shareUrl = `https://app.stunxt.com/communities/${communityId}/spaces/${space.id}`;
      const message = `Check out "${space.name}" space!\n\n${space.description || 'Join our space!'}\n\n${shareUrl}`;
      
      await Share.share({
        message,
        url: shareUrl,
        title: space.name,
      });
    } catch (error) {
      console.error('Failed to share space:', error);
    }
  }, [communityId, space.id, space.name, space.description]);

  // Handle space settings
  const handleSpaceSettings = useCallback(() => {
    // TODO: Navigate to space settings
    Alert.alert('Space Settings', 'Space settings will be implemented soon.');
  }, []);

  // Format member count
  const formatMemberCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Format creation date
  const formatCreationDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get space type info
  const getSpaceTypeInfo = () => {
    switch (space.interactionType) {
      case 'chat':
        return {
          icon: 'chat',
          label: 'Chat Space',
          description: 'Real-time messaging and discussions',
          color: '#10B981', // emerald-500
        };
      case 'post':
        return {
          icon: 'article',
          label: 'Post Space',
          description: 'Articles, discussions, and content sharing',
          color: '#8B5CF6', // violet-500
        };
      default:
        return {
          icon: 'forum',
          label: 'Discussion Space',
          description: 'General discussions and interactions',
          color: '#3B82F6', // blue-500
        };
    }
  };

  const spaceTypeInfo = getSpaceTypeInfo();

  // Render info tab
  const renderInfoTab = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <VStack className="p-4 space-y-6">
        {/* Space Header */}
        <VStack className="items-center space-y-4">
          <View className="relative">
            <Avatar
              source={space.avatarUrl ? { uri: space.avatarUrl } : undefined}
              fallbackText={space.name}
              size="xl"
            />
            {/* Space Type Icon Overlay */}
            <View
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full items-center justify-center border-2 border-white dark:border-gray-900"
              style={{ backgroundColor: spaceTypeInfo.color }}
            >
              <MaterialIcons
                name={spaceTypeInfo.icon as any}
                size={16}
                color="white"
              />
            </View>
          </View>
          
          <VStack className="items-center space-y-2">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {space.name}
            </Text>
            
            <HStack className="items-center space-x-4">
              <HStack className="items-center space-x-1">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {formatMemberCount(space.memberCount)} members
                </Text>
              </HStack>
            </HStack>

            {/* Space Type Badge */}
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${spaceTypeInfo.color}20` }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: spaceTypeInfo.color }}
              >
                {spaceTypeInfo.label}
              </Text>
            </View>

            {/* Privacy Badge */}
            <View
              className={`px-3 py-1 rounded-full ${
                space.type === 'public'
                  ? 'bg-green-100 dark:bg-green-900/20'
                  : space.type === 'private'
                  ? 'bg-blue-100 dark:bg-blue-900/20'
                  : 'bg-purple-100 dark:bg-purple-900/20'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  space.type === 'public'
                    ? 'text-green-700 dark:text-green-400'
                    : space.type === 'private'
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-purple-700 dark:text-purple-400'
                }`}
              >
                {space.type.charAt(0).toUpperCase() + space.type.slice(1)} Space
              </Text>
            </View>
          </VStack>
        </VStack>

        {/* Description */}
        {space.description && (
          <VStack className="space-y-2">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              About
            </Text>
            <Text className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {space.description}
            </Text>
          </VStack>
        )}

        {/* Space Info */}
        <VStack className="space-y-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Space Info
          </Text>
          
          <VStack className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
            <HStack className="items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Type</Text>
              <HStack className="items-center space-x-2">
                <MaterialIcons
                  name={spaceTypeInfo.icon as any}
                  size={16}
                  color={spaceTypeInfo.color}
                />
                <Text className="text-sm font-medium text-gray-900 dark:text-white">
                  {spaceTypeInfo.label}
                </Text>
              </HStack>
            </HStack>
            
            <HStack className="items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Created</Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCreationDate(space.createdAt)}
              </Text>
            </HStack>
            
            <HStack className="items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Your Role</Text>
              <View
                className={`px-2 py-1 rounded-full ${
                  userRole === 'owner'
                    ? 'bg-red-100 dark:bg-red-900/20'
                    : userRole === 'admin'
                    ? 'bg-orange-100 dark:bg-orange-900/20'
                    : userRole === 'moderator'
                    ? 'bg-purple-100 dark:bg-purple-900/20'
                    : 'bg-green-100 dark:bg-green-900/20'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    userRole === 'owner'
                      ? 'text-red-700 dark:text-red-400'
                      : userRole === 'admin'
                      ? 'text-orange-700 dark:text-orange-400'
                      : userRole === 'moderator'
                      ? 'text-purple-700 dark:text-purple-400'
                      : 'text-green-700 dark:text-green-400'
                  }`}
                >
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </Text>
              </View>
            </HStack>

            <HStack className="items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Joined</Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {space.joinedAt ? formatCreationDate(space.joinedAt) : 'Not joined'}
              </Text>
            </HStack>
          </VStack>
        </VStack>

        {/* Space Features */}
        <VStack className="space-y-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Features
          </Text>
          
          <VStack className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {spaceTypeInfo.description}
            </Text>
            
            <HStack className="items-center space-x-2">
              <MaterialIcons name="check-circle" size={16} color="#10B981" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {space.interactionType === 'chat' ? 'Real-time messaging' : 'Content publishing'}
              </Text>
            </HStack>
            
            <HStack className="items-center space-x-2">
              <MaterialIcons name="check-circle" size={16} color="#10B981" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Member roles and permissions
              </Text>
            </HStack>
            
            <HStack className="items-center space-x-2">
              <MaterialIcons name="check-circle" size={16} color="#10B981" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Moderation tools
              </Text>
            </HStack>
          </VStack>
        </VStack>

        {/* Action Buttons */}
        <VStack className="space-y-3">
          <Button
            variant="outline"
            size="md"
            onPress={handleShareSpace}
          >
            <MaterialIcons name="share" size={20} color="#3B82F6" />
            <ButtonText className="ml-2">Share Space</ButtonText>
          </Button>

          <Button
            variant="outline"
            size="md"
            onPress={handleLeaveSpace}
            disabled={isLeaving}
          >
            <MaterialIcons name="exit-to-app" size={20} color="#EF4444" />
            <ButtonText className="ml-2 text-red-600">
              {isLeaving ? 'Leaving...' : 'Leave Space'}
            </ButtonText>
          </Button>
        </VStack>
      </VStack>
    </ScrollView>
  );

  // Render members tab
  const renderMembersTab = () => (
    <MemberList
      communityId={communityId}
      spaceId={space.id}
      currentUserRole={userRole}
      type="space"
    />
  );

  // Render settings tab
  const renderSettingsTab = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <VStack className="p-4 space-y-4">
        {/* Space Invite Management - Available to admins and moderators */}
        {isModerator && (
          <SpaceInviteManagement
            spaceId={space.id}
            spaceName={space.name}
            communityId={communityId}
            userRole={userRole}
          />
        )}

        {/* Separator */}
        {isModerator && isAdmin && (
          <View className="border-t border-gray-200 dark:border-gray-700 my-2" />
        )}

        {isAdmin && (
          <>
            <Button
              variant="outline"
              size="md"
              onPress={handleSpaceSettings}
            >
              <MaterialIcons name="settings" size={20} color="#3B82F6" />
              <ButtonText className="ml-2">Space Settings</ButtonText>
            </Button>

            <Button
              variant="outline"
              size="md"
              onPress={() => Alert.alert('Space Analytics', 'Space analytics will be implemented soon.')}
            >
              <MaterialIcons name="analytics" size={20} color="#3B82F6" />
              <ButtonText className="ml-2">Analytics</ButtonText>
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="md"
          onPress={() => Alert.alert('Report Space', 'Report functionality will be implemented soon.')}
        >
          <MaterialIcons name="report" size={20} color="#EF4444" />
          <ButtonText className="ml-2 text-red-600">Report Space</ButtonText>
        </Button>
      </VStack>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-white dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <HStack className="items-center justify-between">
          <HStack className="items-center space-x-3">
            <Pressable
              onPress={onClose}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
            >
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </Pressable>
            
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Space Info
            </Text>
          </HStack>
        </HStack>
      </View>

      {/* Tab Navigation */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <HStack className="px-4">
          {[
            { key: 'info', label: 'Info', icon: 'info' },
            { key: 'members', label: 'Members', icon: 'people' },
            ...(isAdmin ? [{ key: 'settings', label: 'Settings', icon: 'settings' }] : []),
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 items-center border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500'
                  : 'border-transparent'
              }`}
            >
              <HStack className="items-center space-x-1">
                <MaterialIcons
                  name={tab.icon as any}
                  size={20}
                  color={activeTab === tab.key ? '#3B82F6' : '#6B7280'}
                />
                <Text
                  className={`text-sm font-medium ${
                    activeTab === tab.key
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </Text>
              </HStack>
            </Pressable>
          ))}
        </HStack>
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'members' && renderMembersTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>
    </View>
  );
}
