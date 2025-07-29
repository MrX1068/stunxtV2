import { View, ScrollView, RefreshControl, Pressable } from "react-native";
import { useState } from "react";
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
import { useTheme } from "@/providers/ThemeProvider";

interface Post {
  id: string;
  author: string;
  authorAvatar: string;
  community: string;
  timeAgo: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  tags?: string[];
}

interface Community {
  id: string;
  name: string;
  icon: string;
  members: number;
  trending: boolean;
  color: string;
}

const mockPosts: Post[] = [
  {
    id: "1",
    author: "Sarah Chen",
    authorAvatar: "👩‍💻",
    community: "React Developers Hub",
    timeAgo: "2 hours ago",
    content: "Just discovered this amazing React Native performance optimization technique! Anyone else working with large lists should definitely check out FlashList. The performance gains are incredible - reduced memory usage by 60% and silky smooth scrolling. 🚀",
    likes: 42,
    comments: 8,
    shares: 3,
    isLiked: false,
    tags: ["React Native", "Performance", "FlashList"]
  },
  {
    id: "2",
    author: "Alex Kumar",
    authorAvatar: "👨‍🎨",
    community: "UI/UX Designers",
    timeAgo: "4 hours ago",
    content: "Here's my latest design system component library for React Native. Focused on accessibility and dark mode support. What do you think about the color contrast ratios? Always looking to improve! 🎨",
    likes: 67,
    comments: 12,
    shares: 8,
    isLiked: true,
    tags: ["Design System", "Accessibility", "Dark Mode"]
  },
  {
    id: "3",
    author: "Maria Rodriguez",
    authorAvatar: "👩‍💼",
    community: "Startup Founders",
    timeAgo: "6 hours ago",
    content: "Lessons learned from scaling our mobile app to 1M+ users: 1) Monitor performance religiously 2) Invest in proper testing infrastructure 3) User feedback is gold 4) Don't optimize prematurely. What would you add to this list?",
    likes: 89,
    comments: 24,
    shares: 15,
    isLiked: false,
    tags: ["Scaling", "Mobile", "Startup"]
  }
];

const trendingCommunities: Community[] = [
  {
    id: "1",
    name: "React Developers Hub",
    icon: "⚛️",
    members: 12500,
    trending: true,
    color: "bg-blue-100"
  },
  {
    id: "2",
    name: "UI/UX Designers",
    icon: "🎨",
    members: 8300,
    trending: true,
    color: "bg-purple-100"
  },
  {
    id: "3",
    name: "Mobile Dev Masters",
    icon: "📱",
    members: 9700,
    trending: false,
    color: "bg-green-100"
  },
  {
    id: "4",
    name: "Startup Founders",
    icon: "🚀",
    members: 5600,
    trending: true,
    color: "bg-orange-100"
  }
];

export default function HomeScreen() {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All Activity");

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleLike = (postId: string) => {
    // TODO: Implement like functionality
    console.log("Toggling like for post:", postId);
  };

  const PostCard = ({ post }: { post: Post }) => (
    <Box className="bg-background-50 border border-border-200 rounded-xl p-4 mb-4">
      <VStack className="gap-3">
        <HStack className="justify-between items-start">
          <HStack className="gap-3 flex-1">
            <Text className="text-3xl">{post.authorAvatar}</Text>
            <VStack className="flex-1">
              <Text className="font-bold text-typography-900">{post.author}</Text>
              <Text className="text-sm text-typography-600">in {post.community}</Text>
              <Text className="text-xs text-typography-500">{post.timeAgo}</Text>
            </VStack>
          </HStack>
        </HStack>
        
        <Text className="text-typography-800 leading-relaxed">
          {post.content}
        </Text>
        
        {post.tags && (
          <HStack className="gap-2 flex-wrap">
            {post.tags.map((tag, index) => (
              <Box key={index} className="bg-primary-100 px-2 py-1 rounded-full">
                <Text className="text-xs text-primary-700">#{tag}</Text>
              </Box>
            ))}
          </HStack>
        )}
        
        <HStack className="justify-between items-center pt-2 border-t border-border-100">
          <HStack className="gap-4">
            <Pressable onPress={() => toggleLike(post.id)}>
              <HStack className="gap-1 items-center">
                <Text className={post.isLiked ? "text-red-500" : "text-typography-600"}>
                  {post.isLiked ? "❤️" : "🤍"}
                </Text>
                <Text className="text-sm text-typography-600">{post.likes}</Text>
              </HStack>
            </Pressable>
            
            <Pressable>
              <HStack className="gap-1 items-center">
                <Text className="text-typography-600">💬</Text>
                <Text className="text-sm text-typography-600">{post.comments}</Text>
              </HStack>
            </Pressable>
            
            <Pressable>
              <HStack className="gap-1 items-center">
                <Text className="text-typography-600">🔄</Text>
                <Text className="text-sm text-typography-600">{post.shares}</Text>
              </HStack>
            </Pressable>
          </HStack>
          
          <Pressable>
            <Text className="text-typography-600">🔖</Text>
          </Pressable>
        </HStack>
      </VStack>
    </Box>
  );

  const CommunityCard = ({ community }: { community: Community }) => (
    <Pressable>
      <Box className="bg-background-50 border border-border-200 rounded-xl p-4 mr-4 min-w-[200px]">
        <VStack className="gap-2">
          <HStack className="items-center gap-2">
            <Box className={`w-10 h-10 ${community.color} rounded-lg items-center justify-center`}>
              <Text className="text-xl">{community.icon}</Text>
            </Box>
            {community.trending && (
              <Box className="bg-success-100 px-2 py-1 rounded-full">
                <Text className="text-xs font-medium text-success-700">Trending</Text>
              </Box>
            )}
          </HStack>
          
          <Text className="font-bold text-typography-900" numberOfLines={2}>
            {community.name}
          </Text>
          
          <Text className="text-sm text-typography-600">
            {community.members.toLocaleString()} members
          </Text>
          
          <Button size="sm" className="bg-primary-600 rounded-lg mt-2">
            <ButtonText className="text-white font-medium">Join</ButtonText>
          </Button>
        </VStack>
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
          {/* Header */}
          <Box className="bg-gradient-to-r from-primary-500 to-primary-700 p-6 pt-16">
            <VStack className="gap-4">
              <VStack className="gap-2">
                <Text className="text-white text-2xl font-bold">
                  Welcome back! 👋
                </Text>
                <Text className="text-primary-100">
                  Discover what's happening in your communities
                </Text>
              </VStack>
              
              {/* Quick Actions */}
              <HStack className="gap-3">
                <Box className="flex-1 bg-white/10 border border-white/20 rounded-xl p-4 items-center">
                  <Text className="text-2xl mb-2">📝</Text>
                  <Text className="text-white font-semibold text-center">
                    Create Post
                  </Text>
                </Box>
                
                <Box className="flex-1 bg-white/10 border border-white/20 rounded-xl p-4 items-center">
                  <Text className="text-2xl mb-2">🏢</Text>
                  <Text className="text-white font-semibold text-center">
                    Join Community
                  </Text>
                </Box>
                
                <Box className="flex-1 bg-white/10 border border-white/20 rounded-xl p-4 items-center">
                  <Text className="text-2xl mb-2">💬</Text>
                  <Text className="text-white font-semibold text-center">
                    Start Chat
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Box>

          {/* Feed Filters */}
          <Box className="px-4">
            <HStack className="gap-3">
              {['All Activity', 'My Communities', 'Following', 'Trending'].map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={activeFilter === filter ? "solid" : "outline"}
                  className={activeFilter === filter ? "bg-primary-600" : "border-border-300"}
                  onPress={() => setActiveFilter(filter)}
                >
                  <ButtonText 
                    className={activeFilter === filter ? "text-white" : "text-typography-700"}
                  >
                    {filter}
                  </ButtonText>
                </Button>
              ))}
            </HStack>
          </Box>

          {/* Posts Feed */}
          <VStack className="gap-4 px-4">
            {mockPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </VStack>

          {/* Trending Communities */}
          <VStack className="gap-3">
            <HStack className="justify-between items-center px-4">
              <Heading className="text-lg font-semibold text-typography-900">
                Trending Communities
              </Heading>
              <Text className="text-primary-600 font-medium">See All</Text>
            </HStack>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack className="gap-3 px-4">
                {trendingCommunities.map((community) => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </HStack>
            </ScrollView>
          </VStack>

          {/* Activity Summary */}
          <Box className="bg-background-50 mx-4 rounded-xl p-6">
            <VStack className="gap-4">
              <Heading className="text-lg font-semibold text-typography-900">
                Your Activity Summary
              </Heading>
              
              <HStack className="justify-around">
                <VStack className="items-center">
                  <Text className="text-2xl font-bold text-primary-600">24</Text>
                  <Text className="text-sm text-typography-600">Posts This Week</Text>
                </VStack>
                <VStack className="items-center">
                  <Text className="text-2xl font-bold text-success-600">156</Text>
                  <Text className="text-sm text-typography-600">Total Likes</Text>
                </VStack>
                <VStack className="items-center">
                  <Text className="text-2xl font-bold text-purple-600">8</Text>
                  <Text className="text-sm text-typography-600">Communities</Text>
                </VStack>
              </HStack>
              
              <Button 
                variant="outline" 
                className="border-border-300"
                onPress={() => router.push("/profile")}
              >
                <ButtonText className="text-typography-700">View Full Profile</ButtonText>
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </View>
  );
}
