import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Pressable,
  Text,
  ActivityIndicator,
  TextInput,
  FlatList,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Box, HStack, VStack } from "@/components/ui";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useCommunityStore,
  selectLoading,
  selectError,
  selectFromCache,
  Community,
} from "../../stores/community";
import { communityActions } from "../../stores/community";

import CommunityTabs, { CommunityTabType } from "../community/CommunityTabs";
import { CommunityCard } from "../community/CommunityCard";

/**
 * ✅ ENTERPRISE-GRADE COMMUNITY LIST SCREEN WITH 3-TAB INTERFACE
 *
 * Features:
 * - Professional 3-tab interface (Discover, Joined, Owned)
 * - Real API integration with backend endpoints
 * - SQLite caching for instant loading
 * - WebSocket real-time updates
 * - Comprehensive error handling
 * - Uses existing CommunityList component for consistency
 */

const CommunityListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<CommunityTabType>("joined");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "public" | "private" | "secret"
  >("all");
  const [sortBy, setSortBy] = useState<"popular" | "recent" | "name">(
    "popular"
  );

  // Store selectors
  const communities = useCommunityStore((state) => state.communities);
  const joinedCommunities = useCommunityStore(
    (state) => state.joinedCommunities
  );
  const ownedCommunities = useCommunityStore((state) => state.ownedCommunities);
  const loading = useCommunityStore(selectLoading);

  const error = useCommunityStore(selectError);
  const fromCache = useCommunityStore(selectFromCache);

  // Initialize communities on mount
  useEffect(() => {
    console.log("🔄 [CommunityListScreen] Initializing...");

    // Note: WebSocket is now managed globally by AuthProvider
    // No need to initialize WebSocket listeners here

    // Load all community data
    const loadData = async () => {
      try {
        await Promise.all([
          communityActions.fetchCommunities(),
          communityActions.fetchJoinedCommunities(),
          communityActions.fetchOwnedCommunities(),
        ]);
      } catch (error) {
        console.error("❌ [CommunityListScreen] Failed to load data:", error);
      }
    };

    loadData();

    return () => {
      console.log("🧹 [CommunityListScreen] Cleaning up...");
    };
  }, []);

  // Handle community selection
  const handleCommunityPress = useCallback((community: Community) => {
    console.log(
      `🎯 [CommunityListScreen] Selected community: ${community.name}`
    );

    // Update store
    communityActions.selectCommunity(community);

    // Navigate to new enhanced community detail screen
    router.push(`/community-new/${community.id}` as any);
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    console.log("🔄 [CommunityListScreen] Pull-to-refresh triggered");

    try {
      switch (activeTab) {
        case "discover":
          await communityActions.fetchCommunities();
          break;
        case "joined":
          await communityActions.fetchJoinedCommunities();
          break;
        case "owned":
          await communityActions.fetchOwnedCommunities();
          break;
      }
    } catch (error) {
      console.error("❌ [CommunityListScreen] Refresh failed:", error);
    }
  }, [activeTab]);

  // Get current communities based on active tab with filtering and sorting
  const getCurrentCommunities = useCallback(() => {
    const rawCommunities = (() => {
      switch (activeTab) {
        case "discover":
          return communities;
        case "joined":
          return joinedCommunities;
        case "owned":
          return ownedCommunities;
        default:
          return [];
      }
    })();

    // Apply search filter
    let filteredCommunities = rawCommunities.filter((community) => {
      const matchesSearch =
        searchQuery === "" ||
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === "all" || community.type === filterType;

      return matchesSearch && matchesType;
    });

    // Apply sorting
    filteredCommunities.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return (b.memberCount || 0) - (a.memberCount || 0);
        case "recent":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filteredCommunities;
  }, [
    activeTab,
    communities,
    joinedCommunities,
    ownedCommunities,
    searchQuery,
    filterType,
    sortBy,
  ]);

  // Get empty message for current tab
  const getEmptyMessage = () => {
    switch (activeTab) {
      case "discover":
        return "No communities found. Be the first to create one!";
      case "joined":
        return "You haven't joined any communities yet.";
      case "owned":
        return "You don't own any communities yet.";
      default:
        return "No communities found.";
    }
  };

  // Render community item
  const renderCommunityItem = useCallback(
    ({ item }: { item: Community }) => (
      <CommunityCard
        community={item}
        onPress={() => handleCommunityPress(item)}
        variant="default"
      />
    ),
    [handleCommunityPress]
  );

  // Loading state
  if (
    loading &&
    communities.length === 0 &&
    joinedCommunities.length === 0 &&
    ownedCommunities.length === 0
  ) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">
          Loading communities...
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View className="px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            My Communities
          </Text>

          {fromCache && (
            <View className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
              <Text className="text-green-600 dark:text-green-400 text-xs font-medium">
                Cached
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}

      {/* Tabs Section */}
      <Box className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Box className="px-4 py-3">
          <CommunityTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            discoverCount={communities.length}
            joinedCount={joinedCommunities.length}
            ownedCount={ownedCommunities.length}
          />
        </Box>
      </Box>

      {/* Professional Search & Filter Interface */}
      <Box className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <VStack className="px-4 py-4 space-y-4">
          {/* Search Bar */}
          <HStack className="items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3">
            <MaterialIcons name="search" size={20} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search communities..."
              placeholderTextColor="#6B7280"
              className="flex-1 ml-3 text-gray-900 dark:text-gray-100 text-base"
              style={{ fontSize: 16 }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} className="ml-2">
                <MaterialIcons name="clear" size={20} color="#6B7280" />
              </Pressable>
            )}
          </HStack>

          {/* Filter Pills */}
          <HStack className="flex-wrap gap-2">
            {(["all", "public", "private", "secret"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setFilterType(type)}
                className={`px-4 py-2 rounded-full border ${
                  filterType === type
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                }`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${
                    filterType === type
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </HStack>

          {/* Sort Options */}
          <HStack className="items-center gap-3">
            <HStack className="items-center gap-1">
              <MaterialIcons name="sort" size={16} color="#6B7280" />
              <Text className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Sort by:
              </Text>
            </HStack>
            <HStack className="flex-wrap gap-2">
              {(["popular", "recent", "name"] as const).map((sort) => (
                <Pressable
                  key={sort}
                  onPress={() => setSortBy(sort)}
                  className={`px-3 py-1.5 rounded-full ${
                    sortBy === sort
                      ? "bg-gray-200 dark:bg-gray-600"
                      : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      sortBy === sort
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {sort === "popular"
                      ? "🔥 Popular"
                      : sort === "recent"
                      ? "🕒 Recent"
                      : "📝 A-Z"}
                  </Text>
                </Pressable>
              ))}
            </HStack>
          </HStack>
        </VStack>
      </Box>

      {/* Content */}
      <View className="flex-1">
        {error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-6xl mb-4">⚠️</Text>
            <Text className="text-lg text-red-500 font-semibold mt-4 text-center">
              Something went wrong
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              {error}
            </Text>
            <Pressable
              onPress={handleRefresh}
              className="mt-6 bg-blue-500 px-6 py-3 rounded-xl active:scale-95"
            >
              <Text className="text-white font-semibold">Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={getCurrentCommunities()}
            renderItem={renderCommunityItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={handleRefresh}
                colors={["#3B82F6"]}
                tintColor="#3B82F6"
              />
            }
            contentContainerStyle={{
              paddingTop: 16,
              paddingBottom: 32,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-6 py-20">
                <Text className="text-6xl mb-6">🏛️</Text>
                <Text className="text-xl text-gray-600 dark:text-gray-400 font-semibold text-center mb-2">
                  {getEmptyMessage()}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-500 text-center">
                  {activeTab === 'discover' ? 'Explore new communities or create your own' :
                   activeTab === 'joined' ? 'Join communities to see them here' :
                   'Create your first community to get started'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

export default CommunityListScreen;
