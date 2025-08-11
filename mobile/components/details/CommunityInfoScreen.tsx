import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Share, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '../ui/text';
import { Button, ButtonText } from '../ui/button';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';
import { Avatar } from '../Avatar';
import { MemberList } from './MemberList';
import { InviteManagementModal } from '../modals/InviteManagementModal';
import { useCommunityStore } from '../../stores/community';
import { useMemberManagement } from '../../stores/memberManagementStore';
import { useAuth } from '../../stores/auth';
import { Community } from '../../stores/community';

interface CommunityInfoScreenProps {
  community: Community;
  onClose: () => void;
}

export function CommunityInfoScreen({ community, onClose }: CommunityInfoScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leaveCommunity } = useCommunityStore();
  const { communityMembers } = useMemberManagement();
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'settings'>('info');
  const [isLeaving, setIsLeaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Get user's role in this community
  const getUserRole = useCallback(() => {
    // First check if user is the owner
    if (user?.id === community.ownerId || community.isOwner) {
      return 'owner';
    }

    // Then check the memberRole property
    if (community.memberRole) {
      return community.memberRole;
    }

    // Fallback: check if community is in ownedCommunities
    const { ownedCommunities } = useCommunityStore.getState();
    if (ownedCommunities.some(c => c.id === community.id)) {
      return 'owner';
    }

    // Default to member
    return 'member';
  }, [user?.id, community.ownerId, community.isOwner, community.memberRole, community.id]);

  const userRole = getUserRole();
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || isOwner;
  const isModerator = userRole === 'moderator' || isAdmin;

  // Debug role detection
  console.log('🔍 [CommunityInfoScreen] RBAC Debug:', {
    userId: user?.id,
    communityOwnerId: community.ownerId,
    communityIsOwner: community.isOwner,
    communityMemberRole: community.memberRole,
    detectedRole: userRole,
    isOwner,
    isAdmin,
    isModerator
  });

  // Handle leave community
  const handleLeaveCommunity = useCallback(async () => {
    if (isOwner) {
      // Check if there are other admins who can take ownership
      const members = communityMembers[community.id] || [];
      const otherAdmins = members.filter(m =>
        m.userId !== user?.id &&
        ['admin', 'owner'].includes(m.role) &&
        m.status === 'active'
      );

      if (otherAdmins.length === 0) {
        Alert.alert(
          'Cannot Leave Community',
          'As the owner, you cannot leave this community because there are no other admins to take over. You must either:\n\n• Promote another member to admin first\n• Transfer ownership to another member\n• Delete the community',
          [{ text: 'OK' }]
        );
        return;
      } else {
        Alert.alert(
          'Transfer Ownership Required',
          `You are the owner of this community. Before leaving, you must transfer ownership to one of the ${otherAdmins.length} admin(s) available.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Transfer Ownership', onPress: () => {
              Alert.alert('Transfer Ownership', 'Ownership transfer functionality will be implemented soon.');
            }}
          ]
        );
        return;
      }
    }

    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave "${community.name}"? You'll lose access to all spaces and content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLeaving(true);
              await leaveCommunity(community.id);
              
              Alert.alert(
                'Left Community',
                `You have left "${community.name}".`,
                [{ text: 'OK', onPress: onClose }]
              );
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.message || 'Failed to leave community. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  }, [community.id, community.name, isOwner, leaveCommunity, onClose, communityMembers, user?.id]);

  // Handle share community
  const handleShareCommunity = useCallback(async () => {
    try {
      const shareUrl = `https://app.stunxt.com/communities/${community.id}`;
      const message = `Check out "${community.name}" on Stunxt!\n\n${community.description || 'Join our community!'}\n\n${shareUrl}`;
      
      await Share.share({
        message,
        url: shareUrl,
        title: community.name,
      });
    } catch (error) {
      console.error('Failed to share community:', error);
    }
  }, [community.id, community.name, community.description]);

  // Handle invite management
  const handleInviteManagement = useCallback(() => {
    setShowInviteModal(true);
  }, []);

  // Handle community settings
  const handleCommunitySettings = useCallback(() => {
    // TODO: Navigate to community settings
    Alert.alert('Community Settings', 'Community settings will be implemented soon.');
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
  const formatCreationDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Render info tab
  const renderInfoTab = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <VStack className="p-4 space-y-6">
        {/* Community Header */}
        <VStack className="items-center space-y-4">
          <Avatar
            source={community.avatarUrl ? { uri: community.avatarUrl } : undefined}
            fallbackText={community.name}
            size={80}
          />
          
          <VStack className="items-center space-y-2">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {community.name}
            </Text>
            
            <HStack className="items-center space-x-4">
              <HStack className="items-center space-x-1">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {formatMemberCount(community.memberCount)} members
                </Text>
              </HStack>
              
              <HStack className="items-center space-x-1">
                <MaterialIcons name="forum" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {community.spaceCount} spaces
                </Text>
              </HStack>
            </HStack>

            {/* Community Type Badge */}
            <View
              className={`px-3 py-1 rounded-full ${
                community.type === 'public'
                  ? 'bg-green-100 dark:bg-green-900/20'
                  : community.type === 'private'
                  ? 'bg-blue-100 dark:bg-blue-900/20'
                  : 'bg-purple-100 dark:bg-purple-900/20'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  community.type === 'public'
                    ? 'text-green-700 dark:text-green-400'
                    : community.type === 'private'
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-purple-700 dark:text-purple-400'
                }`}
              >
                {community.type.charAt(0).toUpperCase() + community.type.slice(1)} Community
              </Text>
            </View>
          </VStack>
        </VStack>

        {/* Description */}
        {community.description && (
          <VStack className="space-y-2">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              About
            </Text>
            <Text className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {community.description}
            </Text>
          </VStack>
        )}

        {/* Community Stats */}
        <VStack className="space-y-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Community Info
          </Text>
          
          <VStack className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
            <HStack className="items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Created</Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {formatCreationDate(community.createdAt)}
              </Text>
            </HStack>
            
            <HStack className="items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">Category</Text>
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {(community as any).category || 'General'}
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
          </VStack>
        </VStack>

        {/* External Links */}
        {(community.website || community.discordUrl || community.twitterHandle || community.githubOrg) && (
          <VStack className="space-y-2">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Links
            </Text>
            
            <VStack className="space-y-2">
              {community.website && (
                <Pressable
                  onPress={() => Linking.openURL(community.website!)}
                  className="flex-row items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg active:scale-[0.98]"
                >
                  <MaterialIcons name="language" size={20} color="#3B82F6" />
                  <Text className="text-blue-600 dark:text-blue-400 font-medium">
                    Website
                  </Text>
                </Pressable>
              )}
              
              {community.discordUrl && (
                <Pressable
                  onPress={() => Linking.openURL(community.discordUrl!)}
                  className="flex-row items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg active:scale-[0.98]"
                >
                  <MaterialIcons name="chat" size={20} color="#5865F2" />
                  <Text className="text-gray-700 dark:text-gray-300 font-medium">
                    Discord
                  </Text>
                </Pressable>
              )}
              
              {community.twitterHandle && (
                <Pressable
                  onPress={() => Linking.openURL(`https://twitter.com/${community.twitterHandle}`)}
                  className="flex-row items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg active:scale-[0.98]"
                >
                  <MaterialIcons name="alternate-email" size={20} color="#1DA1F2" />
                  <Text className="text-gray-700 dark:text-gray-300 font-medium">
                    @{community.twitterHandle}
                  </Text>
                </Pressable>
              )}
              
              {community.githubOrg && (
                <Pressable
                  onPress={() => Linking.openURL(`https://github.com/${community.githubOrg}`)}
                  className="flex-row items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg active:scale-[0.98]"
                >
                  <MaterialIcons name="code" size={20} color="#333" />
                  <Text className="text-gray-700 dark:text-gray-300 font-medium">
                    GitHub
                  </Text>
                </Pressable>
              )}
            </VStack>
          </VStack>
        )}

        {/* Action Buttons */}
        <VStack className="space-y-3">
          <Button
            variant="outline"
            size="md"
            onPress={handleShareCommunity}
          >
            <MaterialIcons name="share" size={20} color="#3B82F6" />
            <ButtonText className="ml-2">Share Community</ButtonText>
          </Button>

          {isModerator && (
            <Button
              variant="outline"
              size="md"
              onPress={handleInviteManagement}
            >
              <MaterialIcons name="person-add" size={20} color="#3B82F6" />
              <ButtonText className="ml-2">Manage Invites</ButtonText>
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            onPress={handleLeaveCommunity}
            disabled={isLeaving}
          >
            <MaterialIcons name="exit-to-app" size={20} color="#EF4444" />
            <ButtonText className="ml-2 text-red-600">
              {isLeaving ? 'Leaving...' : 'Leave Community'}
            </ButtonText>
          </Button>
        </VStack>
      </VStack>
    </ScrollView>
  );

  // Render members tab
  const renderMembersTab = () => (
    <MemberList
      communityId={community.id}
      currentUserRole={userRole as 'owner' | 'admin' | 'moderator' | 'member' | 'restricted'}
      type="community"
    />
  );

  // Render settings tab
  const renderSettingsTab = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <VStack className="p-4 space-y-4">
        {isAdmin && (
          <>
            <Button
              variant="outline"
              size="md"
              onPress={handleCommunitySettings}
            >
              <MaterialIcons name="settings" size={20} color="#3B82F6" />
              <ButtonText className="ml-2">Community Settings</ButtonText>
            </Button>
            
            <Button
              variant="outline"
              size="md"
              onPress={() => Alert.alert('Audit Logs', 'Audit logs will be implemented soon.')}
            >
              <MaterialIcons name="history" size={20} color="#3B82F6" />
              <ButtonText className="ml-2">Audit Logs</ButtonText>
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="md"
          onPress={() => Alert.alert('Report Community', 'Report functionality will be implemented soon.')}
        >
          <MaterialIcons name="report" size={20} color="#EF4444" />
          <ButtonText className="ml-2 text-red-600">Report Community</ButtonText>
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
              Community Info
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

      {/* ✅ INVITE MANAGEMENT MODAL */}
      <InviteManagementModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        community={community}
      />
    </View>
  );
}
