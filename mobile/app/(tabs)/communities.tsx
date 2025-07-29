import React, { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import {
  HStack,
  Box,
  Heading,
  Button,
  ButtonText,
} from "@/components/ui";
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from "@/providers/ThemeProvider";
import { useCommunities } from "@/stores";
import { ThemeToggleButton } from "@/components/ThemeSelector";
import { 
  CommunityList,
} from "@/components/community";
import type { Community } from "@/stores";

export default function CommunitiesScreen() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'discover' | 'joined' | 'owned'>('discover');
  
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
        console.warn('Failed to load communities data:', error);
      }
    };

    loadData();
  }, []);

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
      console.warn('Failed to refresh data:', error);
    }
  };

  const handleCommunityPress = (community: Community) => {
    // Navigate to community detail screen with spaces
    console.log('Opening community:', community.name);
    router.push(`/community/${community.id}`);
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      await joinCommunity(communityId);
    } catch (error) {
      console.warn('Failed to join community:', error);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    try {
      await leaveCommunity(communityId);
    } catch (error) {
      console.warn('Failed to leave community:', error);
    }
  };

  const handleCreateCommunity = () => {
    router.push('/create-community');
  };

  const tabs = [
    { id: 'discover' as const, label: 'Discover', icon: 'explore' as const },
    { id: 'joined' as const, label: 'Joined', icon: 'group' as const },
    { id: 'owned' as const, label: 'Owned', icon: 'star' as const },
  ];

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
            onCreateCommunity={handleCreateCommunity}
            title="Discover Communities"
            emptyMessage="No communities found. Be the first to create one!"
            showCreateButton={true}
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
            onCreateCommunity={handleCreateCommunity}
            title="Your Communities"
            emptyMessage="You haven't joined any communities yet."
            showCreateButton={false}
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
            onCreateCommunity={handleCreateCommunity}
            title="Communities You Own"
            emptyMessage="You don't own any communities yet."
            showCreateButton={true}
            variant="featured"
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <Box className="bg-background-0 border-b border-outline-200 pt-12 pb-4 px-6">
        <HStack className="justify-between items-center">
          <Heading size="xl" className="font-bold text-typography-900">
            Communities
          </Heading>
          <ThemeToggleButton />
        </HStack>
        
        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          <HStack space="md">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "solid" : "outline"}
                size="sm"
                onPress={() => setActiveTab(tab.id as any)}
                className={`
                  ${activeTab === tab.id 
                    ? 'bg-primary-600 border-primary-600' 
                    : 'bg-transparent border-outline-300'
                  }
                `}
              >
                <HStack space="xs" className="items-center">
                  <MaterialIcons 
                    name={tab.icon as any} 
                    size={16} 
                    color={activeTab === tab.id ? '#FFFFFF' : '#6B7280'} 
                  />
                  <ButtonText 
                    size="sm" 
                    className={`
                      ${activeTab === tab.id 
                        ? 'text-white' 
                        : 'text-typography-600'
                      }
                    `}
                  >
                    {tab.label}
                  </ButtonText>
                </HStack>
              </Button>
            ))}
          </HStack>
        </ScrollView>
      </Box>

      {/* Content */}
      <View className="flex-1">
        {renderTabContent()}
      </View>
    </View>
  );
}
