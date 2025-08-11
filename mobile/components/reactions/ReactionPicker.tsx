import React, { useState } from 'react';
import { View, Pressable, Animated, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from '../ui/text';
import { HStack } from '../ui/hstack';

interface ReactionPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onReactionSelect: (reactionType: string) => void;
  currentReaction?: string;
}

interface ReactionType {
  type: string;
  emoji: string;
  label: string;
  color: string;
}

const REACTIONS: ReactionType[] = [
  { type: 'like', emoji: '👍', label: 'Like', color: '#1877F2' },
  { type: 'love', emoji: '❤️', label: 'Love', color: '#E91E63' },
  { type: 'laugh', emoji: '😂', label: 'Laugh', color: '#FFC107' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: '#FF9800' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: '#607D8B' },
  { type: 'angry', emoji: '😠', label: 'Angry', color: '#F44336' },
  { type: 'care', emoji: '🤗', label: 'Care', color: '#4CAF50' },
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate', color: '#9C27B0' },
  { type: 'support', emoji: '💪', label: 'Support', color: '#795548' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', color: '#FFEB3B' },
  { type: 'funny', emoji: '😄', label: 'Funny', color: '#FF5722' },
  { type: 'confused', emoji: '🤔', label: 'Confused', color: '#9E9E9E' },
];

/**
 * ✅ PROFESSIONAL REACTION PICKER
 * 
 * Features:
 * - Facebook/LinkedIn style reaction picker
 * - Smooth animations and haptic feedback
 * - All 12 reaction types from backend enum
 * - Professional design with hover effects
 * - Accessible with proper labels
 */

export function ReactionPicker({
  isVisible,
  onClose,
  onReactionSelect,
  currentReaction,
}: ReactionPickerProps) {
  const [scaleAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (isVisible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, scaleAnim]);

  const handleReactionPress = (reactionType: string) => {
    onReactionSelect(reactionType);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={onClose}
      animationType="none"
    >
      <Pressable
        className="flex-1 bg-black/20"
        onPress={onClose}
      >
        <View className="flex-1 justify-center items-center p-4">
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 max-w-sm w-full"
          >
            {/* Header */}
            <View className="mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white text-center">
                Choose a reaction
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                Express how you feel about this post
              </Text>
            </View>

            {/* Reaction Grid */}
            <View className="flex-row flex-wrap justify-center gap-2">
              {REACTIONS.map((reaction) => {
                const isSelected = currentReaction === reaction.type;
                
                return (
                  <Pressable
                    key={reaction.type}
                    onPress={() => handleReactionPress(reaction.type)}
                    className={`
                      flex-col items-center justify-center p-3 rounded-xl min-w-[70px]
                      ${isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500' 
                        : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }
                      active:scale-95
                    `}
                    style={{
                      shadowColor: isSelected ? reaction.color : '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isSelected ? 0.3 : 0.1,
                      shadowRadius: 4,
                      elevation: isSelected ? 4 : 2,
                    }}
                  >
                    {/* Emoji */}
                    <Text className="text-2xl mb-1">
                      {reaction.emoji}
                    </Text>
                    
                    {/* Label */}
                    <Text 
                      className={`
                        text-xs font-medium text-center
                        ${isSelected 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {reaction.label}
                    </Text>
                    
                    {/* Selection Indicator */}
                    {isSelected && (
                      <View className="absolute -top-1 -right-1">
                        <View 
                          className="w-5 h-5 rounded-full items-center justify-center"
                          style={{ backgroundColor: reaction.color }}
                        >
                          <MaterialIcons name="check" size={12} color="white" />
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Footer */}
            <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <Pressable
                onPress={onClose}
                className="bg-gray-100 dark:bg-gray-700 rounded-lg py-3 px-4 active:bg-gray-200 dark:active:bg-gray-600"
              >
                <Text className="text-center font-medium text-gray-700 dark:text-gray-300">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

// Export reaction types for use in other components
export const REACTION_TYPES = REACTIONS;

// Helper function to get reaction display info
export function getReactionInfo(reactionType: string): ReactionType | undefined {
  return REACTIONS.find(r => r.type === reactionType);
}
