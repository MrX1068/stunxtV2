import { View, ScrollView, RefreshControl } from "react-native";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
} from "@/components/ui";
import { useTheme } from "@/providers/ThemeProvider";

export default function HomeScreen() {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch feed data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <Box className="bg-background border-b border-border-200 pt-12 pb-4 px-6">
        <HStack className="justify-between items-center">
          <VStack>
            <Heading size="2xl" className="font-bold text-typography-900">
              Good Morning! 👋
            </Heading>
            <Text className="text-typography-600">
              Discover what's happening in your communities
            </Text>
          </VStack>
          <HStack className="gap-3">
            <Box className="w-10 h-10 bg-background border border-border-300 rounded-full items-center justify-center">
              <Text className="text-lg">🔍</Text>
            </Box>
            <Box className="w-10 h-10 bg-background border border-border-300 rounded-full items-center justify-center">
              <Text className="text-lg">🔔</Text>
            </Box>
          </HStack>
        </HStack>
      </Box>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <VStack className="gap-6">
          {/* Quick Actions */}
          <Box className="px-6 pt-6">
            <VStack className="gap-4">
              <Heading size="lg" className="font-bold text-typography-900">
                Quick Actions
              </Heading>
              
              <HStack className="gap-4">
                <Box className="flex-1 bg-primary-50 border border-primary-200 rounded-xl p-4 items-center">
                  <Text className="text-2xl mb-2">📝</Text>
                  <Text className="text-primary font-semibold text-center">
                    Create Post
                  </Text>
                </Box>
                
                <Box className="flex-1 bg-secondary-50 border border-secondary-200 rounded-xl p-4 items-center">
                  <Text className="text-2xl mb-2">🏢</Text>
                  <Text className="text-secondary font-semibold text-center">
                    Join Community
                  </Text>
                </Box>
                
                <Box className="flex-1 bg-success-50 border border-success-200 rounded-xl p-4 items-center">
                  <Text className="text-2xl mb-2">💬</Text>
                  <Text className="text-success font-semibold text-center">
                    Start Chat
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Box>

          {/* Feed Filters */}
          <Box className="px-6">
            <HStack className="gap-3">
              {['All Activity', 'My Communities', 'Following', 'Trending'].map((filter, index) => (
                <Button 
                  key={filter} 
                  variant={index === 0 ? "solid" : "outline"} 
                  size="sm"
                >
                  <ButtonText className={index === 0 ? "text-white" : "text-typography-700"}>
                    {filter}
                  </ButtonText>
                </Button>
              ))}
            </HStack>
          </Box>

          {/* Personalized Feed */}
          <VStack className="gap-4">
            {/* Feed Post */}
            <Box className="bg-card mx-6 rounded-2xl p-6 border border-border-200 shadow-sm">
              <VStack className="gap-4">
                <HStack className="gap-4 items-center">
                  <Box className="w-12 h-12 bg-primary rounded-full items-center justify-center">
                    <Text className="text-white font-bold">DS</Text>
                  </Box>
                  <VStack className="flex-1">
                    <Text className="font-bold text-typography-900">Design Studio</Text>
                    <Text className="text-typography-600 text-sm">2 hours ago • #design</Text>
                  </VStack>
                  <Text className="text-typography-400">⋯</Text>
                </HStack>
                
                <Text className="text-typography-700">
                  Just shared our latest UI design system! 🎨 Would love to get feedback from the community on the new component library we've been working on.
                </Text>
                
                <Box className="bg-background rounded-xl p-4 border border-border-200">
                  <Text className="text-typography-600 text-sm mb-2">📎 Attachment</Text>
                  <Text className="font-semibold text-typography-900">Design-System-v2.figma</Text>
                </Box>
                
                <HStack className="justify-between items-center pt-2">
                  <HStack className="gap-6">
                    <HStack className="gap-2 items-center">
                      <Text className="text-lg">❤️</Text>
                      <Text className="text-typography-600">24</Text>
                    </HStack>
                    <HStack className="gap-2 items-center">
                      <Text className="text-lg">💬</Text>
                      <Text className="text-typography-600">8</Text>
                    </HStack>
                    <HStack className="gap-2 items-center">
                      <Text className="text-lg">🔄</Text>
                      <Text className="text-typography-600">3</Text>
                    </HStack>
                  </HStack>
                  <Text className="text-lg">📤</Text>
                </HStack>
              </VStack>
            </Box>

            {/* Community Activity Post */}
            <Box className="bg-card mx-6 rounded-2xl p-6 border border-border-200 shadow-sm">
              <VStack className="gap-4">
                <HStack className="gap-4 items-center">
                  <Box className="w-12 h-12 bg-secondary rounded-full items-center justify-center">
                    <Text className="text-white font-bold">TH</Text>
                  </Box>
                  <VStack className="flex-1">
                    <Text className="font-bold text-typography-900">Tech Hub</Text>
                    <Text className="text-typography-600 text-sm">5 hours ago • #announcement</Text>
                  </VStack>
                  <Text className="text-typography-400">⋯</Text>
                </HStack>
                
                <Text className="text-typography-700">
                  🚀 Welcome to all our new members! We've just reached 5,000 community members. Thank you for making this such an amazing place to learn and grow together.
                </Text>
                
                <HStack className="justify-between items-center pt-2">
                  <HStack className="gap-6">
                    <HStack className="gap-2 items-center">
                      <Text className="text-lg">❤️</Text>
                      <Text className="text-typography-600">127</Text>
                    </HStack>
                    <HStack className="gap-2 items-center">
                      <Text className="text-lg">💬</Text>
                      <Text className="text-typography-600">45</Text>
                    </HStack>
                    <HStack className="gap-2 items-center">
                      <Text className="text-lg">🔄</Text>
                      <Text className="text-typography-600">12</Text>
                    </HStack>
                  </HStack>
                  <Text className="text-lg">📤</Text>
                </HStack>
              </VStack>
            </Box>
          </VStack>

          {/* Trending Communities */}
          <Box className="px-6">
            <VStack className="gap-4">
              <HStack className="justify-between items-center">
                <Heading size="lg" className="font-bold text-typography-900">
                  Trending Communities
                </Heading>
                <Text className="text-primary font-semibold">See All</Text>
              </HStack>
              
              <HStack className="gap-4">
                {[
                  { name: "AI Researchers", members: "2.1k", icon: "🤖", color: "primary" },
                  { name: "Startup Founders", members: "850", icon: "🚀", color: "secondary" },
                  { name: "Creative Writers", members: "1.5k", icon: "✍️", color: "success" },
                ].map((community) => (
                  <Box key={community.name} className="flex-1 bg-card rounded-xl p-4 border border-border-200">
                    <VStack className="items-center gap-3">
                      <Text className="text-2xl">{community.icon}</Text>
                      <VStack className="items-center gap-1">
                        <Text className="font-bold text-typography-900 text-center text-sm">
                          {community.name}
                        </Text>
                        <Text className="text-typography-600 text-xs">{community.members} members</Text>
                      </VStack>
                      <Button size="sm" className="w-full">
                        <ButtonText className="text-xs">Join</ButtonText>
                      </Button>
                    </VStack>
                  </Box>
                ))}
              </HStack>
            </VStack>
          </Box>

          {/* Recent Activity Summary */}
          <Box className="px-6 pb-6">
            <VStack className="gap-4">
              <Heading size="lg" className="font-bold text-typography-900">
                Your Activity Summary
              </Heading>
              
              <Box className="bg-card rounded-xl p-4 border border-border-200">
                <HStack className="justify-between items-center">
                  <VStack className="items-center">
                    <Text className="text-primary font-bold text-lg">12</Text>
                    <Text className="text-typography-600 text-sm">Communities</Text>
                  </VStack>
                  <VStack className="items-center">
                    <Text className="text-secondary font-bold text-lg">48</Text>
                    <Text className="text-typography-600 text-sm">Messages</Text>
                  </VStack>
                  <VStack className="items-center">
                    <Text className="text-success font-bold text-lg">15</Text>
                    <Text className="text-typography-600 text-sm">Posts</Text>
                  </VStack>
                  <VStack className="items-center">
                    <Text className="text-warning-600 font-bold text-lg">7</Text>
                    <Text className="text-typography-600 text-sm">Days Active</Text>
                  </VStack>
                </HStack>
              </Box>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </View>
  );
}
