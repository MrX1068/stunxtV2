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

export default function CommunitiesScreen() {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch communities from API
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
              Communities
            </Heading>
            <Text className="text-typography-600">
              My communities & browse new ones
            </Text>
          </VStack>
          <Button size="sm">
            <ButtonText className="font-semibold">Create</ButtonText>
          </Button>
        </HStack>
      </Box>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <VStack className="p-6 gap-6">
          {/* My Communities */}
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <Heading size="lg" className="font-bold text-typography-900">
                My Communities
              </Heading>
              <Text className="text-primary font-semibold">View All</Text>
            </HStack>
            
            <HStack className="gap-4">
              {[
                { name: "Tech Hub", spaces: "8 spaces", icon: "💻", color: "primary", role: "Owner" },
                { name: "Design Studio", spaces: "5 spaces", icon: "🎨", color: "secondary", role: "Member" },
                { name: "Startup Founders", spaces: "12 spaces", icon: "🚀", color: "success", role: "Admin" },
              ].map((community, index) => (
                <Box key={index} className="flex-1 bg-card rounded-xl p-4 border border-border-200 shadow-sm">
                  <VStack className="gap-3">
                    <Box className={`w-12 h-12 bg-${community.color} rounded-lg items-center justify-center self-center`}>
                      <Text className="text-2xl">{community.icon}</Text>
                    </Box>
                    <VStack className="gap-1">
                      <Text className="font-bold text-typography-900 text-center text-sm">
                        {community.name}
                      </Text>
                      <Text className="text-typography-600 text-xs text-center">
                        {community.spaces}
                      </Text>
                      <Text className={`text-xs text-center font-semibold ${
                        community.role === 'Owner' ? 'text-primary' : 
                        community.role === 'Admin' ? 'text-secondary' : 'text-typography-500'
                      }`}>
                        {community.role}
                      </Text>
                    </VStack>
                  </VStack>
                </Box>
              ))}
            </HStack>
          </VStack>

          {/* Quick Access Spaces */}
          <VStack className="gap-4">
            <Heading size="lg" className="font-bold text-typography-900">
              Quick Access Spaces
            </Heading>
            
            <VStack className="gap-3">
              {[
                { name: "General Discussion", community: "Tech Hub", unread: 3, icon: "💬", activity: "2m ago" },
                { name: "Design Reviews", community: "Design Studio", unread: 0, icon: "🎨", activity: "1h ago" },
                { name: "Funding Updates", community: "Startup Founders", unread: 5, icon: "💰", activity: "30m ago" },
              ].map((space, index) => (
                <Box key={index} className="bg-card rounded-xl p-4 border border-border-200">
                  <HStack className="justify-between items-center">
                    <HStack className="gap-3 items-center flex-1">
                      <Text className="text-xl">{space.icon}</Text>
                      <VStack className="flex-1">
                        <Text className="font-semibold text-typography-900">{space.name}</Text>
                        <Text className="text-typography-600 text-sm">{space.community} • {space.activity}</Text>
                      </VStack>
                    </HStack>
                    {space.unread > 0 && (
                      <Box className="bg-primary rounded-full w-6 h-6 items-center justify-center">
                        <Text className="text-white text-xs font-bold">
                          {space.unread > 9 ? '9+' : space.unread}
                        </Text>
                      </Box>
                    )}
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>

          {/* Featured Communities */}
          <VStack className="gap-4">
            <Heading size="lg" className="font-bold text-typography-900">
              Featured Communities
            </Heading>
            
            {/* Community Card */}
            <Box className="bg-card rounded-2xl p-6 border border-border-200 shadow-sm">
              <VStack className="gap-4">
                <HStack className="gap-4 items-center">
                  <Box className="w-16 h-16 bg-primary rounded-xl items-center justify-center">
                    <Text className="text-2xl">🚀</Text>
                  </Box>
                  <VStack className="flex-1">
                    <Heading size="lg" className="font-bold text-typography-900">
                      Startup Hub
                    </Heading>
                    <Text className="text-typography-600">
                      Connect with entrepreneurs and innovators
                    </Text>
                    <Text className="text-sm text-typography-500">
                      2.5k members • Active community
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack className="gap-3">
                  <Button variant="outline" className="flex-1">
                    <ButtonText>View</ButtonText>
                  </Button>
                  <Button className="flex-1">
                    <ButtonText>Join</ButtonText>
                  </Button>
                </HStack>
              </VStack>
            </Box>

            {/* More Community Cards */}
            <Box className="bg-card rounded-2xl p-6 border border-border-200 shadow-sm">
              <VStack className="gap-4">
                <HStack className="gap-4 items-center">
                  <Box className="w-16 h-16 bg-secondary rounded-xl items-center justify-center">
                    <Text className="text-2xl">💻</Text>
                  </Box>
                  <VStack className="flex-1">
                    <Heading size="lg" className="font-bold text-typography-900">
                      Tech Developers
                    </Heading>
                    <Text className="text-typography-600">
                      Share code, discuss tech trends, and collaborate
                    </Text>
                    <Text className="text-sm text-typography-500">
                      5.2k members • Very active
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack className="gap-3">
                  <Button variant="outline" className="flex-1">
                    <ButtonText>View</ButtonText>
                  </Button>
                  <Button className="flex-1">
                    <ButtonText>Join</ButtonText>
                  </Button>
                </HStack>
              </VStack>
            </Box>

            <Box className="bg-card rounded-2xl p-6 border border-border-200 shadow-sm">
              <VStack className="gap-4">
                <HStack className="gap-4 items-center">
                  <Box className="w-16 h-16 bg-success rounded-xl items-center justify-center">
                    <Text className="text-2xl">🎨</Text>
                  </Box>
                  <VStack className="flex-1">
                    <Heading size="lg" className="font-bold text-typography-900">
                      Design Studio
                    </Heading>
                    <Text className="text-typography-600">
                      Creative professionals sharing inspiration
                    </Text>
                    <Text className="text-sm text-typography-500">
                      1.8k members • Moderate activity
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack className="gap-3">
                  <Button variant="outline" className="flex-1">
                    <ButtonText>View</ButtonText>
                  </Button>
                  <Button className="flex-1">
                    <ButtonText>Join</ButtonText>
                  </Button>
                </HStack>
              </VStack>
            </Box>
          </VStack>

          {/* Categories */}
          <VStack className="gap-4">
            <Heading size="lg" className="font-bold text-typography-900">
              Browse by Category
            </Heading>
            
            <HStack className="gap-3 flex-wrap">
              {['Technology', 'Business', 'Art & Design', 'Gaming', 'Health', 'Education'].map((category) => (
                <Button key={category} variant="outline" size="sm" className="mb-3">
                  <ButtonText>{category}</ButtonText>
                </Button>
              ))}
            </HStack>
          </VStack>

          {/* Create Community CTA */}
          <Box className="bg-primary-50 border border-primary-200 rounded-2xl p-6 mt-4">
            <VStack className="items-center gap-4 text-center">
              <Text className="text-2xl">🌟</Text>
              <VStack className="gap-2">
                <Heading size="lg" className="font-bold text-primary">
                  Start Your Own Community
                </Heading>
                <Text className="text-primary-700 text-center">
                  Have a passion or expertise you'd like to share? Create a community and bring people together.
                </Text>
              </VStack>
              <Button className="bg-primary">
                <ButtonText className="font-semibold">Create Community</ButtonText>
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </View>
  );
}
