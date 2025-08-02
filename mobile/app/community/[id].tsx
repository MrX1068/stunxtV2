import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeContext';
import { useCommunities, useSpaces } from '@/stores';
import { SpaceList } from '@/components/community';
import type { Community, Space } from '@/stores';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useTheme();
  const [community, setCommunity] = useState<Community | null>(null);

  const {
    getCommunityById,
    isLoading: isLoadingCommunity,
  } = useCommunities();

  const {
    spaces = [], // 🔧 Add default empty array to prevent undefined errors
    communitySpaces = {}, // 🔧 Add default empty object
    isLoading: isLoadingSpaces,
    fetchSpacesByCommunity,
    joinSpace,
    leaveSpace,
    clearErrors: clearSpacesErrors,
  } = useSpaces();

  useEffect(() => {
    if (id) {
      console.log('🏘️ Loading community details for ID:', id);
      
      // Fetch community details
      const communityData = getCommunityById(id);
      console.log('📋 Community data:', communityData);
      setCommunity(communityData || null);
      
      // 🔧 FIX: Ensure spaces are fetched correctly
      const loadCommunitySpaces = async () => {
        try {
          console.log('🚀 Fetching spaces for community:', id);
          await fetchSpacesByCommunity(id);
          console.log('✅ Spaces fetched successfully');
        } catch (error) {
          console.warn('❌ Failed to fetch spaces for community:', id, error);
        }
      };
      
      loadCommunitySpaces();
    }
  }, [id, getCommunityById, fetchSpacesByCommunity]);

  const handleBack = () => {
    router.back();
  };

  const handleCreateSpace = () => {
    // Pass community ID to the create space screen
    router.push(`/create-space?communityId=${id}`);
  };

  const handleSpacePress = (space: Space) => {
    console.log('🚀 Navigating to space:', space.name, 'Type:', space.interactionType);
    router.push(`/space/${space.id}` as any);
  };

  const handleJoinSpace = async (spaceId: string) => {
    try {
      await joinSpace(spaceId);
    } catch (error) {
      console.warn('Failed to join space:', error);
    }
  };

  const handleLeaveSpace = async (spaceId: string) => {
    try {
      await leaveSpace(spaceId);
    } catch (error) {
      console.warn('Failed to leave space:', error);
    }
  };

  const handleRefresh = async () => {
    clearSpacesErrors();
    if (id) {
      await fetchSpacesByCommunity(id);
    }
  };

  if (!community) {
    return (
      <View className="flex-1 bg-background-0 justify-center items-center">
        <Text>Community not found</Text>
      </View>
    );
  }

  // Get spaces for this specific community from the communitySpaces object
  const currentCommunitySpaces = id ? (communitySpaces[id] || []) : [];
  console.log('📦 Current community spaces:', { 
    communityId: id, 
    spacesCount: currentCommunitySpaces.length,
    communitySpacesKeys: Object.keys(communitySpaces)
  });
  
  const canCreateSpace = community?.isOwner || true; // TODO: Check proper permissions from community settings

  // 🚀 Enhanced empty state handling
  const hasSpaces = currentCommunitySpaces.length > 0;
  const isOwner = community?.isOwner;

  return (
    <View className="flex-1 bg-background-0">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <Box className="bg-background-0 border-b border-outline-200 pt-12 pb-4 px-6">
        <HStack className="justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onPress={handleBack}
          >
            <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
          </Button>
          
          {canCreateSpace && (
            <Button
              size="sm"
              onPress={handleCreateSpace}
            >
              <ButtonText size="sm">Create Space</ButtonText>
            </Button>
          )}
        </HStack>

        <VStack space="md">
          <Heading size="xl" className="font-bold text-typography-900">
            {community.name}
          </Heading>
          
          <Text className="text-typography-600">
            {community.description}
          </Text>

          <HStack space="lg" className="items-center">
            <HStack space="xs" className="items-center">
              <MaterialIcons name="group" size={16} color="#6B7280" />
              <Text size="sm" className="text-typography-500">
                {community.memberCount || 0} members
              </Text>
            </HStack>
            
            <HStack space="xs" className="items-center">
              <MaterialIcons name="space-dashboard" size={16} color="#6B7280" />
              <Text size="sm" className="text-typography-500">
                {currentCommunitySpaces.length} spaces
              </Text>
            </HStack>
            
            <Box className={`px-2 py-1 rounded-full ${
              community.type === 'private' ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <Text size="xs" className={`font-medium ${
                community.type === 'private' ? 'text-orange-700' : 'text-green-700'
              }`}>
                {community.type === 'private' ? 'Private' : community.type === 'secret' ? 'Secret' : 'Public'}
              </Text>
            </Box>
          </HStack>
        </VStack>
      </Box>

      {/* Spaces List */}
      <View className="flex-1">
        <SpaceList
          spaces={currentCommunitySpaces}
          isLoading={isLoadingSpaces}
          onRefresh={handleRefresh}
          onSpacePress={handleSpacePress}
          onJoinSpace={handleJoinSpace}
          onLeaveSpace={handleLeaveSpace}
          onCreateSpace={canCreateSpace ? handleCreateSpace : undefined}
          title={`Spaces (${currentCommunitySpaces.length})`}
          emptyMessage={isOwner 
            ? "No spaces yet. Create the first space to get discussions started!" 
            : "No spaces available in this community yet."
          }
          showCommunity={false}
          variant="default"
        />
      </View>
    </View>
  );
}
