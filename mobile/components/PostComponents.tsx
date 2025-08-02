import React from 'react';
import { View, Pressable } from 'react-native';
import { Text, HStack, VStack } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { useAvatarSizes } from '@/utils/useAvatarSizes';

interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  };
  community: {
    id: string;
    name: string;
  };
  timeAgo: string;
  likesCount: number;
  commentsCount: number;
}

interface PostCardProps {
  post: Post;
  onPress: (postId: string) => void;
  onAuthorPress: (authorId: string) => void;
}

/**
 * Post Card - Medium avatars (80x80) for post lists
 * This is where avatar optimization makes the biggest difference!
 */
export function PostCard({ post, onPress, onAuthorPress }: PostCardProps) {
  return (
    <Pressable 
      onPress={() => onPress(post.id)}
      className="bg-background-50 border border-border-200 rounded-xl p-4 mb-3"
    >
      <VStack className="gap-3">
        {/* Author Header */}
        <HStack className="items-center gap-3">
          <Pressable onPress={() => onAuthorPress(post.author.id)}>
            {/* Medium avatar (80x80) for post cards - balanced size/quality */}
            <Avatar 
              src={post.author.avatarUrl}
              size={48}
              fallbackText={post.author.fullName}
            />
          </Pressable>
          
          <VStack className="flex-1">
            <Pressable onPress={() => onAuthorPress(post.author.id)}>
              <Text className="font-semibold text-typography-900">
                {post.author.fullName}
              </Text>
              <Text className="text-sm text-typography-600">
                @{post.author.username} • {post.community.name}
              </Text>
            </Pressable>
          </VStack>
          
          <Text className="text-sm text-typography-500">
            {post.timeAgo}
          </Text>
        </HStack>

        {/* Post Content */}
        <VStack className="gap-2">
          <Text className="font-semibold text-lg text-typography-900">
            {post.title}
          </Text>
          <Text className="text-typography-700" numberOfLines={3}>
            {post.content}
          </Text>
        </VStack>

        {/* Post Actions */}
        <HStack className="justify-between items-center pt-2 border-t border-border-100">
          <HStack className="gap-4">
            <HStack className="items-center gap-1">
              <Text className="text-lg">❤️</Text>
              <Text className="text-sm text-typography-600">{post.likesCount}</Text>
            </HStack>
            <HStack className="items-center gap-1">
              <Text className="text-lg">💬</Text>
              <Text className="text-sm text-typography-600">{post.commentsCount}</Text>
            </HStack>
          </HStack>
        </HStack>
      </VStack>
    </Pressable>
  );
}

/**
 * Community Members List - Small avatars with backend optimization
 */
interface CommunityMember {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'moderator' | 'member';
  joinedDate: string;
}

interface CommunityMembersProps {
  members: CommunityMember[];
  onMemberPress: (memberId: string) => void;
}

export function CommunityMembers({ members, onMemberPress }: CommunityMembersProps) {
  return (
    <VStack className="gap-2">
      {members.map((member) => (
        <Pressable 
          key={member.id}
          onPress={() => onMemberPress(member.id)}
          className="px-3 py-2 rounded-lg bg-background-50"
        >
          <HStack className="items-center gap-3">
            {/* Small avatars (60x60) for member lists */}
            <Avatar 
              src={member.avatarUrl}
              size={40}
              fallbackText={member.fullName}
            />
            
            <VStack className="flex-1">
              <Text className="font-medium text-typography-900">
                {member.fullName}
              </Text>
              <HStack className="items-center gap-2">
                <Text className="text-sm text-typography-600">
                  @{member.username}
                </Text>
                {member.role !== 'member' && (
                  <View className="bg-primary-100 px-2 py-1 rounded-full">
                    <Text className="text-xs text-primary-700 font-medium">
                      {member.role}
                    </Text>
                  </View>
                )}
              </HStack>
            </VStack>
            
            <Text className="text-xs text-typography-500">
              Joined {member.joinedDate}
            </Text>
          </HStack>
        </Pressable>
      ))}
    </VStack>
  );
}
