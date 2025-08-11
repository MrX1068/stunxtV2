import React, { useCallback } from "react";
import { Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Box, Button, ButtonText, HStack, Text, VStack } from "@/components/ui";

/**
 * ✅ OPTIMIZED COMMUNITY TABS - GLUESTACK UI STYLE
 *
 * Features:
 * - Clean, minimal tab design following Gluestack UI principles
 * - Professional appearance without visual clutter
 * - Removed statistics cards (as requested)
 * - Industry-standard tab navigation
 */

export type CommunityTabType = "discover" | "joined" | "owned";

interface CommunityTabsProps {
  activeTab: CommunityTabType;
  onTabChange: (tab: CommunityTabType) => void;
  discoverCount: number;
  joinedCount: number;
  ownedCount: number;
}

const CommunityTabs: React.FC<CommunityTabsProps> = ({
  activeTab,
  onTabChange,
  discoverCount,
  joinedCount,
  ownedCount,
}) => {
  const tabs = [
    {
      id: "discover" as const,
      label: "Discover",
      icon: "explore" as const,
      count: discoverCount,
    },
    {
      id: "joined" as const,
      label: "Joined",
      icon: "group" as const,
      count: joinedCount,
    },
    {
      id: "owned" as const,
      label: "Owned",
      icon: "star" as const,
      count: ownedCount,
    },
  ];

  const handleTabPress = useCallback(
    (tabId: CommunityTabType) => {
      onTabChange(tabId);
    },
    [onTabChange]
  );

  return (
    <>
      {/* Tab Navigation */}

      <HStack space="sm">
        {tabs.map((tab, index) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "solid" : "outline"}
            size="md"
            onPress={() => handleTabPress(tab.id as any)}
            className={`${
              activeTab === tab.id
                ? "bg-primary-600 border-primary-600 shadow-lg"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
            }`}
          >
            <HStack space="sm" className="items-center">
              <MaterialIcons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.id ? "#3B82F6" : "#6B7280"}
              />
              <VStack className="items-start">
                <ButtonText
                  size="sm"
                  className={`font-semibold ${
                    activeTab === tab.id
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {tab.label}
                </ButtonText>
                <Text
                  size="xs"
                  className={`${
                    activeTab === tab.id
                      ? "text-white/80"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {tab.count}
                </Text>
              </VStack>
            </HStack>
          </Button>
        ))}
      </HStack>
    </>
  );
};

export default CommunityTabs;
