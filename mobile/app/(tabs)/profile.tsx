import { View, ScrollView, RefreshControl, Pressable, Alert } from "react-native";
import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
} from "@/components/ui";
import { useTheme } from "@/providers/ThemeContext";
import { useAuth, useProfile } from "@/stores/auth";
import { Avatar } from "@/components/Avatar";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { useOnboardingStatus } from "@/utils/useOnboardingStatus";

interface UserStats {
  posts: number;
  communities: number;
  followers: number;
  following: number;
}

interface UserActivity {
  id: string;
  type: 'post' | 'comment' | 'join' | 'like';
  title: string;
  subtitle: string;
  timeAgo: string;
  icon: string;
}

const userStats: UserStats = {
  posts: 42,
  communities: 8,
  followers: 156,
  following: 89
};

const recentActivity: UserActivity[] = [
  {
    id: "1",
    type: "post",
    title: "Posted in React Developers Hub",
    subtitle: "How to optimize React Native performance",
    timeAgo: "2 hours ago",
    icon: "📝"
  },
  {
    id: "2",
    type: "join",
    title: "Joined AI & Machine Learning",
    subtitle: "Welcome to the community!",
    timeAgo: "1 day ago",
    icon: "👋"
  },
  {
    id: "3",
    type: "like",
    title: "Liked a post in UI/UX Designers",
    subtitle: "Design system best practices",
    timeAgo: "2 days ago",
    icon: "❤️"
  },
  {
    id: "4",
    type: "comment",
    title: "Commented in Startup Founders",
    subtitle: "Great insights on Series A funding!",
    timeAgo: "3 days ago",
    icon: "💬"
  }
];

const menuItems = [
  { id: "1", title: "Edit Profile", subtitle: "Update your personal information", icon: "👤", action: "edit-profile" },
  { id: "2", title: "My Posts", subtitle: "View and manage your posts", icon: "📝", action: "my-posts" },
  { id: "3", title: "Saved Posts", subtitle: "Posts you've saved for later", icon: "🔖", action: "saved-posts" },
  { id: "4", title: "Notifications", subtitle: "Manage notification preferences", icon: "🔔", action: "notifications" },
  { id: "5", title: "Privacy Settings", subtitle: "Control your privacy and security", icon: "🔒", action: "privacy" },
  { id: "6", title: "Help & Support", subtitle: "Get help or contact support", icon: "❓", action: "support" },
  { id: "7", title: "About", subtitle: "App version and information", icon: "ℹ️", action: "about" },
];

export default function ProfileScreen() {
  const { isDark } = useTheme();
  const { user, logout, isLoading, error } = useAuth();
  const { refreshUserData } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const { isComplete: isOnboardingComplete } = useOnboardingStatus();

  // No automatic refresh on mount - handled by AuthProvider smartly

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserData();
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              await logout();
              // Navigate to the main index page after logout
              router.replace("/");
            } catch (error) {
              console.error("Logout error:", error);
              // Still navigate even if logout API fails
              router.replace("/");
            }
          }
        }
      ]
    );
  };

  const handleMenuPress = (action: string) => {
    switch (action) {
      case "edit-profile":
        router.push('/auth/profile-setup?mode=edit&from=profile');
        break;
      case "my-posts":
        console.log("My posts");
        break;
      case "saved-posts":
        console.log("Saved posts");
        break;
      case "notifications":
        console.log("Notifications");
        break;
      case "privacy":
        console.log("Privacy settings");
        break;
      case "support":
        console.log("Help & support");
        break;
      case "about":
        console.log("About");
        break;
      default:
        break;
    }
  };

  const StatCard = ({ label, value }: { label: string; value: number }) => (
    <VStack className="items-center">
      <Text className="text-2xl font-bold text-typography-900">{value}</Text>
      <Text className="text-sm text-typography-600">{label}</Text>
    </VStack>
  );

  const ActivityCard = ({ activity }: { activity: UserActivity }) => (
    <Box className="bg-background-50 border border-border-200 rounded-xl p-4 mb-3">
      <HStack className="gap-3">
        <Text className="text-2xl">{activity.icon}</Text>
        <VStack className="flex-1">
          <Text className="font-semibold text-typography-900">{activity.title}</Text>
          <Text className="text-sm text-typography-600" numberOfLines={2}>
            {activity.subtitle}
          </Text>
          <Text className="text-xs text-typography-500 mt-1">{activity.timeAgo}</Text>
        </VStack>
      </HStack>
    </Box>
  );

  const MenuItem = ({ item }: { item: typeof menuItems[0] }) => (
    <Pressable onPress={() => handleMenuPress(item.action)}>
      <Box className="bg-background-50 border-b border-border-100 p-4">
        <HStack className="items-center gap-3">
          <Text className="text-2xl">{item.icon}</Text>
          <VStack className="flex-1">
            <Text className="font-semibold text-typography-900">{item.title}</Text>
            <Text className="text-sm text-typography-600">{item.subtitle}</Text>
          </VStack>
          <Text className="text-typography-400">→</Text>
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background-0">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <VStack className="gap-6">
          {/* Profile Completion Banner - shows automatically based on completion status */}
          <ProfileCompletionBanner />

          {/* Profile Header */}
          <Box className="bg-gradient-to-br from-primary-500 to-primary-700 p-6 pt-16">
            <VStack className="gap-4 items-center">
              <Avatar 
                src={user?.avatarUrl || null} 
                size={80} 
                fallbackText={user?.fullName || user?.username || "U"}
                style={{ 
                  borderWidth: 4, 
                  borderColor: 'rgba(255,255,255,0.2)' 
                }}
              />
              
              <VStack className="items-center gap-1">
                <Text className="text-xl font-bold text-white">
                  {user?.fullName || "User"}
                </Text>
                <Text className="text-primary-100">
                  @{user?.username || "username"}
                </Text>
                <Text className="text-primary-200 text-center mt-2 max-w-xs">
                  {user?.profile?.bio || "Bio not provided"}
                </Text>
                {user?.profile?.location && (
                  <Text className="text-primary-200 text-center text-sm">
                    📍 {user.profile.location}
                  </Text>
                )}
              </VStack>

              <Button
                variant="outline"
                className="border-white/20 bg-white/10"
                onPress={() => router.push('/auth/profile-setup?mode=edit&from=profile')}
              >
                <ButtonText className="text-white font-medium">Edit Profile</ButtonText>
              </Button>
            </VStack>
          </Box>

          {/* Stats */}
          <Box className="bg-background-50 mx-4 rounded-xl p-6 -mt-8 shadow-sm">
            <HStack className="justify-around">
              <StatCard label="Posts" value={user?.stats?.postCount || user?.userStats?.posts || 0} />
              <StatCard label="Communities" value={user?.stats?.communityCount || user?.userStats?.communities || 0} />
              <StatCard label="Followers" value={user?.stats?.followerCount || user?.userStats?.followers || 0} />
              <StatCard label="Following" value={user?.stats?.followingCount || user?.userStats?.following || 0} />
            </HStack>
          </Box>

          {/* Recent Activity */}
          <VStack className="gap-3 px-4">
            <HStack className="justify-between items-center">
              <Heading className="text-lg font-semibold text-typography-900">
                Recent Activity
              </Heading>
              <Text className="text-primary-600 font-medium">View All</Text>
            </HStack>
            {recentActivity.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </VStack>

          {/* Menu Items */}
          <VStack className="gap-3 px-4">
            <Heading className="text-lg font-semibold text-typography-900">
              Settings
            </Heading>
            <Box className="bg-background-50 rounded-xl overflow-hidden">
              {menuItems.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </Box>
          </VStack>

          {/* Logout Button */}
          <Box className="px-4 pb-8">
            <Button
              variant="outline"
              className="border-error-300 bg-error-50"
              onPress={handleLogout}
            >
              <ButtonText className="text-error-600 font-medium">Sign Out</ButtonText>
            </Button>
          </Box>
        </VStack>
      </ScrollView>
    </View>
  );
}
