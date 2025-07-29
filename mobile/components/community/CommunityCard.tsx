import React from 'react';
import { Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { Community } from '@/stores/posts';
import { formatNumber } from '@/utils/formatters';

interface CommunityCardProps {
  community: Community;
  onPress?: () => void;
  onJoinPress?: () => void;
  onLeavePress?: () => void;
  variant?: 'default' | 'compact' | 'featured';
  showActions?: boolean;
}

export function CommunityCard({
  community,
  onPress,
  onJoinPress,
  onLeavePress,
  variant = 'default',
  showActions = true,
}: CommunityCardProps) {
  const handleJoinToggle = () => {
    if (community.isJoined) {
      onLeavePress?.();
    } else {
      onJoinPress?.();
    }
  };

  const renderCompact = () => (
    <Pressable onPress={onPress}>
      <Box className="bg-background-50 border border-outline-200 rounded-lg p-3 mb-2">
        <HStack space="md" className="items-center">
          <Box className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
            <Text size="lg">{community.avatar || '👥'}</Text>
          </Box>
          
          <VStack className="flex-1">
            <Text size="md" className="font-semibold text-typography-900">
              {community.name}
            </Text>
            <Text size="xs" className="text-typography-500">
              {formatNumber(community.memberCount)} members
            </Text>
          </VStack>
          
          {showActions && (
            <Button
              size="sm"
              variant={community.isJoined ? "outline" : "solid"}
              onPress={handleJoinToggle}
            >
              <ButtonText size="xs">
                {community.isJoined ? "Joined" : "Join"}
              </ButtonText>
            </Button>
          )}
        </HStack>
      </Box>
    </Pressable>
  );

  const renderFeatured = () => (
    <Pressable onPress={onPress}>
      <Box className="bg-gradient-to-br from-primary-100 to-primary-200 border border-primary-300 rounded-xl p-4 mb-3">
        <VStack space="md">
          <HStack space="md" className="items-start">
            <Box className="w-16 h-16 bg-primary-500 rounded-xl items-center justify-center">
              <Text size="2xl" className="text-white">
                {community.avatar || '⭐'}
              </Text>
            </Box>
            
            <VStack className="flex-1">
              <Text size="lg" className="font-bold text-typography-900">
                {community.name}
              </Text>
              <Text size="sm" className="text-typography-600 mt-1">
                {community.description}
              </Text>
            </VStack>
          </HStack>
          
          <HStack className="justify-between items-center">
            <HStack space="lg">
              <VStack className="items-center">
                <Text size="lg" className="font-bold text-primary-700">
                  {formatNumber(community.memberCount)}
                </Text>
                <Text size="xs" className="text-typography-500">Members</Text>
              </VStack>
              <VStack className="items-center">
                <Text size="lg" className="font-bold text-primary-700">
                  {formatNumber(community.postCount)}
                </Text>
                <Text size="xs" className="text-typography-500">Posts</Text>
              </VStack>
            </HStack>
            
            {showActions && (
              <Button
                variant={community.isJoined ? "outline" : "solid"}
                onPress={handleJoinToggle}
              >
                <ButtonText>
                  {community.isJoined ? "Joined" : "Join"}
                </ButtonText>
              </Button>
            )}
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );

  const renderDefault = () => (
    <Pressable onPress={onPress}>
      <Box className="bg-background-50 border border-outline-200 rounded-lg p-4 mb-3">
        <VStack space="md">
          <HStack space="md" className="items-start">
            <Box className="w-12 h-12 bg-primary-100 rounded-lg items-center justify-center">
              <Text size="xl">{community.avatar || '👥'}</Text>
            </Box>
            
            <VStack className="flex-1">
              <HStack className="justify-between items-start">
                <Text size="lg" className="font-semibold text-typography-900 flex-1">
                  {community.name}
                </Text>
                {community.isPrivate && (
                  <MaterialIcons name="lock" size={16} color="#6B7280" />
                )}
              </HStack>
              
              <Text size="sm" className="text-typography-600 mt-1">
                {community.description}
              </Text>
            </VStack>
          </HStack>
          
          <HStack className="justify-between items-center">
            <HStack space="md">
              <HStack space="xs" className="items-center">
                <MaterialIcons name="people" size={16} color="#6B7280" />
                <Text size="sm" className="text-typography-500">
                  {formatNumber(community.memberCount)}
                </Text>
              </HStack>
              <HStack space="xs" className="items-center">
                <MaterialIcons name="article" size={16} color="#6B7280" />
                <Text size="sm" className="text-typography-500">
                  {formatNumber(community.postCount)}
                </Text>
              </HStack>
            </HStack>
            
            {showActions && (
              <Button
                size="sm"
                variant={community.isJoined ? "outline" : "solid"}
                onPress={handleJoinToggle}
              >
                <ButtonText size="sm">
                  {community.isJoined ? "Joined" : "Join"}
                </ButtonText>
              </Button>
            )}
          </HStack>
        </VStack>
      </Box>
    </Pressable>
  );

  switch (variant) {
    case 'compact':
      return renderCompact();
    case 'featured':
      return renderFeatured();
    default:
      return renderDefault();
  }
}
