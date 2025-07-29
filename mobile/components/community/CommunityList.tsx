import React, { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
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

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => (
    <VStack space="md" className="px-6 pb-4">
      <HStack className="justify-between items-center">
        <Text size="xl" className="font-bold text-typography-900">
          {title}
        </Text>
        {showCreateButton && (
          <Button size="sm" onPress={onCreateCommunity}>
            <ButtonText size="sm">Create</ButtonText>
          </Button>
        )}
      </HStack>
      
      {showSearch && (
        <Input variant="outline" size="md">
          <InputField
            placeholder="Search communities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Input>
      )}
    </VStack>
  );

  const renderEmptyState = () => (
    <Box className="items-center justify-center py-12">
      <MaterialIcons name="group-work" size={64} color="#D1D5DB" />
      <Text size="lg" className="text-typography-500 mt-4 text-center">
        {emptyMessage}
      </Text>
      {showCreateButton && (
        <Button 
          variant="outline" 
          className="mt-4"
          onPress={onCreateCommunity}
        >
          <ButtonText>Create Your First Community</ButtonText>
        </Button>
      )}
    </Box>
  );

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <Box className="px-6">
      <CommunityCard
        community={item}
        variant={variant}
        onPress={() => onCommunityPress?.(item)}
        onJoinPress={() => onJoinCommunity?.(item.id)}
        onLeavePress={() => onLeaveCommunity?.(item.id)}
      />
    </Box>
  );

  return (
    <VStack className="flex-1">
      <FlatList
        data={filteredCommunities}
        renderItem={renderCommunityItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 20,
          flexGrow: 1,
        }}
      />
    </VStack>
  );
}
