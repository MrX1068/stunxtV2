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
} from "@/components/ui";
import { useTheme } from "@/providers/ThemeContext";

interface Message {
  id: string;
  type: 'direct' | 'space';
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  avatar: string;
  participants?: string[];
  spaceName?: string;
  communityName?: string;
}

interface RecentSpace {
  id: string;
  name: string;
  communityName: string;
  lastActivity: string;
  unreadCount: number;
  icon: string;
  color: string;
}

const directMessages: Message[] = [
  {
    id: "1",
    type: "direct",
    name: "Sarah Chen",
    lastMessage: "Hey! Did you see the new React Native updates?",
    lastMessageTime: "2m ago",
    unreadCount: 2,
    isOnline: true,
    avatar: "👩‍💻"
  },
  {
    id: "2",
    type: "direct",
    name: "Alex Kumar",
    lastMessage: "Thanks for the design feedback!",
    lastMessageTime: "1h ago",
    unreadCount: 0,
    isOnline: true,
    avatar: "👨‍🎨"
  },
  {
    id: "3",
    type: "direct",
    name: "Maria Rodriguez",
    lastMessage: "Can we schedule a call for tomorrow?",
    lastMessageTime: "3h ago",
    unreadCount: 1,
    isOnline: false,
    avatar: "👩‍💼"
  },
  {
    id: "4",
    type: "direct",
    name: "David Park",
    lastMessage: "The prototype looks great!",
    lastMessageTime: "1d ago",
    unreadCount: 0,
    isOnline: false,
    avatar: "👨‍💻"
  }
];

const spaceMessages: Message[] = [
  {
    id: "5",
    type: "space",
    name: "General Discussion",
    spaceName: "General Discussion",
    communityName: "React Developers Hub",
    lastMessage: "John: Anyone working with Expo Router?",
    lastMessageTime: "5m ago",
    unreadCount: 5,
    isOnline: true,
    avatar: "💬",
    participants: ["👨‍💻", "👩‍💻", "👨‍🎨", "👩‍💼"]
  },
  {
    id: "6",
    type: "space",
    name: "Design Critique",
    spaceName: "Design Critique",
    communityName: "UI/UX Designers",
    lastMessage: "Emma: Love the color scheme in this mockup",
    lastMessageTime: "15m ago",
    unreadCount: 3,
    isOnline: true,
    avatar: "🎯",
    participants: ["👨‍🎨", "👩‍🎨", "👩‍💻"]
  },
  {
    id: "7",
    type: "space",
    name: "Funding & Investment",
    spaceName: "Funding & Investment",
    communityName: "Startup Founders",
    lastMessage: "Mike: Series A tips from someone who's been there?",
    lastMessageTime: "1h ago",
    unreadCount: 0,
    isOnline: false,
    avatar: "💰",
    participants: ["👨‍💼", "👩‍💼", "👨‍💻"]
  }
];

const recentSpaces: RecentSpace[] = [
  {
    id: "1",
    name: "Random",
    communityName: "React Developers Hub",
    lastActivity: "3m ago",
    unreadCount: 2,
    icon: "🎲",
    color: "bg-blue-100"
  },
  {
    id: "2",
    name: "Resources",
    communityName: "UI/UX Designers",
    lastActivity: "1h ago",
    unreadCount: 0,
    icon: "📚",
    color: "bg-purple-100"
  },
  {
    id: "3",
    name: "Events",
    communityName: "Startup Founders",
    lastActivity: "2h ago",
    unreadCount: 1,
    icon: "📅",
    color: "bg-green-100"
  }
];

export default function MessagesScreen() {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'direct' | 'spaces'>('direct');

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch messages from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const MessageCard = ({ message }: { message: Message }) => (
    <Pressable>
      <Box className="bg-background-50 border-b border-border-100 p-4">
        <HStack className="justify-between items-center">
          <HStack className="gap-3 flex-1">
            <Box className="relative">
              <Text className="text-3xl">{message.avatar}</Text>
              {message.type === 'direct' && message.isOnline && (
                <Box className="absolute -bottom-1 -right-1 w-3 h-3 bg-success-500 rounded-full border-2 border-background-0"></Box>
              )}
            </Box>
            
            <VStack className="flex-1">
              <HStack className="justify-between items-start">
                <VStack className="flex-1">
                  <Text className="font-semibold text-typography-900" numberOfLines={1}>
                    {message.name}
                  </Text>
                  {message.type === 'space' && (
                    <Text className="text-xs text-typography-500" numberOfLines={1}>
                      {message.communityName}
                    </Text>
                  )}
                </VStack>
                <VStack className="items-end">
                  <Text className="text-xs text-typography-500">{message.lastMessageTime}</Text>
                  {message.unreadCount > 0 && (
                    <Box className="bg-primary-600 rounded-full min-w-[20px] h-5 items-center justify-center px-1 mt-1">
                      <Text className="text-white text-xs font-bold">
                        {message.unreadCount > 99 ? "99+" : message.unreadCount}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </HStack>
              
              <Text className="text-typography-600 text-sm mt-1" numberOfLines={2}>
                {message.lastMessage}
              </Text>
              
              {message.type === 'space' && message.participants && (
                <HStack className="gap-1 mt-2">
                  {message.participants.slice(0, 4).map((participant, index) => (
                    <Text key={index} className="text-sm">{participant}</Text>
                  ))}
                  {message.participants.length > 4 && (
                    <Text className="text-xs text-typography-500">+{message.participants.length - 4}</Text>
                  )}
                </HStack>
              )}
            </VStack>
          </HStack>
        </HStack>
      </Box>
    </Pressable>
  );

  const SpaceCard = ({ space }: { space: RecentSpace }) => (
    <Pressable>
      <Box className="bg-background-50 border border-border-200 rounded-xl p-3 mr-3 min-w-[140px]">
        <VStack className="gap-2">
          <HStack className="justify-between items-start">
            <Box className={`w-8 h-8 ${space.color} rounded-lg items-center justify-center`}>
              <Text className="text-lg">{space.icon}</Text>
            </Box>
            {space.unreadCount > 0 && (
              <Box className="bg-primary-600 rounded-full w-4 h-4 items-center justify-center">
                <Text className="text-white text-xs font-bold">{space.unreadCount}</Text>
              </Box>
            )}
          </HStack>
          
          <VStack>
            <Text className="font-semibold text-typography-900 text-sm" numberOfLines={1}>
              {space.name}
            </Text>
            <Text className="text-xs text-typography-500" numberOfLines={1}>
              {space.communityName}
            </Text>
            <Text className="text-xs text-typography-400 mt-1">
              {space.lastActivity}
            </Text>
          </VStack>
        </VStack>
      </Box>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background-0">
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <VStack className="flex-1">
        {/* Header */}
        <Box className="bg-background-0 border-b border-border-200 p-4 pt-12">
          <VStack className="gap-4">
            <HStack className="justify-between items-center">
              <VStack>
                <Heading className="text-2xl font-bold text-typography-900">
                  Messages
                </Heading>
                <Text className="text-typography-600">
                  Stay connected with your teams
                </Text>
              </VStack>
              <Button size="sm" className="bg-primary-600 rounded-lg">
                <ButtonText className="text-white font-medium">New Chat</ButtonText>
              </Button>
            </HStack>
            
            {/* Search Bar */}
            <Input variant="outline" size="md" className="bg-background-50">
              <InputField
                placeholder="Search messages..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="text-typography-900"
              />
              <InputSlot className="pr-3">
                <Text className="text-typography-400">🔍</Text>
              </InputSlot>
            </Input>
          </VStack>
        </Box>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <VStack className="gap-6">
            {/* Recent Spaces */}
            <VStack className="gap-3 pt-4">
              <HStack className="justify-between items-center px-4">
                <Heading className="text-lg font-semibold text-typography-900">
                  Recent Spaces
                </Heading>
                <Text className="text-primary-600 font-medium">View All</Text>
              </HStack>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack className="gap-3 px-4">
                  {recentSpaces.map((space) => (
                    <SpaceCard key={space.id} space={space} />
                  ))}
                </HStack>
              </ScrollView>
            </VStack>

            {/* Tab Selector */}
            <VStack className="gap-3">
              <HStack className="bg-background-100 rounded-xl p-1 mx-4">
                <Pressable
                  className="flex-1"
                  onPress={() => setActiveTab('direct')}
                >
                  <Box className={`py-2 px-4 rounded-lg items-center ${
                    activeTab === 'direct' ? 'bg-background-0 shadow-sm' : ''
                  }`}>
                    <Text className={`font-medium ${
                      activeTab === 'direct' ? 'text-typography-900' : 'text-typography-600'
                    }`}>
                      Direct Messages
                    </Text>
                  </Box>
                </Pressable>
                
                <Pressable
                  className="flex-1"
                  onPress={() => setActiveTab('spaces')}
                >
                  <Box className={`py-2 px-4 rounded-lg items-center ${
                    activeTab === 'spaces' ? 'bg-background-0 shadow-sm' : ''
                  }`}>
                    <Text className={`font-medium ${
                      activeTab === 'spaces' ? 'text-typography-900' : 'text-typography-600'
                    }`}>
                      Spaces
                    </Text>
                  </Box>
                </Pressable>
              </HStack>

              {/* Messages List */}
              <VStack>
                {activeTab === 'direct' && directMessages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
                
                {activeTab === 'spaces' && spaceMessages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
              </VStack>
            </VStack>
          </VStack>
        </ScrollView>
      </VStack>
    </View>
  );
}
