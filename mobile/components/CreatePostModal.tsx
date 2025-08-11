import React, { useState, useCallback } from 'react';
import { Alert, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from './ui/modal';
import { Button, ButtonText } from './ui/button';
import { Heading } from './ui/heading';
import { Text } from './ui/text';
import { VStack } from './ui/vstack';
import { HStack } from './ui/hstack';
import { Box } from './ui/box';
import { Input, InputField } from './ui/input';
import { useSpaceContent } from '../stores/contentStore';
import type { CreateContentData } from '../stores/contentStore';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  communityId: string;
  spaceName: string;
  onPostCreated?: (post: any) => void;
}

export function CreatePostModal({
  isOpen,
  onClose,
  spaceId,
  communityId,
  spaceName,
  onPostCreated,
}: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'members_only' | 'private'>('public');
  
  const { createContent, isCreating, error, clearErrors } = useSpaceContent(spaceId);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setTags('');
      setVisibility('public');
      clearErrors();
    }
  }, [isOpen, clearErrors]);

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!content.trim()) {
      Alert.alert('Validation Error', 'Post content is required.');
      return;
    }

    if (content.trim().length < 10) {
      Alert.alert('Validation Error', 'Post content must be at least 10 characters long.');
      return;
    }

    try {
      const postData: CreateContentData = {
        title: title.trim() || undefined,
        content: content.trim(),
        type: 'post',
        visibility,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        metadata: {
          readingTime: Math.max(1, Math.ceil(content.trim().split(' ').length / 200)), // Estimate reading time
        },
      };

      console.log('📤 [CreatePostModal] Creating post:', postData);

      const newPost = await createContent({
        communityId,
        spaceId,
        data: postData,
      });

      console.log('✅ [CreatePostModal] Post created successfully:', newPost.id);

      // Success feedback
      Alert.alert(
        'Success!',
        'Your post has been created successfully.',
        [{ text: 'OK' }]
      );

      // Callback for parent component
      if (onPostCreated) {
        onPostCreated(newPost);
      }

      // Close modal
      onClose();

    } catch (error: any) {
      console.error('❌ [CreatePostModal] Failed to create post:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create post. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [title, content, tags, visibility, createContent, communityId, spaceId, onPostCreated, onClose]);

  const handleCancel = useCallback(() => {
    if (title.trim() || content.trim()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  }, [title, content, onClose]);

  const getCharacterCount = () => content.length;
  const getWordCount = () => content.trim().split(/\s+/).filter(Boolean).length;
  const getReadingTime = () => Math.max(1, Math.ceil(getWordCount() / 200));

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} size="lg">
      <ModalBackdrop />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <ModalContent className="max-w-[500px] max-h-[90%]">
          <ModalHeader>
            <VStack className="gap-1 flex-1">
              <Heading size="lg" className="text-typography-950">
                Create New Post
              </Heading>
              <Text size="sm" className="text-typography-500">
                Share your thoughts in {spaceName}
              </Text>
            </VStack>
            <ModalCloseButton onPress={handleCancel}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody className="flex-1">
            <ScrollView showsVerticalScrollIndicator={false}>
              <VStack className="gap-4">
                {/* Title Input */}
                <VStack className="gap-2">
                  <Text size="sm" className="font-medium text-typography-700">
                    Title (Optional)
                  </Text>
                  <Input variant="outline" size="md">
                    <InputField
                      placeholder="Enter a catchy title for your post..."
                      value={title}
                      onChangeText={setTitle}
                      maxLength={100}
                    />
                  </Input>
                  <Text size="xs" className="text-typography-400 text-right">
                    {title.length}/100
                  </Text>
                </VStack>

                {/* Content Input */}
                <VStack className="gap-2">
                  <Text size="sm" className="font-medium text-typography-700">
                    Content *
                  </Text>
                  <Box className="border border-outline-300 rounded-md">
                    <TextInput
                      style={{
                        minHeight: 120,
                        maxHeight: 200,
                        padding: 12,
                        fontSize: 16,
                        textAlignVertical: 'top',
                        color: '#374151',
                      }}
                      placeholder="What's on your mind? Share your thoughts, ideas, or stories..."
                      placeholderTextColor="#9CA3AF"
                      value={content}
                      onChangeText={setContent}
                      multiline
                      maxLength={5000}
                    />
                  </Box>
                  <HStack className="justify-between">
                    <Text size="xs" className="text-typography-400">
                      {getWordCount()} words • {getReadingTime()} min read
                    </Text>
                    <Text size="xs" className="text-typography-400">
                      {getCharacterCount()}/5000
                    </Text>
                  </HStack>
                </VStack>

                {/* Tags Input */}
                <VStack className="gap-2">
                  <Text size="sm" className="font-medium text-typography-700">
                    Tags (Optional)
                  </Text>
                  <Input variant="outline" size="md">
                    <InputField
                      placeholder="technology, programming, tips (comma separated)"
                      value={tags}
                      onChangeText={setTags}
                      maxLength={200}
                    />
                  </Input>
                  <Text size="xs" className="text-typography-400">
                    Add relevant tags to help others discover your post
                  </Text>
                </VStack>

                {/* Visibility Selector */}
                <VStack className="gap-2">
                  <Text size="sm" className="font-medium text-typography-700">
                    Visibility
                  </Text>
                  <VStack className="gap-2">
                    {[
                      { value: 'public', label: 'Public', desc: 'Anyone can see this post' },
                      { value: 'members_only', label: 'Members Only', desc: 'Only space members can see this post' },
                      { value: 'private', label: 'Private', desc: 'Only you and moderators can see this post' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={visibility === option.value ? 'solid' : 'outline'}
                        action={visibility === option.value ? 'primary' : 'secondary'}
                        size="sm"
                        onPress={() => setVisibility(option.value as any)}
                        className="justify-start"
                      >
                        <VStack className="items-start gap-0">
                          <ButtonText size="sm" className="font-medium">
                            {option.label}
                          </ButtonText>
                          <ButtonText size="xs" className="opacity-70">
                            {option.desc}
                          </ButtonText>
                        </VStack>
                      </Button>
                    ))}
                  </VStack>
                </VStack>

                {/* Error Display */}
                {error && (
                  <Box className="bg-error-50 border border-error-200 rounded-md p-3">
                    <Text size="sm" className="text-error-600">
                      {error}
                    </Text>
                  </Box>
                )}
              </VStack>
            </ScrollView>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              size="md"
              onPress={handleCancel}
              disabled={isCreating}
              className="flex-1"
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              variant="solid"
              action="primary"
              size="md"
              onPress={handleSubmit}
              disabled={isCreating || !content.trim() || content.trim().length < 10}
              className="flex-1"
            >
              <ButtonText>
                {isCreating ? 'Creating...' : 'Create Post'}
              </ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </KeyboardAvoidingView>
    </Modal>
  );
}
