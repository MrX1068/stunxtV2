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
import { SpaceCard } from './SpaceCard';
import type { Space } from '@/stores';

interface SpaceListProps {
  spaces: Space[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onSpacePress?: (space: Space) => void;
  onJoinSpace?: (spaceId: string) => void;
  onLeaveSpace?: (spaceId: string) => void;
  onCreateSpace?: () => void;
  title?: string;
  emptyMessage?: string;
  showSearch?: boolean;
  showCreateButton?: boolean;
  showCommunity?: boolean;
  variant?: 'default' | 'compact';
}

export function SpaceList({
  spaces = [], // 🔧 Add default empty array here too
  isLoading = false,
  onRefresh,
  onSpacePress,
  onJoinSpace,
  onLeaveSpace,
  onCreateSpace,
  title = "Spaces",
  emptyMessage = "No spaces found",
  showSearch = true,
  showCreateButton = true,
  showCommunity = false,
  variant = 'default',
}: SpaceListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 🔧 Ensure spaces is always an array
  const safeSpaces = Array.isArray(spaces) ? spaces : [];
  
  const filteredSpaces = safeSpaces.filter(space =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => (
    <VStack space="md" className="px-6 pb-4">
      <HStack className="justify-between items-center">
        <Text size="xl" className="font-bold text-typography-900">
          {title}
        </Text>
        {showCreateButton && (
          <Button size="sm" onPress={onCreateSpace}>
            <ButtonText size="sm">Create</ButtonText>
          </Button>
        )}
      </HStack>
      
      {showSearch && (
        <Input variant="outline" size="md">
          <InputField
            placeholder="Search spaces..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Input>
      )}
    </VStack>
  );

  const renderEmptyState = () => (
    <Box className="items-center justify-center py-12">
      <MaterialIcons name="space-dashboard" size={64} color="#D1D5DB" />
      <Text size="lg" className="text-typography-500 mt-4 text-center">
        {emptyMessage}
      </Text>
      {showCreateButton && (
        <Button 
          variant="outline" 
          className="mt-4"
          onPress={onCreateSpace}
        >
          <ButtonText>Create Your First Space</ButtonText>
        </Button>
      )}
    </Box>
  );

  const renderSpaceItem = ({ item }: { item: Space }) => (
    <Box className="px-6">
      <SpaceCard
        space={item}
        variant={variant}
        showCommunity={showCommunity}
        onPress={() => onSpacePress?.(item)}
        onJoinPress={() => onJoinSpace?.(item.id)}
        onLeavePress={() => onLeaveSpace?.(item.id)}
      />
    </Box>
  );

  return (
    <VStack className="flex-1">
      <FlatList
        data={filteredSpaces}
        renderItem={renderSpaceItem}
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
