import React, { useState, useCallback } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../ui/text';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';
import { Button, ButtonText } from '../ui/button';
import { Avatar } from '../Avatar';
import { CommunityMember, SpaceMember } from '../../services/memberManagementApi';
import { useAuth } from '../../stores/auth';

interface MemberCardProps {
  member: CommunityMember | SpaceMember;
  currentUserRole: 'owner' | 'admin' | 'moderator' | 'member' | 'restricted';
  onRoleUpdate?: (userId: string, newRole: string) => void;
  onBan?: (userId: string, reason?: string) => void;
  onUnban?: (userId: string) => void;
  onRemove?: (userId: string) => void;
  isUpdating?: boolean;
  isBanning?: boolean;
  isRemoving?: boolean;
  type: 'community' | 'space';
}

const ROLE_COLORS = {
  owner: '#DC2626', // red-600
  admin: '#EA580C', // orange-600
  moderator: '#7C3AED', // violet-600
  member: '#059669', // emerald-600
  restricted: '#6B7280', // gray-500
};

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
  restricted: 'Restricted',
};

const STATUS_COLORS = {
  active: '#10B981', // emerald-500
  pending: '#F59E0B', // amber-500
  banned: '#EF4444', // red-500
  suspended: '#F97316', // orange-500
  left: '#6B7280', // gray-500
  kicked: '#DC2626', // red-600
};

export function MemberCard({
  member,
  currentUserRole,
  onRoleUpdate,
  onBan,
  onUnban,
  onRemove,
  isUpdating = false,
  isBanning = false,
  isRemoving = false,
  type,
}: MemberCardProps) {
  const { user: currentUser } = useAuth();
  const [showActions, setShowActions] = useState(false);

  // Check if current user can manage this member
  const canManageMember = useCallback(() => {
    if (!currentUser || currentUser.id === member.userId) return false;
    
    // Owner can manage everyone except other owners
    if (currentUserRole === 'owner') {
      return member.role !== 'owner';
    }
    
    // Admin can manage moderators and members
    if (currentUserRole === 'admin') {
      return ['moderator', 'member', 'restricted'].includes(member.role);
    }
    
    // Moderator can manage members only
    if (currentUserRole === 'moderator') {
      return ['member', 'restricted'].includes(member.role);
    }
    
    return false;
  }, [currentUser, currentUserRole, member.role, member.userId]);

  // Check if current user can promote/demote this member
  const canChangeRole = useCallback(() => {
    if (!canManageMember()) return false;
    
    // Owner can change anyone's role (except other owners)
    if (currentUserRole === 'owner') {
      return member.role !== 'owner';
    }
    
    // Admin can promote to moderator or demote to member
    if (currentUserRole === 'admin') {
      return ['moderator', 'member', 'restricted'].includes(member.role);
    }
    
    return false;
  }, [canManageMember, currentUserRole, member.role]);

  const handleRoleUpdate = useCallback((newRole: string) => {
    if (!onRoleUpdate) return;
    
    Alert.alert(
      'Change Role',
      `Change ${member.user.fullName || member.user.username}'s role to ${ROLE_LABELS[newRole as keyof typeof ROLE_LABELS]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'default',
          onPress: () => onRoleUpdate(member.userId, newRole),
        },
      ]
    );
  }, [member.user.fullName, member.user.username, member.userId, onRoleUpdate]);

  const handleBan = useCallback(() => {
    if (!onBan) return;
    
    Alert.alert(
      'Ban Member',
      `Are you sure you want to ban ${member.user.fullName || member.user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Ban Reason',
              'Enter a reason for banning this member (optional):',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Ban',
                  style: 'destructive',
                  onPress: (reason) => onBan(member.userId, reason),
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  }, [member.user.fullName, member.user.username, member.userId, onBan]);

  const handleUnban = useCallback(() => {
    if (!onUnban) return;
    
    Alert.alert(
      'Unban Member',
      `Are you sure you want to unban ${member.user.fullName || member.user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unban',
          style: 'default',
          onPress: () => onUnban(member.userId),
        },
      ]
    );
  }, [member.user.fullName, member.user.username, member.userId, onUnban]);

  const handleRemove = useCallback(() => {
    if (!onRemove) return;
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user.fullName || member.user.username} from this ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(member.userId),
        },
      ]
    );
  }, [member.user.fullName, member.user.username, member.userId, onRemove, type]);

  const formatLastSeen = (lastSeenAt?: string) => {
    if (!lastSeenAt) return 'Never';
    
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const isCurrentUser = currentUser?.id === member.userId;
  const showManagementActions = canManageMember() && !isCurrentUser;

  return (
    <Pressable
      onPress={() => setShowActions(!showActions)}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700 active:scale-[0.98]"
    >
      <HStack className="items-center justify-between">
        <HStack className="items-center flex-1 space-x-3">
          {/* Avatar with online status */}
          <View className="relative">
            <Avatar
              source={member.user.avatarUrl ? { uri: member.user.avatarUrl } : undefined}
              fallbackText={member.user.fullName || member.user.username}
              size="md"
            />
            {member.user.isOnline && (
              <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            )}
          </View>

          {/* Member Info */}
          <VStack className="flex-1">
            <HStack className="items-center space-x-2">
              <Text className="font-semibold text-gray-900 dark:text-white text-base">
                {member.user.fullName || member.user.username}
              </Text>
              {isCurrentUser && (
                <Text className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  (You)
                </Text>
              )}
            </HStack>
            
            <HStack className="items-center space-x-2 mt-1">
              {/* Role Badge */}
              <View
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: `${ROLE_COLORS[member.role]}20` }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: ROLE_COLORS[member.role] }}
                >
                  {ROLE_LABELS[member.role]}
                </Text>
              </View>

              {/* Status Badge */}
              {member.status !== 'active' && (
                <View
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${STATUS_COLORS[member.status]}20` }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: STATUS_COLORS[member.status] }}
                  >
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </Text>
                </View>
              )}
            </HStack>

            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Last seen: {formatLastSeen(member.user.lastSeenAt)}
            </Text>
          </VStack>
        </HStack>

        {/* Action Button */}
        {showManagementActions && (
          <Pressable
            onPress={() => setShowActions(!showActions)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 active:scale-95"
          >
            <MaterialIcons
              name={showActions ? "expand-less" : "expand-more"}
              size={20}
              color="#6B7280"
            />
          </Pressable>
        )}
      </HStack>

      {/* Management Actions */}
      {showActions && showManagementActions && (
        <VStack className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Role Management */}
          {canChangeRole() && (
            <VStack className="space-y-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Change Role:
              </Text>
              <HStack className="space-x-2 flex-wrap">
                {(['member', 'moderator', 'admin'] as const).map((role) => {
                  if (role === member.role) return null;
                  if (role === 'admin' && currentUserRole !== 'owner') return null;
                  
                  return (
                    <Button
                      key={role}
                      variant="outline"
                      size="sm"
                      onPress={() => handleRoleUpdate(role)}
                      disabled={isUpdating}
                      className="mb-2"
                    >
                      <ButtonText className="text-xs">
                        Make {ROLE_LABELS[role]}
                      </ButtonText>
                    </Button>
                  );
                })}
              </HStack>
            </VStack>
          )}

          {/* Moderation Actions */}
          <HStack className="space-x-2 flex-wrap">
            {member.status === 'banned' ? (
              <Button
                variant="outline"
                size="sm"
                onPress={handleUnban}
                disabled={isBanning}
                className="mb-2"
              >
                <ButtonText className="text-xs text-green-600">
                  {isBanning ? 'Unbanning...' : 'Unban'}
                </ButtonText>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onPress={handleBan}
                disabled={isBanning}
                className="mb-2"
              >
                <ButtonText className="text-xs text-orange-600">
                  {isBanning ? 'Banning...' : 'Ban'}
                </ButtonText>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onPress={handleRemove}
              disabled={isRemoving}
              className="mb-2"
            >
              <ButtonText className="text-xs text-red-600">
                {isRemoving ? 'Removing...' : 'Remove'}
              </ButtonText>
            </Button>
          </HStack>
        </VStack>
      )}
    </Pressable>
  );
}
