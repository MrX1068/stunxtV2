import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, HStack, VStack } from '@/components/ui';
import { Avatar } from '@/components/Avatar';

interface ChatUser {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  lastMessage: string;
  timeAgo: string;
  unreadCount: number;
}

interface ChatListProps {
  chats: ChatUser[];
  onChatPress: (userId: string) => void;
}

/**
 * Chat List - Perfect use case for thumbnail avatars (40x40)
 * Loading 20 chats: Without optimization = 20 × 2MB = 40MB
 *                   With optimization = 20 × 5KB = 100KB (99.75% savings!)
 */
export function ChatList({ chats, onChatPress }: ChatListProps) {
  return (
    <ScrollView className="flex-1 bg-background">
      {chats.map((chat) => (
        <Pressable 
          key={chat.id}
          onPress={() => onChatPress(chat.id)}
          className="px-4 py-3 border-b border-border-100"
        >
          <HStack className="gap-3 items-center">
            {/* Using thumbnail size (40x40) for chat list - PERFECT for performance */}
            <Avatar 
              src={chat.avatarUrl}
              size={40}
              fallbackText={chat.fullName}
            />
            
            <VStack className="flex-1">
              <HStack className="justify-between items-center">
                <Text className="font-semibold text-typography-900">
                  {chat.fullName}
                </Text>
                <Text className="text-xs text-typography-500">
                  {chat.timeAgo}
                </Text>
              </HStack>
              
              <HStack className="justify-between items-center mt-1">
                <Text 
                  className="text-sm text-typography-600" 
                  numberOfLines={1}
                  style={{ flex: 1 }}
                >
                  {chat.lastMessage}
                </Text>
                {chat.unreadCount > 0 && (
                  <View className="bg-primary-500 rounded-full px-2 py-1 ml-2">
                    <Text className="text-xs text-white font-medium">
                      {chat.unreadCount}
                    </Text>
                  </View>
                )}
              </HStack>
            </VStack>
          </HStack>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Message Bubble - Small avatars (60x60) for message threads
 */
interface MessageBubbleProps {
  message: {
    id: string;
    text: string;
    author: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
    };
    timestamp: string;
    isOwn: boolean;
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.isOwn) {
    return (
      <HStack className="justify-end px-4 py-2">
        <View className="bg-primary-500 rounded-2xl px-4 py-2 max-w-[80%]">
          <Text className="text-white">{message.text}</Text>
        </View>
      </HStack>
    );
  }

  return (
    <HStack className="px-4 py-2 gap-2">
      {/* Small avatar (60x60) for message threads */}
      <Avatar 
        src={message.author.avatarUrl}
        size={32}
        fallbackText={message.author.fullName}
      />
      
      <VStack className="flex-1">
        <View className="bg-background-100 rounded-2xl px-4 py-2 max-w-[80%]">
          <Text className="text-typography-900">{message.text}</Text>
        </View>
        <Text className="text-xs text-typography-500 mt-1 ml-2">
          {message.author.fullName} • {message.timestamp}
        </Text>
      </VStack>
    </HStack>
  );
}
