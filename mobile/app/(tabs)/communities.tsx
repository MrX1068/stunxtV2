import React, { useEffect, useState } from "react";
import { View, ScrollView, Animated, Dimensions } from "react-native";
import { router } from "expo-router";
import {
  HStack,
  Box,
  Heading,
  Button,
  ButtonText,
  Text,
  VStack,
} from "@/components/ui";
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from "@/providers/ThemeContext";
import { useCommunities, useAuth } from "@/stores";
import { PermissionManager } from "@/utils/permissions";
import { ThemeToggleAdvanced } from "@/components/ThemeToggleAdvanced";
import { 
  CommunityList,
} from "@/components/community";
import type { Community } from "@/stores";

const { width } = Dimensions.get('window');

export default function CommunitiesScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'joined' | 'owned'>('discover');
  const [slideAnim] = useState(new Animated.Value(0));
  
  const {
    communities,
    joinedCommunities,
    ownedCommunities,
    isLoading: isLoadingCommunities,
    error: communitiesError,
    fetchCommunities,
    fetchJoinedCommunities,
    fetchOwnedCommunities,
    joinCommunity,
    leaveCommunity,
    clearErrors: clearCommunitiesErrors,
  } = useCommunities();

  // 🛡️ Professional Role-Based Permissions
  const canCreateCommunity = PermissionManager.canCreateCommunity(user);
  

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchCommunities(),
          fetchJoinedCommunities(),
          fetchOwnedCommunities(),
        ]);
      } catch (error) {
      }
    };

    loadData();
  }, []);

  // Animate tab change
  useEffect(() => {
    const tabIndex = activeTab === 'discover' ? 0 : activeTab === 'joined' ? 1 : 2;
    Animated.spring(slideAnim, {
      toValue: tabIndex,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const handleRefresh = async () => {
    clearCommunitiesErrors();
    
    try {
      switch (activeTab) {
        case 'discover':
          await fetchCommunities();
          break;
        case 'joined':
          await fetchJoinedCommunities();
          break;
        case 'owned':
          await fetchOwnedCommunities();
          break;
      }
    } catch (error) {
    }
  };

  const handleCommunityPress = (community: Community) => {
    // Navigate to community detail screen with spaces
    router.push(`/community/${community.id}`);
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      await joinCommunity(communityId);
    } catch (error) {
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    try {
      await leaveCommunity(communityId);
    } catch (error) {
    }
  };

  const handleCreateCommunity = () => {
    router.push('/create-community');
  };

  const tabs = [
    { 
      id: 'discover' as const, 
      label: 'Discover', 
      icon: 'explore' as const,
      count: communities.length,
      color: '#3B82F6'
    },
    { 
      id: 'joined' as const, 
      label: 'Joined', 
      icon: 'group' as const,
      count: joinedCommunities.length,
      color: '#10B981'
    },
    { 
      id: 'owned' as const, 
      label: 'Owned', 
      icon: 'star' as const,
      count: ownedCommunities.length,
      color: '#F59E0B'
    },
  ];

  const getStatsForTab = () => {
    switch (activeTab) {
      case 'discover':
        return {
          total: communities.length,
          subtitle: 'Communities available to join',
          trending: Math.floor(Math.random() * 20) + 5
        };
      case 'joined':
        return {
          total: joinedCommunities.length,
          subtitle: 'Communities you\'re a member of',
          active: joinedCommunities.filter(c => Math.random() > 0.5).length
        };
      case 'owned':
        return {
          total: ownedCommunities.length,
          subtitle: 'Communities you manage',
          totalMembers: ownedCommunities.reduce((sum, c) => sum + (c.memberCount || 0), 0)
        };
    }
  };

  const renderTabContent = () => {
    const isLoading = isLoadingCommunities;

    switch (activeTab) {
      case 'discover':
        return (
          <CommunityList
            communities={communities}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onCommunityPress={handleCommunityPress}
            onJoinCommunity={handleJoinCommunity}
            onLeaveCommunity={handleLeaveCommunity}
            onCreateCommunity={canCreateCommunity ? handleCreateCommunity : undefined}
            title="Discover Communities"
            emptyMessage="No communities found. Be the first to create one!"
            showCreateButton={canCreateCommunity}
            variant="default"
          />
        );
      
      case 'joined':
        return (
          <CommunityList
            communities={joinedCommunities}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onCommunityPress={handleCommunityPress}
            onJoinCommunity={handleJoinCommunity}
            onLeaveCommunity={handleLeaveCommunity}
            onCreateCommunity={canCreateCommunity ? handleCreateCommunity : undefined}
            title="Your Communities"
            emptyMessage="You haven't joined any communities yet."
            showCreateButton={canCreateCommunity}
            variant="compact"
          />
        );
      
      case 'owned':
        return (
          <CommunityList
            communities={ownedCommunities}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onCommunityPress={handleCommunityPress}
            onJoinCommunity={handleJoinCommunity}
            onLeaveCommunity={handleLeaveCommunity}
            onCreateCommunity={canCreateCommunity ? handleCreateCommunity : undefined}
            title="Communities You Own"
            emptyMessage="You don't own any communities yet."
            showCreateButton={canCreateCommunity}
            variant="featured"
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Header */}
      <Box className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-12 pb-6 px-6">
        <HStack className="justify-between items-center mb-6">
          <VStack>
            <Heading size="2xl" className="font-bold text-gray-900 dark:text-gray-100">
              Communities
            </Heading>
            <Text size="sm" className="text-gray-500 dark:text-gray-400 mt-1">
              {getStatsForTab().subtitle}
            </Text>
          </VStack>
          <VStack className="items-end">
            <ThemeToggleAdvanced />
            <Text size="xs" className="text-gray-400 mt-1">
              {getStatsForTab().total} total
            </Text>
          </VStack>
        </HStack>

        {/* Stats Cards */}
        <HStack space="md" className="mb-6">
          {activeTab === 'discover' && (
            <>
              <Box className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                <HStack space="sm" className="items-center mb-2">
                  <MaterialIcons name="trending-up" size={16} color="#3B82F6" />
                  <Text size="xs" className="text-blue-600 dark:text-blue-400 font-medium">Trending</Text>
                </HStack>
                <Text size="lg" className="font-bold text-blue-700 dark:text-blue-300">
                  {getStatsForTab().trending}
                </Text>
              </Box>
              <Box className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                <HStack space="sm" className="items-center mb-2">
                  <MaterialIcons name="public" size={16} color="#10B981" />
                  <Text size="xs" className="text-emerald-600 dark:text-emerald-400 font-medium">Public</Text>
                </HStack>
                <Text size="lg" className="font-bold text-emerald-700 dark:text-emerald-300">
                  {communities.filter(c => c.type === 'public').length}
                </Text>
              </Box>
            </>
          )}
          
          {activeTab === 'joined' && (
            <>
              <Box className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                <HStack space="sm" className="items-center mb-2">
                  <MaterialIcons name="motion-photos-on" size={16} color="#10B981" />
                  <Text size="xs" className="text-emerald-600 dark:text-emerald-400 font-medium">Active</Text>
                </HStack>
                <Text size="lg" className="font-bold text-emerald-700 dark:text-emerald-300">
                  {getStatsForTab().active}
                </Text>
              </Box>
              <Box className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                <HStack space="sm" className="items-center mb-2">
                  <MaterialIcons name="notifications" size={16} color="#3B82F6" />
                  <Text size="xs" className="text-blue-600 dark:text-blue-400 font-medium">Updates</Text>
                </HStack>
                <Text size="lg" className="font-bold text-blue-700 dark:text-blue-300">
                  {Math.floor(Math.random() * 10) + 1}
                </Text>
              </Box>
            </>
          )}
          
          {activeTab === 'owned' && (
            <>
              <Box className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
                <HStack space="sm" className="items-center mb-2">
                  <MaterialIcons name="people" size={16} color="#F59E0B" />
                  <Text size="xs" className="text-amber-600 dark:text-amber-400 font-medium">Members</Text>
                </HStack>
                <Text size="lg" className="font-bold text-amber-700 dark:text-amber-300">
                  {getStatsForTab().totalMembers}
                </Text>
              </Box>
              <Box className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                <HStack space="sm" className="items-center mb-2">
                  <MaterialIcons name="settings" size={16} color="#8B5CF6" />
                  <Text size="xs" className="text-purple-600 dark:text-purple-400 font-medium">Manage</Text>
                </HStack>
                <Text size="lg" className="font-bold text-purple-700 dark:text-purple-300">
                  {ownedCommunities.length}
                </Text>
              </Box>
            </>
          )}
        </HStack>
        
        {/* Enhanced Tab Navigation */}
        <Box className="relative">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 0 }}
          >
            <HStack space="sm">
              {tabs.map((tab, index) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "solid" : "outline"}
                  size="md"
                  onPress={() => setActiveTab(tab.id as any)}
                  className={`${activeTab === tab.id 
                    ? 'bg-primary-600 border-primary-600 shadow-lg' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                  }`}
                >
                  <HStack space="sm" className="items-center">
                    <MaterialIcons 
                      name={tab.icon as any} 
                      size={18} 
                      color={activeTab === tab.id ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280'} 
                    />
                    <VStack className="items-start">
                      <ButtonText 
                        size="sm" 
                        className={`font-semibold ${activeTab === tab.id 
                          ? 'text-white' 
                          : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {tab.label}
                      </ButtonText>
                      <Text size="xs" className={`${activeTab === tab.id 
                        ? 'text-white/80' 
                        : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {tab.count}
                      </Text>
                    </VStack>
                  </HStack>
                </Button>
              ))}
            </HStack>
          </ScrollView>
          
          {/* Tab Indicator */}
          <Animated.View
            className="absolute bottom-0 h-1 bg-primary-600 rounded-full"
            style={{
              width: width / 3 - 24,
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [0, width / 3 - 8, (width / 3 - 8) * 2],
                })
              }]
            }}
          />
        </Box>
      </Box>

      {/* Content with enhanced error handling */}
      <View className="flex-1">
        {communitiesError ? (
          <Box className="flex-1 items-center justify-center px-6">
            <MaterialIcons name="error-outline" size={64} color="#EF4444" />
            <Text size="lg" className="text-red-500 font-semibold mt-4 text-center">
              Something went wrong
            </Text>
            <Text size="sm" className="text-gray-500 mt-2 text-center">
              {communitiesError}
            </Text>
            <Button 
              variant="outline" 
              className="mt-6 border-primary-300 bg-primary-50"
              onPress={handleRefresh}
            >
              <ButtonText className="text-primary-700">Try Again</ButtonText>
            </Button>
          </Box>
        ) : (
          renderTabContent()
        )}
      </View>
    </View>
  );
}
