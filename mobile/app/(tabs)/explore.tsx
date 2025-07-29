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
  Input,
  InputField,
  InputSlot,
  InputIcon,
} from "@/components/ui";
import { useTheme } from "@/providers/ThemeContext";

interface TrendingTopic {
  id: string;
  name: string;
  posts: number;
  growth: string;
  category: string;
}

interface FeaturedCommunity {
  id: string;
  name: string;
  description: string;
  icon: string;
  members: number;
  growth: string;
  color: string;
  category: string;
  isVerified: boolean;
}

interface ExplorePost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  authorAvatar: string;
  community: string;
  likes: number;
  comments: number;
  timeAgo: string;
  tags: string[];
}

const trendingTopics: TrendingTopic[] = [
  { id: "1", name: "React Native", posts: 1240, growth: "+15%", category: "Technology" },
  { id: "2", name: "AI Ethics", posts: 890, growth: "+32%", category: "AI" },
  { id: "3", name: "Remote Work", posts: 2100, growth: "+8%", category: "Business" },
  { id: "4", name: "UI Design", posts: 760, growth: "+22%", category: "Design" },
  { id: "5", name: "Startup Tips", posts: 1540, growth: "+18%", category: "Business" },
];

const featuredCommunities: FeaturedCommunity[] = [
  {
    id: "1",
    name: "Tech Innovators",
    description: "Leading discussions on cutting-edge technology",
    icon: "💡",
    members: 45000,
    growth: "+12%",
    color: "bg-blue-100",
    category: "Technology",
    isVerified: true
  },
  {
    id: "2",
    name: "Design Masters",
    description: "Where creativity meets functionality",
    icon: "🎨",
    members: 28000,
    growth: "+25%",
    color: "bg-purple-100",
    category: "Design",
    isVerified: true
  },
  {
    id: "3",
    name: "Future of Work",
    description: "Shaping the workplace of tomorrow",
    icon: "🚀",
    members: 33000,
    growth: "+19%",
    color: "bg-green-100",
    category: "Business",
    isVerified: false
  }
];

const explorePosts: ExplorePost[] = [
  {
    id: "1",
    title: "The Future of Mobile Development with React Native",
    excerpt: "Exploring the latest trends and upcoming features that will shape mobile development...",
    author: "Sarah Chen",
    authorAvatar: "👩‍💻",
    community: "React Native",
    likes: 234,
    comments: 45,
    timeAgo: "2 hours ago",
    tags: ["React Native", "Mobile", "Development"]
  },
  {
    id: "2",
    title: "Building Accessible Design Systems",
    excerpt: "A comprehensive guide to creating inclusive design systems that work for everyone...",
    author: "Alex Kumar",
    authorAvatar: "👨‍🎨",
    community: "UI/UX Designers",
    likes: 189,
    comments: 32,
    timeAgo: "4 hours ago",
    tags: ["Accessibility", "Design Systems", "UX"]
  },
  {
    id: "3",
    title: "AI in Startup Operations",
    excerpt: "How artificial intelligence is revolutionizing the way startups operate and scale...",
    author: "Maria Rodriguez",
    authorAvatar: "👩‍💼",
    community: "Startup Founders",
    likes: 156,
    comments: 28,
    timeAgo: "6 hours ago",
    tags: ["AI", "Startups", "Operations"]
  }
];

export default function ExploreScreen() {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch explore data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const TrendingTopicCard = ({ topic }: { topic: TrendingTopic }) => (
    <Pressable>
      <Box className="bg-background-50 border border-border-200 rounded-xl p-4 mr-4 min-w-[160px]">
        <VStack className="gap-2">
          <Text className="font-bold text-typography-900">{topic.name}</Text>
          <Text className="text-sm text-typography-600">{topic.category}</Text>
          <HStack className="justify-between items-center">
            <Text className="text-xs text-typography-500">{topic.posts} posts</Text>
            <Text className="text-xs font-medium text-success-600">{topic.growth}</Text>
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );

  const FeaturedCommunityCard = ({ community }: { community: FeaturedCommunity }) => (
    <Pressable>
      <Box className="bg-background-50 border border-border-200 rounded-xl p-4 mb-4">
        <VStack className="gap-3">
          <HStack className="justify-between items-start">
            <HStack className="gap-3 flex-1">
              <Box className={`w-12 h-12 ${community.color} rounded-xl items-center justify-center`}>
                <Text className="text-2xl">{community.icon}</Text>
              </Box>
              <VStack className="flex-1">
                <HStack className="items-center gap-2">
                  <Text className="font-bold text-typography-900">{community.name}</Text>
                  {community.isVerified && (
                    <Text className="text-primary-600">✓</Text>
                  )}
                </HStack>
                <Text className="text-typography-600 text-sm" numberOfLines={2}>
                  {community.description}
                </Text>
              </VStack>
            </HStack>
            <Button size="sm" className="bg-primary-600 rounded-lg px-4">
              <ButtonText className="text-white font-medium">Join</ButtonText>
            </Button>
          </HStack>
          
          <HStack className="justify-between items-center">
            <HStack className="gap-4">
              <VStack>
                <Text className="font-semibold text-typography-900">{community.members.toLocaleString()}</Text>
                <Text className="text-xs text-typography-600">Members</Text>
              </VStack>
              <VStack>
                <Text className="font-semibold text-success-600">{community.growth}</Text>
                <Text className="text-xs text-typography-600">Growth</Text>
              </VStack>
            </HStack>
            <Text className="text-xs text-typography-500">{community.category}</Text>
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );

  const ExplorePostCard = ({ post }: { post: ExplorePost }) => (
    <Pressable>
      <Box className="bg-background-50 border border-border-200 rounded-xl p-4 mb-4">
        <VStack className="gap-3">
          <Text className="font-bold text-typography-900 text-lg" numberOfLines={2}>
            {post.title}
          </Text>
          
          <Text className="text-typography-600" numberOfLines={3}>
            {post.excerpt}
          </Text>
          
          <HStack className="gap-2 flex-wrap">
            {post.tags.map((tag, index) => (
              <Box key={index} className="bg-primary-100 px-2 py-1 rounded-full">
                <Text className="text-xs text-primary-700">#{tag}</Text>
              </Box>
            ))}
          </HStack>
          
          <HStack className="justify-between items-center">
            <HStack className="gap-3">
              <Text className="text-2xl">{post.authorAvatar}</Text>
              <VStack>
                <Text className="font-medium text-typography-900">{post.author}</Text>
                <Text className="text-xs text-typography-500">in {post.community}</Text>
              </VStack>
            </HStack>
            <Text className="text-xs text-typography-500">{post.timeAgo}</Text>
          </HStack>
          
          <HStack className="gap-4 pt-2">
            <HStack className="gap-1 items-center">
              <Text className="text-typography-600">❤️</Text>
              <Text className="text-sm text-typography-600">{post.likes}</Text>
            </HStack>
            <HStack className="gap-1 items-center">
              <Text className="text-typography-600">💬</Text>
              <Text className="text-sm text-typography-600">{post.comments}</Text>
            </HStack>
          </HStack>
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
        <VStack className="p-4 gap-6">
          {/* Header */}
          <VStack className="gap-4">
            <VStack className="gap-2">
              <Heading className="text-2xl font-bold text-typography-900">
                Explore
              </Heading>
              <Text className="text-typography-600">
                Discover communities and trending content
              </Text>
            </VStack>
            
            {/* Search Bar */}
            <Input variant="outline" size="lg" className="bg-background-50">
              <InputField
                placeholder="Search communities, topics, or posts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="text-typography-900"
              />
              <InputSlot className="pr-3">
                <Text className="text-typography-400 text-lg">🔍</Text>
              </InputSlot>
            </Input>
          </VStack>

          {/* Trending Topics */}
          <VStack className="gap-3">
            <HStack className="justify-between items-center">
              <Heading className="text-lg font-semibold text-typography-900">
                Trending Topics
              </Heading>
              <Text className="text-primary-600 font-medium">View All</Text>
            </HStack>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <HStack className="gap-3 pl-1">
                {trendingTopics.map((topic) => (
                  <TrendingTopicCard key={topic.id} topic={topic} />
                ))}
              </HStack>
            </ScrollView>
          </VStack>

          {/* Featured Communities */}
          <VStack className="gap-3">
            <HStack className="justify-between items-center">
              <Heading className="text-lg font-semibold text-typography-900">
                Featured Communities
              </Heading>
              <Text className="text-primary-600 font-medium">See More</Text>
            </HStack>
            {featuredCommunities.map((community) => (
              <FeaturedCommunityCard key={community.id} community={community} />
            ))}
          </VStack>

          {/* Popular Posts */}
          <VStack className="gap-3">
            <HStack className="justify-between items-center">
              <Heading className="text-lg font-semibold text-typography-900">
                Popular Posts
              </Heading>
              <Text className="text-primary-600 font-medium">View All</Text>
            </HStack>
            {explorePosts.map((post) => (
              <ExplorePostCard key={post.id} post={post} />
            ))}
          </VStack>

          {/* Quick Actions */}
          <VStack className="gap-3">
            <Heading className="text-lg font-semibold text-typography-900">
              Quick Actions
            </Heading>
            <HStack className="gap-3">
              <Button
                className="flex-1 bg-primary-600 rounded-xl"
                onPress={() => console.log("Create post")}
              >
                <ButtonText className="text-white font-medium">Create Post</ButtonText>
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-border-300 rounded-xl"
                onPress={() => console.log("Browse categories")}
              >
                <ButtonText className="text-typography-700 font-medium">Browse Categories</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </View>
  );
}
