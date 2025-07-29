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
  Input,
  InputField,
  InputSlot,
  InputIcon,
} from "@/components/ui";
import { useTheme } from "@/providers/ThemeProvider";

export default function ExploreScreen() {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch explore data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header with Search */}
      <Box className="bg-background border-b border-border-200 pt-12 pb-4 px-6">
        <VStack className="gap-4">
          <HStack className="justify-between items-center">
            <VStack>
              <Heading size="2xl" className="font-bold text-typography-900">
                Explore
              </Heading>
              <Text className="text-typography-600">
                Discover communities and trending content
              </Text>
            </VStack>
          </HStack>
          
          {/* Search Bar */}
          <Input variant="outline" size="lg" className="bg-background">
            <InputField
              placeholder="Search communities, people, topics..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <InputSlot className="pr-3">
              <InputIcon>
                <Text className="text-typography-500">🔍</Text>
              </InputIcon>
            </InputSlot>
          </Input>
        </VStack>
      </Box>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <VStack className="p-6 gap-6">
          {/* Trending Now */}
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <Heading size="lg" className="font-bold text-typography-900">
                🔥 Trending Now
              </Heading>
              <Text className="text-primary font-semibold">See All</Text>
            </HStack>
            
            <VStack className="gap-3">
              {[
                { topic: "React Native 0.75", posts: "234 posts", trend: "↗️ +45%" },
                { topic: "AI Art Generation", posts: "189 posts", trend: "↗️ +67%" },
                { topic: "Remote Work Tips", posts: "156 posts", trend: "↗️ +23%" },
                { topic: "Web3 Development", posts: "142 posts", trend: "↗️ +89%" },
              ].map((item, index) => (
                <Box key={index} className="bg-card rounded-xl p-4 border border-border-200">
                  <HStack className="justify-between items-center">
                    <VStack className="flex-1">
                      <Text className="font-bold text-typography-900">#{item.topic}</Text>
                      <Text className="text-typography-600 text-sm">{item.posts}</Text>
                    </VStack>
                    <Text className="text-success font-semibold text-sm">{item.trend}</Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>

          {/* Featured Communities */}
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <Heading size="lg" className="font-bold text-typography-900">
                ⭐ Featured Communities
              </Heading>
              <Text className="text-primary font-semibold">See All</Text>
            </HStack>
            
            <VStack className="gap-4">
              {[
                {
                  name: "Future of AI",
                  description: "Discussing the latest in artificial intelligence and machine learning",
                  members: "12.5k",
                  activity: "Very Active",
                  icon: "🤖",
                  color: "primary"
                },
                {
                  name: "Indie Game Devs",
                  description: "Independent game developers sharing experiences and resources",
                  members: "8.2k",
                  activity: "Active",
                  icon: "🎮",
                  color: "secondary"
                },
                {
                  name: "Digital Nomads",
                  description: "Remote workers and travelers sharing tips and experiences",
                  members: "15.1k",
                  activity: "Very Active",
                  icon: "🌎",
                  color: "success"
                }
              ].map((community, index) => (
                <Box key={index} className="bg-card rounded-2xl p-6 border border-border-200 shadow-sm">
                  <VStack className="gap-4">
                    <HStack className="gap-4 items-center">
                      <Box className={`w-16 h-16 bg-${community.color} rounded-xl items-center justify-center`}>
                        <Text className="text-2xl">{community.icon}</Text>
                      </Box>
                      <VStack className="flex-1">
                        <Heading size="lg" className="font-bold text-typography-900">
                          {community.name}
                        </Heading>
                        <Text className="text-typography-600">
                          {community.description}
                        </Text>
                        <HStack className="gap-4 mt-1">
                          <Text className="text-sm text-typography-500">
                            {community.members} members
                          </Text>
                          <Text className="text-sm text-success">
                            • {community.activity}
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>
                    
                    <HStack className="gap-3">
                      <Button variant="outline" className="flex-1">
                        <ButtonText>Preview</ButtonText>
                      </Button>
                      <Button className="flex-1">
                        <ButtonText>Join Community</ButtonText>
                      </Button>
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </VStack>

          {/* Popular Spaces */}
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <Heading size="lg" className="font-bold text-typography-900">
                🚀 Popular Spaces
              </Heading>
              <Text className="text-primary font-semibold">See All</Text>
            </HStack>
            
            <HStack className="gap-4">
              {[
                { name: "Code Reviews", community: "Tech Hub", members: "2.1k", icon: "💻" },
                { name: "Design Critique", community: "Design Studio", members: "1.8k", icon: "🎨" },
                { name: "Startup Advice", community: "Entrepreneurs", members: "3.2k", icon: "💡" },
              ].map((space, index) => (
                <Box key={index} className="flex-1 bg-card rounded-xl p-4 border border-border-200">
                  <VStack className="gap-3">
                    <Text className="text-2xl text-center">{space.icon}</Text>
                    <VStack className="gap-1">
                      <Text className="font-bold text-typography-900 text-center text-sm">
                        {space.name}
                      </Text>
                      <Text className="text-typography-600 text-xs text-center">
                        {space.community}
                      </Text>
                      <Text className="text-typography-500 text-xs text-center">
                        {space.members} members
                      </Text>
                    </VStack>
                    <Button size="sm" variant="outline" className="w-full">
                      <ButtonText className="text-xs">Join Space</ButtonText>
                    </Button>
                  </VStack>
                </Box>
              ))}
            </HStack>
          </VStack>

          {/* Category Browse */}
          <VStack className="gap-4">
            <Heading size="lg" className="font-bold text-typography-900">
              Browse by Category
            </Heading>
            
            <VStack className="gap-3">
              {[
                { category: "Technology", count: "245 communities", icon: "💻", color: "primary" },
                { category: "Business & Entrepreneurship", count: "189 communities", icon: "💼", color: "secondary" },
                { category: "Arts & Design", count: "156 communities", icon: "🎨", color: "success" },
                { category: "Gaming", count: "298 communities", icon: "🎮", color: "warning" },
                { category: "Health & Fitness", count: "124 communities", icon: "💪", color: "info" },
                { category: "Education", count: "167 communities", icon: "📚", color: "error" },
              ].map((item, index) => (
                <Box key={index} className="bg-card rounded-xl p-4 border border-border-200">
                  <HStack className="justify-between items-center">
                    <HStack className="gap-4 items-center">
                      <Text className="text-2xl">{item.icon}</Text>
                      <VStack>
                        <Text className="font-bold text-typography-900">{item.category}</Text>
                        <Text className="text-typography-600 text-sm">{item.count}</Text>
                      </VStack>
                    </HStack>
                    <Text className="text-typography-400">›</Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>

          {/* Discover People */}
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <Heading size="lg" className="font-bold text-typography-900">
                👥 People You May Know
              </Heading>
              <Text className="text-primary font-semibold">See All</Text>
            </HStack>
            
            <HStack className="gap-4">
              {[
                { name: "Sarah Chen", role: "UX Designer", mutual: "12 mutual", avatar: "👩‍💻" },
                { name: "Alex Rodriguez", role: "Full Stack Dev", mutual: "8 mutual", avatar: "👨‍💻" },
                { name: "Maria Silva", role: "Product Manager", mutual: "15 mutual", avatar: "👩‍💼" },
              ].map((person, index) => (
                <Box key={index} className="flex-1 bg-card rounded-xl p-4 border border-border-200">
                  <VStack className="items-center gap-3">
                    <Text className="text-3xl">{person.avatar}</Text>
                    <VStack className="items-center gap-1">
                      <Text className="font-bold text-typography-900 text-center text-sm">
                        {person.name}
                      </Text>
                      <Text className="text-typography-600 text-xs text-center">{person.role}</Text>
                      <Text className="text-typography-500 text-xs text-center">{person.mutual}</Text>
                    </VStack>
                    <Button size="sm" className="w-full">
                      <ButtonText className="text-xs">Connect</ButtonText>
                    </Button>
                  </VStack>
                </Box>
              ))}
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </View>
  );
}
