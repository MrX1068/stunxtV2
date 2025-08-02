import React from 'react';
import { ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { VStack, HStack, Box } from '@/components/ui';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  visible: boolean;
}

const EMOJI_CATEGORIES = {
  'Smileys & People': [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
    '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
    '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
    '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶',
    '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴',
    '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀',
    '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
  ],
  'Hearts & Symbols': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
    '💘', '💝', '💟', '♥️', '💯', '💫', '⭐', '🌟', '✨', '⚡', '💥', '💢', '💨', '💦', '💤', '🔥',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚',
    '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻'
  ],
  'Food & Nature': [
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🥝', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥨', '🍞',
    '🥖', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟',
    '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟',
    '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🎂',
    '🌲', '🌳', '🌴', '🌵', '🌶️', '🥕', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨'
  ],
  'Activities': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
    '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿',
    '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️',
    '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️',
    '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️'
  ]
};

export default function EmojiPicker({ onEmojiSelect, onClose, visible }: EmojiPickerProps) {
  if (!visible) return null;

  return (
    <Box className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200" style={{ height: 250 }}>
      <VStack className="flex-1">
        <HStack className="justify-between items-center p-3 border-b border-gray-100">
          <Text className="text-lg font-semibold text-gray-800">Choose Emoji</Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <Text className="text-xl text-gray-500">✕</Text>
          </TouchableOpacity>
        </HStack>
        
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <VStack className="p-2">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <VStack key={category} className="mb-4">
                <Text className="text-sm font-medium text-gray-600 mb-2 px-2">{category}</Text>
                <View className="flex-row flex-wrap px-2">
                  {emojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={`${category}-${index}`}
                      onPress={() => onEmojiSelect(emoji)}
                      className="w-10 h-10 items-center justify-center m-1 rounded-lg active:bg-gray-100"
                    >
                      <Text className="text-2xl">{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </VStack>
            ))}
          </VStack>
        </ScrollView>
      </VStack>
    </Box>
  );
}
