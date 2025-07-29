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
import { formatTime } from '@/utils/formatters';
import type { Space } from '@/stores';

interface SpaceCardProps {
  space: Space;
  onPress?: () => void;
  onJoinPress?: () => void;
  onLeavePress?: () => void;
  variant?: 'default' | 'compact';
  showCommunity?: boolean;
  showActions?: boolean;
}

const spaceIcons = {
  public: 'public',
  private: 'lock',
  secret: 'visibility-off',
} as const;

export function SpaceCard({
  space,
  onPress,
  onJoinPress,
  onLeavePress,
  variant = 'default',
  showCommunity = false,
  showActions = true,
}: SpaceCardProps) {
  const getSpaceIcon = () => {
    return spaceIcons[space.type] || 'public';
  };

  const handleJoinToggle = () => {
    if (space.isJoined) {
      onLeavePress?.();
    } else {
      onJoinPress?.();
    }
  };

  const renderCompact = () => (
    <Pressable onPress={onPress}>
      <Box className="bg-background-50 border-l-4 border-primary-500 p-3 mb-2">
        <HStack space="md" className="items-center">
          <MaterialIcons 
            name={getSpaceIcon()} 
            size={18} 
            color="#6366F1" 
          />
          
          <VStack className="flex-1">
            <HStack className="justify-between items-center">
              <Text size="md" className="font-medium text-typography-900">
                {space.name}
              </Text>
              {(space.unreadCount ?? 0) > 0 && (
                <Box className="bg-error-500 px-2 py-1 rounded-full min-w-[20px] items-center">
                  <Text size="xs" className="text-white font-medium">
                    {(space.unreadCount ?? 0) > 99 ? '99+' : space.unreadCount}
                  </Text>
                </Box>
              )}
            </HStack>
            
            {space.lastMessage && (
              <Text size="xs" className="text-typography-500 mt-1">
                {space.lastMessage.authorName}: {space.lastMessage.content}
              </Text>
            )}
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );

  const renderDefault = () => (
    <Pressable onPress={onPress}>
      <Box className="bg-background-50 border border-outline-200 rounded-lg p-4 mb-3">
        <VStack space="md">
          <HStack space="md" className="items-start">
            <Box className="w-10 h-10 bg-primary-100 rounded-lg items-center justify-center">
              <MaterialIcons 
                name={getSpaceIcon()} 
                size={20} 
                color="#6366F1" 
              />
            </Box>
            
            <VStack className="flex-1">
              <HStack className="justify-between items-start">
                <VStack className="flex-1">
                  <Text size="lg" className="font-semibold text-typography-900">
                    {space.name}
                  </Text>
                  {space.description && (
                    <Text size="sm" className="text-typography-600 mt-1">
                      {space.description}
                    </Text>
                  )}
                </VStack>
                
                <VStack className="items-end">
                  {(space.unreadCount ?? 0) > 0 && (
                    <Box className="bg-error-500 px-2 py-1 rounded-full min-w-[20px] items-center mb-1">
                      <Text size="xs" className="text-white font-medium">
                        {(space.unreadCount ?? 0) > 99 ? '99+' : space.unreadCount}
                      </Text>
                    </Box>
                  )}
                  
                  {space.type === 'private' && (
                    <MaterialIcons name="lock" size={16} color="#6B7280" />
                  )}
                </VStack>
              </HStack>
            </VStack>
          </HStack>
          
          {space.lastMessage && (
            <Box className="bg-background-100 rounded-lg p-3">
              <HStack className="justify-between items-center">
                <VStack className="flex-1">
                  <Text size="sm" className="font-medium text-typography-700">
                    {space.lastMessage.authorName}
                  </Text>
                  <Text size="sm" className="text-typography-600 mt-1">
                    {space.lastMessage.content}
                  </Text>
                </VStack>
                <Text size="xs" className="text-typography-500">
                  {formatTime(space.lastMessage.createdAt)}
                </Text>
              </HStack>
            </Box>
          )}
          
          {space.memberCount > 0 && (
            <HStack space="xs" className="items-center">
              <MaterialIcons name="people" size={16} color="#6B7280" />
              <Text size="sm" className="text-typography-500">
                {space.memberCount} member{space.memberCount !== 1 ? 's' : ''}
              </Text>
            </HStack>
          )}

          {showActions && (
            <Button
              variant={space.isJoined ? "outline" : "solid"}
              size="sm"
              onPress={handleJoinToggle}
            >
              <ButtonText>
                {space.isJoined ? "Leave" : "Join"}
              </ButtonText>
            </Button>
          )}
        </VStack>
      </Box>
    </Pressable>
  );

  return variant === 'compact' ? renderCompact() : renderDefault();
}
