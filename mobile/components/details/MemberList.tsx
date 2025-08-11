import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../ui/text';
import { Input, InputField } from '../ui/input';
import { Button, ButtonText } from '../ui/button';
import { HStack } from '../ui/hstack';
import { VStack } from '../ui/vstack';
import { MemberCard } from './MemberCard';
import { useMemberManagement } from '../../stores/memberManagementStore';
import { CommunityMember, SpaceMember } from '../../services/memberManagementApi';

interface MemberListProps {
  communityId?: string;
  spaceId?: string;
  currentUserRole: 'owner' | 'admin' | 'moderator' | 'member' | 'restricted';
  type: 'community' | 'space';
  onMemberPress?: (member: CommunityMember | SpaceMember) => void;
}

const ROLE_FILTERS = [
  { value: '', label: 'All Roles' },
  { value: 'owner', label: 'Owners' },
  { value: 'admin', label: 'Admins' },
  { value: 'moderator', label: 'Moderators' },
  { value: 'member', label: 'Members' },
  { value: 'restricted', label: 'Restricted' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
  { value: 'pending', label: 'Pending' },
];

export function MemberList({
  communityId,
  spaceId,
  currentUserRole,
  type,
  onMemberPress,
}: MemberListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const {
    // State
    communityMembers,
    spaceMembers,
    loadingCommunityMembers,
    loadingSpaceMembers,
    communityMembersError,
    spaceMembersError,
    memberActionError,
    updatingMemberRole,
    banningMember,
    removingMember,

    // Actions
    fetchCommunityMembers,
    loadMoreCommunityMembers,
    searchCommunityMembers,
    updateCommunityMemberRole,
    banCommunityMember,
    unbanCommunityMember,
    removeCommunityMember,
    fetchSpaceMembers,
    loadMoreSpaceMembers,
    searchSpaceMembers,
    updateSpaceMemberRole,
    banSpaceMember,
    removeSpaceMember,
    clearMemberActionError,
    setMemberSearchQuery,
    setMemberFilters,
  } = useMemberManagement();

  // Get the appropriate data based on type
  const members = type === 'community' && communityId 
    ? communityMembers[communityId] || []
    : type === 'space' && spaceId
    ? spaceMembers[spaceId] || []
    : [];

  const isLoading = type === 'community' && communityId
    ? loadingCommunityMembers[communityId] || false
    : type === 'space' && spaceId
    ? loadingSpaceMembers[spaceId] || false
    : false;

  const error = type === 'community' && communityId
    ? communityMembersError[communityId]
    : type === 'space' && spaceId
    ? spaceMembersError[spaceId]
    : null;

  // Initial fetch
  useEffect(() => {
    if (type === 'community' && communityId) {
      fetchCommunityMembers(communityId);
    } else if (type === 'space' && spaceId && communityId) {
      fetchSpaceMembers(communityId, spaceId);
    }
  }, [type, communityId, spaceId, fetchCommunityMembers, fetchSpaceMembers]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (type === 'community' && communityId) {
      setMemberSearchQuery(communityId, query);
      searchCommunityMembers(communityId, query);
    } else if (type === 'space' && spaceId && communityId) {
      setMemberSearchQuery(spaceId, query);
      searchSpaceMembers(communityId, spaceId, query);
    }
  }, [type, communityId, spaceId, setMemberSearchQuery, searchCommunityMembers, searchSpaceMembers]);

  // Handle filter changes
  const handleFilterChange = useCallback(() => {
    const filters = {
      role: selectedRoleFilter || undefined,
      status: selectedStatusFilter || undefined,
    };

    if (type === 'community' && communityId) {
      setMemberFilters(communityId, filters);
      fetchCommunityMembers(communityId, {
        search: searchQuery || undefined,
        ...filters,
      });
    } else if (type === 'space' && spaceId && communityId) {
      setMemberFilters(spaceId, filters);
      fetchSpaceMembers(communityId, spaceId, {
        search: searchQuery || undefined,
        ...filters,
      });
    }
  }, [
    selectedRoleFilter,
    selectedStatusFilter,
    searchQuery,
    type,
    communityId,
    spaceId,
    setMemberFilters,
    fetchCommunityMembers,
    fetchSpaceMembers,
  ]);

  // Apply filters when they change
  useEffect(() => {
    if (selectedRoleFilter !== '' || selectedStatusFilter !== '') {
      handleFilterChange();
    }
  }, [selectedRoleFilter, selectedStatusFilter, handleFilterChange]);

  // Handle member actions
  const handleRoleUpdate = useCallback(async (userId: string, newRole: string) => {
    try {
      if (type === 'community' && communityId) {
        await updateCommunityMemberRole(communityId, userId, newRole);
      } else if (type === 'space' && spaceId && communityId) {
        await updateSpaceMemberRole(communityId, spaceId, userId, newRole);
      }
    } catch (error) {
      // Error is handled by the store
    }
  }, [type, communityId, spaceId, updateCommunityMemberRole, updateSpaceMemberRole]);

  const handleBan = useCallback(async (userId: string, reason?: string) => {
    try {
      if (type === 'community' && communityId) {
        await banCommunityMember(communityId, userId, reason);
      } else if (type === 'space' && spaceId && communityId) {
        await banSpaceMember(communityId, spaceId, userId, reason);
      }
    } catch (error) {
      // Error is handled by the store
    }
  }, [type, communityId, spaceId, banCommunityMember, banSpaceMember]);

  const handleUnban = useCallback(async (userId: string) => {
    try {
      if (type === 'community' && communityId) {
        await unbanCommunityMember(communityId, userId);
      }
      // Note: Space unban would need to be implemented in the API
    } catch (error) {
      // Error is handled by the store
    }
  }, [type, communityId, unbanCommunityMember]);

  const handleRemove = useCallback(async (userId: string) => {
    try {
      if (type === 'community' && communityId) {
        await removeCommunityMember(communityId, userId);
      } else if (type === 'space' && spaceId && communityId) {
        await removeSpaceMember(communityId, spaceId, userId);
      }
    } catch (error) {
      // Error is handled by the store
    }
  }, [type, communityId, spaceId, removeCommunityMember, removeSpaceMember]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (type === 'community' && communityId) {
      fetchCommunityMembers(communityId, {
        search: searchQuery || undefined,
        role: selectedRoleFilter || undefined,
        status: selectedStatusFilter || undefined,
      });
    } else if (type === 'space' && spaceId && communityId) {
      fetchSpaceMembers(communityId, spaceId, {
        search: searchQuery || undefined,
        role: selectedRoleFilter || undefined,
        status: selectedStatusFilter || undefined,
      });
    }
  }, [
    type,
    communityId,
    spaceId,
    searchQuery,
    selectedRoleFilter,
    selectedStatusFilter,
    fetchCommunityMembers,
    fetchSpaceMembers,
  ]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (type === 'community' && communityId) {
      loadMoreCommunityMembers(communityId);
    } else if (type === 'space' && spaceId && communityId) {
      loadMoreSpaceMembers(communityId, spaceId);
    }
  }, [type, communityId, spaceId, loadMoreCommunityMembers, loadMoreSpaceMembers]);

  // Render member item
  const renderMember = useCallback(({ item }: { item: CommunityMember | SpaceMember }) => {
    const actionKey = type === 'community' ? `${communityId}-${item.userId}` : `${spaceId}-${item.userId}`;
    
    return (
      <MemberCard
        member={item}
        currentUserRole={currentUserRole}
        onRoleUpdate={handleRoleUpdate}
        onBan={handleBan}
        onUnban={handleUnban}
        onRemove={handleRemove}
        isUpdating={updatingMemberRole[actionKey] || false}
        isBanning={banningMember[actionKey] || false}
        isRemoving={removingMember[actionKey] || false}
        type={type}
      />
    );
  }, [
    type,
    communityId,
    spaceId,
    currentUserRole,
    handleRoleUpdate,
    handleBan,
    handleUnban,
    handleRemove,
    updatingMemberRole,
    banningMember,
    removingMember,
  ]);

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <MaterialIcons name="people-outline" size={64} color="#9CA3AF" />
      <Text className="text-lg font-medium text-gray-500 dark:text-gray-400 mt-4">
        No members found
      </Text>
      <Text className="text-sm text-gray-400 dark:text-gray-500 text-center mt-2 max-w-xs">
        {searchQuery || selectedRoleFilter || selectedStatusFilter
          ? 'Try adjusting your search or filters'
          : `No members in this ${type} yet`}
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <MaterialIcons name="error-outline" size={64} color="#EF4444" />
      <Text className="text-lg font-medium text-red-600 dark:text-red-400 mt-4">
        Failed to load members
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 max-w-xs">
        {error}
      </Text>
      <Button
        variant="outline"
        size="sm"
        onPress={handleRefresh}
        className="mt-4"
      >
        <ButtonText>Try Again</ButtonText>
      </Button>
    </View>
  );

  if (error && members.length === 0) {
    return renderErrorState();
  }

  return (
    <View className="flex-1">
      {/* Search and Filters */}
      <VStack className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Search Bar */}
        <Input variant="outline" size="md" className="mb-3">
          <InputField
            placeholder={`Search ${type} members...`}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </Input>

        {/* Filter Toggle */}
        <HStack className="items-center justify-between">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
          
          <Button
            variant="outline"
            size="sm"
            onPress={() => setShowFilters(!showFilters)}
          >
            <MaterialIcons name="filter-list" size={16} color="#6B7280" />
            <ButtonText className="ml-1">Filters</ButtonText>
          </Button>
        </HStack>

        {/* Filters */}
        {showFilters && (
          <VStack className="mt-3 space-y-3">
            {/* Role Filter */}
            <VStack className="space-y-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Role:
              </Text>
              <HStack className="space-x-2 flex-wrap">
                {ROLE_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={selectedRoleFilter === filter.value ? 'solid' : 'outline'}
                    size="sm"
                    onPress={() => setSelectedRoleFilter(filter.value)}
                    className="mb-2"
                  >
                    <ButtonText className="text-xs">{filter.label}</ButtonText>
                  </Button>
                ))}
              </HStack>
            </VStack>

            {/* Status Filter */}
            <VStack className="space-y-2">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </Text>
              <HStack className="space-x-2 flex-wrap">
                {STATUS_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={selectedStatusFilter === filter.value ? 'solid' : 'outline'}
                    size="sm"
                    onPress={() => setSelectedStatusFilter(filter.value)}
                    className="mb-2"
                  >
                    <ButtonText className="text-xs">{filter.label}</ButtonText>
                  </Button>
                ))}
              </HStack>
            </VStack>
          </VStack>
        )}
      </VStack>

      {/* Member List */}
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={isLoading ? null : renderEmptyState}
        ListFooterComponent={
          isLoading && members.length > 0 ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : null
        }
      />

      {/* Error Message */}
      {memberActionError && (
        <View className="absolute bottom-4 left-4 right-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <HStack className="items-center justify-between">
            <Text className="text-red-600 dark:text-red-400 text-sm flex-1">
              {memberActionError}
            </Text>
            <Button
              variant="outline"
              size="sm"
              onPress={clearMemberActionError}
            >
              <MaterialIcons name="close" size={16} color="#DC2626" />
            </Button>
          </HStack>
        </View>
      )}
    </View>
  );
}
