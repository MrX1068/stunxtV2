import React, { useState, useMemo } from 'react';
import { FlatList, RefreshControl, Animated } from 'react-native';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
} from '@/components/ui';
import { MaterialIcons } from '@expo/vector-icons';
import { CommunityCard } from './CommunityCard';
import { Community } from '@/stores/posts';

interface CommunityListProps {
  communities: Community[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onCommunityPress?: (community: Community) => void;
  onJoinCommunity?: (communityId: string) => void;
  onLeaveCommunity?: (communityId: string) => void;
  onCreateCommunity?: () => void;
  title?: string;
  emptyMessage?: string;
  showSearch?: boolean;
  showCreateButton?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export function CommunityList({
  communities,
  isLoading = false,
  onRefresh,
  onCommunityPress,
  onJoinCommunity,
  onLeaveCommunity,
  onCreateCommunity,
  title = "Communities",
  emptyMessage = "No communities found",
  showSearch = true,
  showCreateButton = false,
  variant = 'default',
}: CommunityListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'secret'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'name'>('popular');
  
  const filteredAndSortedCommunities = useMemo(() => {
    let filtered = communities?.filter(community => {
      // 🔒 Secret communities should only show if user is already a member
      if (community?.type === 'secret' && !community?.isJoined) {
        return false;
      }

      const matchesSearch = community?.name.toLowerCase().includes(searchQuery?.toLowerCase()) ||
                           community?.description.toLowerCase().includes(searchQuery?.toLowerCase());
      const matchesType = filterType === 'all' || community?.type === filterType;
      return matchesSearch && matchesType;
    }) || [];

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.memberCount || 0) - (a.memberCount || 0);
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [communities, searchQuery, filterType, sortBy]);
  const renderHeader = () => (
    <VStack space="lg" className="px-6 pb-4">
      {title && (
        <HStack className="justify-between items-center">
          <VStack>
            <Text size="2xl" className="font-bold text-gray-900 dark:text-gray-100">
              {title}
            </Text>
            <Text size="sm" className="text-gray-500 dark:text-gray-400">
              {filteredAndSortedCommunities.length} communities found
            </Text>
          </VStack>
          {showCreateButton && (
            <Button
              size="md"
              onPress={onCreateCommunity}
              className="bg-primary-600 shadow-lg"
            >
              <HStack space="xs" className="items-center">
                <MaterialIcons name="add" size={18} color="white" />
                <ButtonText size="sm" className="text-white font-semibold">Create</ButtonText>
              </HStack>
            </Button>
          )}
        </HStack>
      )}
      
      {showSearch && (
        <VStack space="md">
          <Box className="relative">
            <Input variant="outline" size="md" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <InputField
                placeholder="Search communities..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="pl-10"
              />
            </Input>
            <Box className="absolute left-3 top-3">
              <MaterialIcons name="search" size={20} color="#6B7280" />
            </Box>
          </Box>
          
          {/* Filter Pills */}
          <HStack space="sm" className="flex-wrap">
            {(['all', 'public', 'private', 'secret'] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={filterType === type ? "solid" : "outline"}
                onPress={() => setFilterType(type)}
                className={`${filterType === type 
                  ? 'bg-primary-600 border-primary-600' 
                  : 'border-gray-300 bg-white dark:bg-gray-800'
                }`}
              >
                <ButtonText size="xs" className={filterType === type ? "text-white" : "text-gray-600 dark:text-gray-300"}>
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                </ButtonText>
              </Button>
            ))}
            
            <Box className="w-px h-6 bg-gray-300 mx-2" />
            
            {(['popular', 'recent', 'name'] as const).map((sort) => (
              <Button
                key={sort}
                size="sm"
                variant={sortBy === sort ? "solid" : "outline"}
                onPress={() => setSortBy(sort)}
                className={`${sortBy === sort 
                  ? 'bg-emerald-600 border-emerald-600' 
                  : 'border-gray-300 bg-white dark:bg-gray-800'
                }`}
              >
                <ButtonText size="xs" className={sortBy === sort ? "text-white" : "text-gray-600 dark:text-gray-300"}>
                  {sort === 'popular' ? '🔥 Popular' : sort === 'recent' ? '🕒 Recent' : '🔤 A-Z'}
                </ButtonText>
              </Button>
            ))}
          </HStack>
        </VStack>
      )}
    </VStack>
  );

  const renderEmptyState = () => (
    <Box className="items-center justify-center py-16">
      <Box className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-6">
        <MaterialIcons name="group-work" size={48} color="#9CA3AF" />
      </Box>
      <Text size="xl" className="text-gray-600 dark:text-gray-300 font-semibold mb-2 text-center">
        {searchQuery ? 'No communities match your search' : emptyMessage}
      </Text>
      <Text size="sm" className="text-gray-500 dark:text-gray-400 text-center mb-6 px-8">
        {searchQuery 
          ? `Try adjusting your search terms or filters` 
          : 'Join existing communities or create your own to get started'
        }
      </Text>
      {showCreateButton && !searchQuery && (
        <Button 
          variant="outline" 
          className="border-2 border-primary-300 bg-primary-50 dark:bg-primary-900/20 shadow-md"
          onPress={onCreateCommunity}
        >
          <HStack space="sm" className="items-center">
            <MaterialIcons name="add" size={20} color="#6366F1" />
            <ButtonText className="text-primary-700 font-semibold">Create Your First Community</ButtonText>
          </HStack>
        </Button>
      )}
    </Box>
  );

  const renderCommunityItem = ({ item, index }: { item: Community; index: number }) => (
    <Animated.View 
      style={{
        opacity: 1,
        transform: [{ translateY: 0 }]
      }}
    >
      <Box className="px-6">
        <CommunityCard
          community={item}
          variant={variant}
          onPress={() => onCommunityPress?.(item)}
          onJoinPress={() => onJoinCommunity?.(item.id)}
          onLeavePress={() => onLeaveCommunity?.(item.id)}
        />
      </Box>
    </Animated.View>
  );

  return (
    <VStack className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={filteredAndSortedCommunities}
        renderItem={renderCommunityItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl 
              refreshing={Boolean(isLoading)} 
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 32,
          flexGrow: 1,
        }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </VStack>
  );
}
