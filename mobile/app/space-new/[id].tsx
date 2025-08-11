import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import ChatScreen from "../../components/screens/ChatScreen";
import PostScreen from "../../components/screens/PostScreen";
import { SpaceHeader } from "../../components/headers/SpaceHeader";

/**
 * ✅ DYNAMIC SPACE ROUTE
 *
 * Route: /space-new/[id]
 * Purpose: Dynamically display ChatScreen or PostScreen based on space interaction type
 *
 * Features:
 * - Automatically detects space interaction type
 * - Shows ChatScreen for 'chat' spaces
 * - Shows PostScreen for 'post', 'forum', 'feed' spaces
 * - Fallback to ChatScreen for unknown types
 * - Professional loading states
 */

export default function DynamicSpaceRoute() {
  const {
    id,
    name,
    interactionType,
    description,
    memberCount,
    isJoined,
    communityId,
    communityName,
    ownerId,
    memberRole,
    type,
  } = useLocalSearchParams<{
    id: string;
    name: string;
    interactionType: string;
    description: string;
    memberCount: string;
    isJoined: string;
    communityId: string;
    communityName: string;
    ownerId: string;
    memberRole: "member" | "moderator" | "admin" | "owner";
    type: "public" | "private" | "secret";
  }>();

  // No API calls needed! We have all data from URL params
  const space = {
    id,
    name: name || "Space",
    interactionType: interactionType || "chat",
    description: description || "",
    memberCount: parseInt(memberCount || "0"),
    isJoined: isJoined === "true",
    communityId: communityId || "",
    communityName: communityName || "Community",
    ownerId,
    memberRole,
    type,
  };

  // Simple validation
  if (!id) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center p-6">
        <Text className="text-xl font-bold text-red-500 text-center">
          Invalid Space
        </Text>
      </View>
    );
  }

  // Determine which component to render based on interaction type
  const renderSpaceComponent = () => {
    switch (space.interactionType) {
      case "chat":
        return <ChatScreen spaceData={space} hideHeader={true} />;

      case "post":
      case "forum":
      case "feed":
        return <PostScreen spaceData={space} hideHeader={true} />;

      default:
        // Fallback to chat for unknown types
        console.warn(
          `Unknown space interaction type: ${space.interactionType}, falling back to chat`
        );
        return <ChatScreen spaceData={space} hideHeader={true} />;
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* ✅ CENTRALIZED SPACE HEADER - Handles space info navigation */}
      <SpaceHeader space={space} />

      {/* Space Content */}
      {renderSpaceComponent()}
    </View>
  );
}
