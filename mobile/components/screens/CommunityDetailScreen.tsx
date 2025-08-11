import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Pressable,
  Text,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { HStack, VStack } from "@/components/ui";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import {
  useCommunityStore,
  Community,
  useCommunities,
} from "../../stores/community";
import { useAuth } from "../../stores/auth";
import { useCommunitySpaceStore } from "../../stores/communitySpace";
import { useJoinRequestStore } from "../../stores/joinRequests";
import { CommunitySpaceCard } from "../community/CommunitySpaceCard";
import { JoinRequestBadge } from "../community/JoinRequestBadge";
import { JoinRequestManagement } from "../community/JoinRequestManagement";
import { useSpaces } from "@/stores";
// Removed InfoScreenModal - now using route-based navigation

// Remove duplicate interfaces - using the ones from communitySpaceApi

interface CommunityDetailScreenProps {
  communityId?: string;
}

const CommunityDetailScreen: React.FC<CommunityDetailScreenProps> = ({
  communityId: propCommunityId,
}) => {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = propCommunityId || id;

  // State
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningCommunity, setJoiningCommunity] = useState(false);
  const [joinRequestModalVisible, setJoinRequestModalVisible] = useState(false);
  // Removed showCommunityInfo state - now using route navigation

  // Store selectors
  const { user } = useAuth();

  // Use existing spaces store
  const {
    communitySpaces = {},
    isLoading: spacesLoading,
    fetchSpacesByCommunity,
  } = useSpaces();
  const {
    communities,
    joinedCommunities,
    ownedCommunities,
    joinCommunity,
    fetchCommunities,
    fetchJoinedCommunities,
    fetchOwnedCommunities,
  } = useCommunities();

  // Join request store for secret communities
  const { createJoinRequest } = useJoinRequestStore();

  // Get spaces for this community
  const currentSpaces = communityId ? communitySpaces[communityId] || [] : [];

  // Find community from store
  const findCommunityInStore = useCallback(() => {
    if (!communityId) return null;

    // Check all community arrays
    const allCommunities = [
      ...communities,
      ...joinedCommunities,
      ...ownedCommunities,
    ];

    return allCommunities.find((c) => c.id === communityId) || null;
  }, [communityId, communities, joinedCommunities, ownedCommunities]);

  // Load community spaces
  const loadCommunitySpaces = useCallback(async () => {
    if (!communityId) return;

    try {
      await fetchSpacesByCommunity(communityId);
    } catch (error) {
      console.error("❌ [CommunityDetailScreen] Failed to load spaces:", error);
    }
  }, [communityId, fetchSpacesByCommunity]);

  // ✅ EXTRACTED: Load community data function for reuse
  const loadCommunityData = useCallback(async () => {
    if (!communityId) {
      setError("Community ID is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try to get from store for immediate display
      const storeCommunity = findCommunityInStore();
      if (storeCommunity) {
        setCommunity(storeCommunity);
      }

      // Then fetch fresh data from API to get updated memberRole
      // try {
      //   const { fetchCommunityById } = useCommunityStore.getState();
      //   const freshCommunity = await fetchCommunityById(communityId, true); // Force refresh
      //   if (freshCommunity) {
      //     setCommunity(freshCommunity);
      //     console.log('✅ [CommunityDetailScreen] Updated community with fresh data:', freshCommunity.memberRole);
      //   }
      // } catch (apiError) {
      //   console.warn('⚠️ [CommunityDetailScreen] Failed to fetch fresh community data:', apiError);
      //   // Continue with store data if API fails
      // }

      // Load spaces for this community
      await loadCommunitySpaces();
    } catch (error) {
      console.error(
        "❌ [CommunityDetailScreen] Failed to load community:",
        error
      );
      setError("Failed to load community details");
    } finally {
      setLoading(false);
    }
  }, [communityId, findCommunityInStore, loadCommunitySpaces]);

  // Load community data on mount
  useEffect(() => {
    loadCommunityData();
  }, [loadCommunityData]);

  // Check if user can access community content
  const canAccessCommunity = useCallback(() => {
    if (!community) return false;

    // Owner can always access
    if (community.ownerId === user?.id || community.isOwner) return true;

    // ✅ FIXED: All community types require membership to access spaces
    // Member can access (applies to public, private, and secret)
    if (community.isJoined) return true;

    // Public communities can be viewed by anyone
    // if (community.type === "public") return true;

    // Private/Secret communities require membership

    // ✅ FIXED: Even public communities require membership for space access
    // No one can access spaces without being a member
    return false;
  }, [community, user]);

  // Check if user should see join button
  const shouldShowJoinButton = useCallback(() => {
    if (!community || !user) return false;

    // Don't show for owners
    if (community.ownerId === user.id || community.isOwner) return false;

    // Don't show for existing members
    if (community.isJoined) return false;

    // Show for public communities (direct join)
    if (community.type === "public") return true;

    // Don't show for private communities (invite-only)
    if (community.type === "private") return false;

    // Show for secret communities (join request)
    if (community.type === "secret") return true;

    return false;
  }, [community, user]);

  console.log(
    "community =>",
    community,
    "++++++++++++++++",
    community?.isJoined,
    "shpuld join btn",
    shouldShowJoinButton
  );

  // Get join button configuration
  const getJoinButtonConfig = useCallback(() => {
    if (!community || !shouldShowJoinButton()) {
      return { show: false, text: "", color: "", description: "" };
    }

    switch (community.type) {
      case "public":
        return {
          show: true,
          text: "🌍 Join Community",
          color: "bg-emerald-500",
          description: "Join this public community instantly",
        };
      case "secret":
        return {
          show: true,
          text: "📝 Request to Join",
          color: "bg-purple-500",
          description: "Send a join request to community admins",
        };
      default:
        return { show: false, text: "", color: "", description: "" };
    }
  }, [community, shouldShowJoinButton]);

  // Handle community join with comprehensive access control
  const handleJoinCommunity = useCallback(async () => {
    if (!community || !user || !communityId) return;

    const joinConfig = getJoinButtonConfig();
    if (!joinConfig.show) return;

    try {
      setJoiningCommunity(true);

      if (community.type === "public") {
        // Direct join for public communities
        await joinCommunity(communityId);

        // ✅ OPTIMIZED: Store already updates state, sync local component state
        const updatedCommunity = findCommunityInStore();
        console.log(
          "🔍 [CommunityDetailScreen] Updated community from store:",
          updatedCommunity?.isJoined
        );

        if (updatedCommunity) {
          setCommunity(updatedCommunity);
          console.log(
            "✅ [CommunityDetailScreen] Local state updated from store"
          );
        } else {
          // Fallback: If store update didn't work, update local state manually
          setCommunity((prev) =>
            prev
              ? {
                  ...prev,
                  isJoined: true,
                  memberCount: (prev.memberCount || 0) + 1,
                }
              : prev
          );
          console.log(
            "⚠️ [CommunityDetailScreen] Used fallback local state update"
          );
        }

        // ✅ CRITICAL: Refresh space data to update access permissions
        try {
          await fetchSpacesByCommunity(communityId);
          console.log(
            "✅ [CommunityDetailScreen] Space data refreshed after community join"
          );
        } catch (error) {
          console.error(
            "❌ [CommunityDetailScreen] Failed to refresh space data:",
            error
          );
        }

        Alert.alert(
          "Welcome!",
          `You've successfully joined ${community.name}. Start exploring the spaces!`,
          [{ text: "Explore Spaces" }]
        );

        // ✅ FALLBACK REFRESH: Ensure UI consistency across all screens
        try {
          // Small delay to allow optimistic updates to settle

          await Promise.all([
            fetchCommunities(),
            fetchJoinedCommunities(),
            fetchOwnedCommunities(),
          ]);
        } catch (error) {
          console.error(
            "❌ [CommunityDetailScreen] Fallback refresh failed:",
            error
          );
        }

        console.log("✅ [CommunityDetailScreen] Community join completed");
      } else if (community.type === "secret") {
        // Create join request for secret communities
        await createJoinRequest(
          communityId,
          `I would like to join ${community.name}`
        );
        Alert.alert(
          "Request Sent",
          "Your join request has been sent to community admins. You'll be notified when it's reviewed.",
          [{ text: "OK" }]
        );
      }
      // Note: Private communities don't show join button (invite-only)
    } catch (error) {
      console.error("❌ [CommunityDetailScreen] Join failed:", error);
      Alert.alert(
        "Join Failed",
        "Unable to join the community right now. Please try again.",
        [{ text: "Try Again" }]
      );
    } finally {
      setJoiningCommunity(false);
    }
  }, [community, user, communityId, joinCommunity, createJoinRequest]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Handle space press - Clean Expo Router syntax
  const handleSpacePress = useCallback(
    (space: any) => {
      console.log("before push to spcae", space);
      router.push({
        pathname: "/space-new/[id]",
        params: {
          id: space.id,
          name: space.name || "Space",
          interactionType: space.interactionType || "chat",
          description: space.description || "",
          memberCount: (space.memberCount || 0).toString(),
          isJoined: (space.isJoined || false).toString(),
          communityId: communityId || "", // ✅ CRITICAL: Pass communityId for join functionality
          communityName: community?.name || "Community",
          ownerId: space?.owner?.id || "",
          memberRole: space?.memberRole || "member",
          type: space?.type || "public",
        },
      });
    },
    [communityId, community]
  );

  // Handle create space
  const handleCreateSpace = useCallback(() => {
    if (!communityId) return;
    router.push(`/create-space?communityId=${communityId}`);
  }, [communityId]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await loadCommunitySpaces();
  }, [loadCommunitySpaces]);

  // Note: Space join functionality moved to individual space detail screens

  // Check if user can create spaces
  const canCreateSpaces = useCallback(() => {
    if (!community || !user) return false;

    // Owner can always create
    if (community.ownerId === user.id || community.isOwner) return true;

    // Check if user is admin or moderator
    return (
      community.memberRole === "admin" || community.memberRole === "moderator"
    );
  }, [community, user]);

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">
          Loading community...
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !community) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <Text className="text-6xl mb-4">⚠️</Text>
        <Text className="text-lg text-red-500 font-semibold text-center">
          {error || "Community not found"}
        </Text>
        <Pressable
          onPress={handleBack}
          className="mt-6 bg-blue-500 px-6 py-3 rounded-xl active:scale-95"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Determine access and UI state
  const hasAccess = canAccessCommunity();
  const showJoinButton = shouldShowJoinButton();
  const joinButtonConfig = getJoinButtonConfig();

  return (
    <View
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      style={{ paddingTop: insets.top }}
    >
      {/* ✅ PROFESSIONAL HEADER - Clean and organized */}
      <View className="px-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Top Navigation Row */}
        <HStack className="items-center justify-between mb-4">
          <Pressable
            onPress={handleBack}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 active:scale-95"
          >
            <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
          </Pressable>

          <HStack className="items-center space-x-3">
            {/* Join Request Badge for Admins (Secret Communities) */}
            {community.type === "secret" && canCreateSpaces() && (
              <JoinRequestBadge
                communityId={communityId!}
                onPress={() => setJoinRequestModalVisible(true)}
              />
            )}

            {/* Create Space button for authorized users */}
            {hasAccess && canCreateSpaces() && (
              <Pressable
                onPress={handleCreateSpace}
                className="px-4 py-2 bg-blue-500 rounded-xl active:scale-95"
              >
                <Text className="text-white font-semibold">Create Space</Text>
              </Pressable>
            )}
          </HStack>
        </HStack>

        {/* ✅ CLICKABLE COMMUNITY INFO - Tap to navigate to dedicated info screen */}
        <Pressable
          onPress={() => router.push(`/community-info/${community.id}` as any)}
          className="active:scale-[0.98] active:opacity-80"
        >
          <VStack className="space-y-3">
            <HStack className="items-center justify-between">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {community.name}
              </Text>

              {/* Info Icon Hint */}
              <MaterialIcons name="info-outline" size={20} color="#6B7280" />
            </HStack>

            <Text className="text-gray-600 dark:text-gray-400">
              {community.description}
            </Text>

            <HStack className="items-center space-x-4">
              <HStack className="items-center space-x-1">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {community.memberCount || 0} members
                </Text>
              </HStack>

              <HStack className="items-center space-x-1">
                <MaterialIcons name="space-dashboard" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {currentSpaces.length} spaces
                </Text>
              </HStack>

              <View
                className={`px-2 py-1 rounded-full ${
                  community.type === "private"
                    ? "bg-orange-100 dark:bg-orange-900"
                    : community.type === "secret"
                    ? "bg-purple-100 dark:bg-purple-900"
                    : "bg-green-100 dark:bg-green-900"
                }`}
              >
                <Text
                  className={`text-xs font-medium capitalize ${
                    community.type === "private"
                      ? "text-orange-700 dark:text-orange-300"
                      : community.type === "secret"
                      ? "text-purple-700 dark:text-purple-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {community.type}
                </Text>
              </View>
            </HStack>

            {/* Tap hint */}
            <Text className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Tap for community info & member management
            </Text>
          </VStack>
        </Pressable>
      </View>

      {/* Content Area */}
      <View className="flex-1 relative">
        {/* Space List Content */}
        <View className="flex-1">
          {spacesLoading && currentSpaces.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-gray-600 dark:text-gray-400 mt-4">
                Loading spaces...
              </Text>
            </View>
          ) : (
            <FlatList
              data={currentSpaces}
              renderItem={({ item }) => (
                <CommunitySpaceCard
                  space={{
                    ...item,
                    tags: [],
                    bannerUrl: undefined,
                    allowMemberInvites: true,
                    lastMessage: undefined,
                    lastActivityAt: item.updatedAt,
                  }}
                  onPress={() => handleSpacePress(item)}
                  canAccess={hasAccess}
                  // New props for access control
                  communityName={community.name}
                  onJoinCommunityPress={handleJoinCommunity}
                  isJoiningCommunity={joiningCommunity}
                />
              )}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={spacesLoading}
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
                    No spaces yet
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-500 text-center">
                    {canCreateSpaces()
                      ? "Create the first space to get discussions started!"
                      : "This community doesn't have any spaces yet."}
                  </Text>
                  {canCreateSpaces() && (
                    <Pressable
                      onPress={handleCreateSpace}
                      className="mt-6 bg-blue-500 px-6 py-3 rounded-xl active:scale-95"
                    >
                      <Text className="text-white font-semibold">
                        Create First Space
                      </Text>
                    </Pressable>
                  )}
                </View>
              }
            />
          )}
        </View>

        {/* ✅ FIXED: Blur overlay that doesn't cover bottom join button */}
        {!hasAccess && (
          <View className="absolute top-0 left-0 right-0 bottom-20 z-10">
            <BlurView
              intensity={15}
              className="flex-1 items-center justify-center"
              tint="light"
            >
              <View className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl mx-8 border border-gray-200/50 dark:border-gray-700/50">
                <View className="items-center">
                  <MaterialIcons
                    name={
                      community.type === "public"
                        ? "public"
                        : community.type === "private"
                        ? "lock"
                        : "lock-outline"
                    }
                    size={48}
                    color="#6B7280"
                  />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mt-3 text-center">
                    {community.type === "public"
                      ? "Join Community"
                      : community.type === "private"
                      ? "Private Community"
                      : "Secret Community"}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                    {community.type === "public"
                      ? "Join to access spaces and participate"
                      : community.type === "private"
                      ? "Membership required to view content"
                      : "Invitation required to access this community"}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-500 mt-3 text-center">
                    👇 Use the join button below
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>
        )}

        {/* Bottom Join Button (Telegram Style) - Enhanced for all community types */}
        {showJoinButton && joinButtonConfig.show && (
          <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-gray-800/95 border-t border-gray-200 dark:border-gray-700">
            <Pressable
              onPress={handleJoinCommunity}
              disabled={joiningCommunity}
              className={`py-4 px-6 rounded-2xl active:scale-95 ${
                joinButtonConfig.color
              } ${joiningCommunity ? "opacity-70" : ""}`}
            >
              <Text className="text-white font-bold text-center text-lg">
                {joiningCommunity ? "⏳ Processing..." : joinButtonConfig.text}
              </Text>
              {joinButtonConfig.description && (
                <Text className="text-white/80 text-center text-sm mt-1">
                  {joinButtonConfig.description}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Join Request Management Modal */}
        <JoinRequestManagement
          communityId={communityId!}
          visible={joinRequestModalVisible}
          onClose={() => setJoinRequestModalVisible(false)}
        />

        {/* ✅ COMMUNITY INFO - Now uses dedicated route /community-info/[id] */}
      </View>
    </View>
  );
};

export default CommunityDetailScreen;
