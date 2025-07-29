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

export default function MessagesScreen() {
  const { isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch messages from API
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
              Messages
            </Heading>
            <Text className="text-typography-600">
              Stay connected with your teams
            </Text>
          </VStack>
          <Button size="sm">
            <ButtonText className="font-semibold">New Chat</ButtonText>
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
        <VStack className="gap-1">
          {/* Message Threads */}
          {[
            {
              name: "Design Team",
              lastMessage: "The new mockups look great! 🎨",
              time: "2m",
              unread: 3,
              avatar: "🎨",
              online: true
            },
            {
              name: "Project Alpha",
              lastMessage: "Meeting scheduled for tomorrow at 2 PM",
              time: "15m",
              unread: 0,
              avatar: "📊",
              online: false
            },
            {
              name: "Sarah Johnson",
              lastMessage: "Thanks for the quick feedback!",
              time: "1h",
              unread: 1,
              avatar: "👩",
              online: true
            },
            {
              name: "Development Team",
              lastMessage: "Code review completed ✅",
              time: "2h",
              unread: 0,
              avatar: "💻",
              online: false
            },
            {
              name: "Marketing Squad",
              lastMessage: "Campaign performance is looking good",
              time: "3h",
              unread: 5,
              avatar: "📈",
              online: true
            },
            {
              name: "John Smith",
              lastMessage: "Let's sync up tomorrow morning",
              time: "1d",
              unread: 0,
              avatar: "👨",
              online: false
            }
          ].map((chat, index) => (
            <Box key={index} className="bg-card border-b border-border-100 p-4">
              <HStack className="gap-4 items-center">
                <Box className="relative">
                  <Box className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
                    <Text className="text-lg">{chat.avatar}</Text>
                  </Box>
                  {chat.online && (
                    <Box className="absolute -bottom-0 -right-0 w-4 h-4 bg-success border-2 border-background rounded-full" />
                  )}
                </Box>
                
                <VStack className="flex-1 gap-1">
                  <HStack className="justify-between items-center">
                    <Heading size="md" className="font-semibold text-typography-900">
                      {chat.name}
                    </Heading>
                    <Text className="text-typography-500 text-sm">{chat.time}</Text>
                  </HStack>
                  
                  <HStack className="justify-between items-center">
                    <Text 
                      className={`flex-1 ${chat.unread > 0 ? 'text-typography-900 font-medium' : 'text-typography-600'}`}
                      numberOfLines={1}
                    >
                      {chat.lastMessage}
                    </Text>
                    {chat.unread > 0 && (
                      <Box className="bg-primary rounded-full w-6 h-6 items-center justify-center ml-2">
                        <Text className="text-white text-xs font-bold">
                          {chat.unread > 9 ? '9+' : chat.unread}
                        </Text>
                      </Box>
                    )}
                  </HStack>
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>

        {/* Quick Actions */}
        <Box className="p-6">
          <VStack className="gap-4">
            <Heading size="lg" className="font-bold text-typography-900">
              Quick Actions
            </Heading>
            
            <HStack className="gap-4">
              <Box className="flex-1 bg-primary-50 border border-primary-200 rounded-xl p-4 items-center">
                <Text className="text-2xl mb-2">👥</Text>
                <Text className="text-primary font-semibold text-center">
                  Start Group Chat
                </Text>
              </Box>
              
              <Box className="flex-1 bg-secondary-50 border border-secondary-200 rounded-xl p-4 items-center">
                <Text className="text-2xl mb-2">📞</Text>
                <Text className="text-secondary font-semibold text-center">
                  Voice Call
                </Text>
              </Box>
              
              <Box className="flex-1 bg-success-50 border border-success-200 rounded-xl p-4 items-center">
                <Text className="text-2xl mb-2">🎥</Text>
                <Text className="text-success font-semibold text-center">
                  Video Meet
                </Text>
              </Box>
            </HStack>
          </VStack>
        </Box>
      </ScrollView>
    </View>
  );
}
