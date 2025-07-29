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
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileScreen() {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch user data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <Box className="bg-background border-b border-border-200 pt-12 pb-4 px-6">
        <HStack className="justify-between items-center">
          <VStack>
            <Heading size="2xl" className="font-bold text-typography-900">
              Profile
            </Heading>
            <Text className="text-typography-600">
              Manage your account and preferences
            </Text>
          </VStack>
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
          {/* Profile Header */}
          <Box className="bg-gradient-to-r from-primary to-secondary p-6">
            <VStack className="items-center gap-4">
              <Box className="w-24 h-24 bg-white rounded-full items-center justify-center shadow-lg">
                <Text className="text-4xl">👤</Text>
              </Box>
              
              <VStack className="items-center gap-2">
                <Heading size="xl" className="font-bold text-white">
                  {user?.fullName || "John Doe"}
                </Heading>
                <Text className="text-white opacity-90">
                  @{user?.username || "johndoe"}
                </Text>
                <Text className="text-white opacity-80 text-center">
                  {user?.email || "john.doe@example.com"}
                </Text>
              </VStack>
              
              <HStack className="gap-6 mt-2">
                <VStack className="items-center">
                  <Text className="text-white font-bold text-lg">12</Text>
                  <Text className="text-white opacity-80 text-sm">Communities</Text>
                </VStack>
                <VStack className="items-center">
                  <Text className="text-white font-bold text-lg">48</Text>
                  <Text className="text-white opacity-80 text-sm">Spaces</Text>
                </VStack>
                <VStack className="items-center">
                  <Text className="text-white font-bold text-lg">1.2k</Text>
                  <Text className="text-white opacity-80 text-sm">Connections</Text>
                </VStack>
              </HStack>
            </VStack>
          </Box>

          {/* Menu Items */}
          <VStack className="px-6 gap-4">
            {/* Account Settings */}
            <VStack className="gap-3">
              <Heading size="lg" className="font-bold text-typography-900">
                Account
              </Heading>
              
              {[
                { icon: "⚙️", title: "Settings", subtitle: "Preferences and notifications" },
                { icon: "🔒", title: "Privacy & Security", subtitle: "Manage your privacy settings" },
                { icon: "📊", title: "Activity", subtitle: "View your activity history" },
                { icon: "🔔", title: "Notifications", subtitle: "Configure notification preferences" },
              ].map((item) => (
                <Box key={item.title} className="bg-card rounded-xl p-4 border border-border-200">
                  <HStack className="items-center gap-4">
                    <Text className="text-2xl">{item.icon}</Text>
                    <VStack className="flex-1">
                      <Text className="font-semibold text-typography-900">{item.title}</Text>
                      <Text className="text-typography-600 text-sm">{item.subtitle}</Text>
                    </VStack>
                    <Text className="text-typography-400">›</Text>
                  </HStack>
                </Box>
              ))}
            </VStack>

            {/* Help & Support */}
            <VStack className="gap-3">
              <Heading size="lg" className="font-bold text-typography-900">
                Help & Support
              </Heading>
              
              {[
                { icon: "❓", title: "Help Center", subtitle: "Get answers to common questions" },
                { icon: "💬", title: "Contact Support", subtitle: "Reach out to our support team" },
                { icon: "📝", title: "Send Feedback", subtitle: "Help us improve the app" },
                { icon: "⭐", title: "Rate App", subtitle: "Share your experience" },
              ].map((item) => (
                <Box key={item.title} className="bg-card rounded-xl p-4 border border-border-200">
                  <HStack className="items-center gap-4">
                    <Text className="text-2xl">{item.icon}</Text>
                    <VStack className="flex-1">
                      <Text className="font-semibold text-typography-900">{item.title}</Text>
                      <Text className="text-typography-600 text-sm">{item.subtitle}</Text>
                    </VStack>
                    <Text className="text-typography-400">›</Text>
                  </HStack>
                </Box>
              ))}
            </VStack>

            {/* About */}
            <VStack className="gap-3">
              <Heading size="lg" className="font-bold text-typography-900">
                About
              </Heading>
              
              {[
                { icon: "📄", title: "Terms of Service", subtitle: "Read our terms and conditions" },
                { icon: "🔐", title: "Privacy Policy", subtitle: "Learn how we protect your data" },
                { icon: "ℹ️", title: "About StunxtV2", subtitle: "Version 1.0.0" },
              ].map((item) => (
                <Box key={item.title} className="bg-card rounded-xl p-4 border border-border-200">
                  <HStack className="items-center gap-4">
                    <Text className="text-2xl">{item.icon}</Text>
                    <VStack className="flex-1">
                      <Text className="font-semibold text-typography-900">{item.title}</Text>
                      <Text className="text-typography-600 text-sm">{item.subtitle}</Text>
                    </VStack>
                    <Text className="text-typography-400">›</Text>
                  </HStack>
                </Box>
              ))}
            </VStack>

            {/* Logout */}
            <Box className="mt-4 mb-8">
              <Button 
                variant="outline" 
                className="w-full border-error-300"
                onPress={handleLogout}
              >
                <ButtonText className="text-error-600 font-semibold">
                  Sign Out
                </ButtonText>
              </Button>
            </Box>
          </VStack>
        </VStack>
      </ScrollView>
    </View>
  );
}
