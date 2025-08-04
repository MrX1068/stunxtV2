import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
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
import { useCommunities, useSpaces, useAuth } from '@/stores';
import { SpaceList } from '@/components/community';
import { PermissionManager } from '@/utils/permissions';
import type { Community, Space } from '@/stores';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useTheme();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const { user } = useAuth();
  const {
    getCommunityById,
    joinCommunity,
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
      
      // Fetch community details
      const communityData = getCommunityById(id);
      setCommunity(communityData || null);
      
      // 🔧 FIX: Ensure spaces are fetched correctly
      const loadCommunitySpaces = async () => {
        try {
          
          await fetchSpacesByCommunity(id);
         
        } catch (error) {
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
    router.push(`/space/${space.id}` as any);
  };

  const handleJoinSpace = async (spaceId: string) => {
    try {
      await joinSpace(spaceId);
    } catch (error) {
    }
  };

  const handleLeaveSpace = async (spaceId: string) => {
    try {
      await leaveSpace(spaceId);
    } catch (error) {
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
 
  
  // 🛡️ Professional Role-Based Permissions
  const canCreateSpace = PermissionManager.canCreateSpaceInCommunity(user, community);
  const canManageCommunity = PermissionManager.canManageCommunity(user, community);
  


  // 🚀 Professional UX - Industry Standard Join Logic (Telegram/WhatsApp Pattern)
  const getJoinActionConfig = () => {
    if (!community) return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    
    const isOwner = community.isOwner || (user?.id && community.ownerId === user.id);
    
    // Owner - no join button needed
    if (isOwner) {
      return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    }
    
    // Already joined - show leave option in settings
    if (community.isJoined) {
      return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    }
    
    // Privacy-based join actions (industry standard)
    switch (community.type) {
      case 'public':
        return { 
          show: true, 
          text: '🌍 Join Community', 
          variant: 'solid' as const, 
          color: 'bg-emerald-600',
          description: 'Join this public community instantly'
        };
      case 'private':
        return { 
          show: true, 
          text: '🔒 Request to Join', 
          variant: 'solid' as const, 
          color: 'bg-amber-600',
          description: 'Send join request to community admins'
        };
      case 'secret':
        return { 
          show: false, 
          text: '', 
          variant: 'solid' as const, 
          color: 'bg-purple-600',
          description: 'Secret communities are invite-only'
        };
      default:
        return { show: false, text: '', variant: 'solid' as const, color: 'bg-primary-600' };
    }
  };

  const joinActionConfig = getJoinActionConfig();

  // Professional join handler with proper UX feedback
  const handleJoinCommunity = async () => {
    if (!community || !joinActionConfig.show) return;
    
    try {
      setIsJoining(true);
      
      if (community.type === 'private') {
        // TODO: Implement join request system
        await joinCommunity(community.id);
        Alert.alert(
          'Request Sent',
          'Your join request has been sent to community admins. You\'ll be notified when it\'s reviewed.',
          [{ text: 'OK' }]
        );
      } else {
        await joinCommunity(community.id);
        Alert.alert(
          'Welcome!',
          `You've successfully joined ${community.name}. Start exploring the spaces!`,
          [{ text: 'Explore Spaces' }]
        );
      }
      
      // Refetch community data
      const updatedCommunity = getCommunityById(community.id);
      setCommunity(updatedCommunity || null);
    } catch (error) {
      Alert.alert(
        'Join Failed',
        'Unable to join the community right now. Please try again.',
        [{ text: 'Try Again' }]
      );
    } finally {
      setIsJoining(false);
    }
  };

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
        {/* 🚀 Professional Community Access Gate */}
        {!community?.isJoined && community?.ownerId !== user?.id ? (
          <Box className="flex-1 justify-center items-center px-8">
            <VStack space="xl" className="items-center max-w-sm">
              <Box className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full items-center justify-center shadow-xl">
                <MaterialIcons name="groups" size={40} color="white" />
              </Box>
              
              <VStack space="md" className="items-center">
                <Text size="2xl" className="font-bold text-center text-gray-900 dark:text-gray-100">
                  Join {community.name}
                </Text>
                <Text className="text-center text-gray-600 dark:text-gray-400 leading-relaxed">
                  {community.description}
                </Text>
                <Text size="sm" className="text-center text-gray-500 dark:text-gray-500">
                  Join this community to access {currentCommunitySpaces.length} spaces and connect with {community.memberCount || 0} members
                </Text>
              </VStack>
              
              {joinActionConfig.show && (
                <Button
                  size="lg"
                  onPress={handleJoinCommunity}
                  disabled={isJoining}
                  className={`${joinActionConfig.color} w-full shadow-lg rounded-xl`}
                >
                  <ButtonText size="lg" className="text-white font-semibold">
                    {isJoining ? '⏳ Processing...' : joinActionConfig.text}
                  </ButtonText>
                </Button>
              )}
            </VStack>
          </Box>
        ) : (
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
            // 🚀 No access control needed - user is already a member
          />
        )}
      </View>
    </View>
  );
}
