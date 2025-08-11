import React, { useState, useCallback, useEffect } from 'react';
import { View, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '../ui/modal';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { useMemberManagement } from '../../stores/memberManagementStore';
import { Community } from '../../stores/community';

interface InviteManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  community: Community;
}

export function InviteManagementModal({
  isOpen,
  onClose,
  community,
}: InviteManagementModalProps) {
  const [inviteType, setInviteType] = useState<'link' | 'email'>('link');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const {
    communityInvites,
    loadingCommunityInvites,
    creatingInvite,
    revokingInvite,
    fetchCommunityInvites,
    createCommunityInvite,
    revokeCommunityInvite,
  } = useMemberManagement();

  const invites = communityInvites[community.id] || [];
  const isLoading = loadingCommunityInvites[community.id] || false;

  // Fetch invites when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCommunityInvites(community.id);
    }
  }, [isOpen, community.id, fetchCommunityInvites]);

  console.log("community invites ", invites)
  // Clear generated link notification if the same link appears in active invites
  useEffect(() => {
    if (generatedLink && invites.length > 0) {
      const generatedCode = generatedLink.split('/').pop();
      const existsInActiveInvites = invites.some(invite =>
        invite.type === 'link' && invite.code === generatedCode
      );

      if (existsInActiveInvites) {
        // Clear the notification since the link is now visible in the active invites list
        setGeneratedLink(null);
      }
    }
  }, [generatedLink, invites]);

  // Reset form when modal opens/closes (but preserve generated link)
  useEffect(() => {
    if (isOpen) {
      setInviteType('link');
      setEmail('');
      setMessage('');
      // Don't reset generatedLink - let it persist across navigation
    }
  }, [isOpen]);

  // Email validation helper
  const validateEmails = (emailString: string): { valid: string[]; invalid: string[] } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = emailString.split(',').map(e => e.trim()).filter(e => e.length > 0);

    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    return { valid, invalid };
  };

  const handleCreateInvite = useCallback(async () => {
    try {
      if (inviteType === 'email') {
        // Validate emails for email invites
        const { valid, invalid } = validateEmails(email);

        if (invalid.length > 0) {
          Alert.alert(
            'Invalid Email Addresses',
            `The following email addresses are invalid:\n${invalid.join('\n')}\n\nPlease correct them and try again.`,
            [{ text: 'OK' }]
          );
          return;
        }

        if (valid.length === 0) {
          Alert.alert(
            'No Valid Emails',
            'Please enter at least one valid email address.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Create invites for each email address
        const results = await Promise.allSettled(
          valid.map(emailAddr =>
            createCommunityInvite(community.id, {
              type: 'email',
              email: emailAddr,
              message: message.trim(),
            })
          )
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (successful > 0) {
          Alert.alert(
            'Email Invites Sent!',
            `Successfully sent ${successful} invitation${successful > 1 ? 's' : ''}.${failed > 0 ? ` ${failed} failed to send.` : ''}`,
            [{ text: 'OK' }]
          );
          setEmail('');
        } else {
          Alert.alert(
            'Failed to Send Invites',
            'All email invitations failed to send. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Handle link invites with smart management
        const existingInvites = checkExistingInvites();

        if (existingInvites.reachedLimit) {
          Alert.alert(
            'Too Many Active Invites',
            `You have ${existingInvites.count} active invite links. Please revoke some existing invites before creating new ones to keep your community organized.`,
            [{ text: 'OK' }]
          );
          return;
        }

        if (existingInvites.hasMany) {
          Alert.alert(
            'Multiple Active Invites',
            `You already have ${existingInvites.count} active invite links. Creating more may make invite management difficult. Continue?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Create Anyway',
                onPress: async () => {
                  await createLinkInvite();
                }
              }
            ]
          );
          return;
        }

        await createLinkInvite();
      }

      async function createLinkInvite() {
        const inviteData = {
          type: inviteType,
          message: message.trim(),
        };

        const invite = await createCommunityInvite(community.id, inviteData);
        const inviteUrl = `https://app.stunxt.com/invite/${invite.code}`;
        setGeneratedLink(inviteUrl);

        Alert.alert(
          'Invite Link Created!',
          'Your invite link has been generated. You can copy it or share it directly.',
          [
            { text: 'Copy Link', onPress: () => handleCopyLink(inviteUrl) },
            { text: 'Share', onPress: () => handleShareLink(inviteUrl) },
            { text: 'OK' }
          ]
        );
      }
      
      setMessage('');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to create invite. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [inviteType, email, message, community.id, createCommunityInvite]);

  const handleCopyLink = useCallback(async (link: string) => {
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert('Copied!', 'Invite link copied to clipboard.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Failed to copy link:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard.', [{ text: 'OK' }]);
    }
  }, []);

  const handleShareLink = useCallback(async (link: string) => {
    try {
      await Share.share({
        message: `Join "${community.name}" on Stunxt!\n\n${community.description || 'Join our community!'}\n\n${link}`,
        url: link,
        title: `Join ${community.name}`,
      });
    } catch (error) {
      console.error('Failed to share link:', error);
    }
  }, [community.name, community.description]);

  const handleRevokeInvite = useCallback(async (inviteId: string) => {
    Alert.alert(
      'Revoke Invite',
      'Are you sure you want to revoke this invite? It will no longer be usable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeCommunityInvite(community.id, inviteId);
              Alert.alert('Invite Revoked', 'The invite has been revoked successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke invite.');
            }
          },
        },
      ]
    );
  }, [community.id, revokeCommunityInvite]);

  // Helper function to get invite URL
  const getInviteUrl = useCallback((code: string) => {
    return `https://app.stunxt.com/invite/${code}`;
  }, []);

  // Check for existing similar invites
  const checkExistingInvites = useCallback(() => {
    const activeLinkInvites = invites.filter(invite =>
      invite.type === 'link' && invite.isActive
    );

    return {
      count: activeLinkInvites.length,
      hasMany: activeLinkInvites.length >= 3, // Show warning at 3+ invites
      reachedLimit: activeLinkInvites.length >= 5 // Hard limit at 5 invites
    };
  }, [invites]);

  const getInviteTypeDescription = () => {
    switch (community.type) {
      case 'public':
        return 'Anyone can discover and join this public community. Invite links provide a direct way to share.';
      case 'private':
        return 'Only invited members can join this private community. Generate invite links for controlled access.';
      case 'secret':
        return 'This secret community is only accessible through invite links. No public discovery allowed.';
      default:
        return 'Generate invite links to share this community with others.';
    }
  };

  const canCreateInvites = ['owner', 'admin', 'moderator'].includes(community.memberRole || '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent className="max-w-[500px] max-h-[90%]">
        <ModalHeader>
          <VStack className="gap-1 flex-1">
            <Heading size="lg" className="text-typography-950">
              Invite Management
            </Heading>
            <Text size="sm" className="text-typography-500">
              {community.name} • {community.type} community
            </Text>
          </VStack>
          <ModalCloseButton onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#6B7280" />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody className="flex-1">
          <VStack className="gap-6">
            {/* Community Type Info */}
            <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <Text size="sm" className="text-blue-700 dark:text-blue-300">
                {getInviteTypeDescription()}
              </Text>
            </View>

            {canCreateInvites ? (
              <>
                {/* Invite Type Selection */}
                <VStack className="gap-3">
                  <Text size="md" className="font-medium text-typography-700">
                    Invite Type
                  </Text>
                  <HStack className="gap-3">
                    <Button
                      variant={inviteType === 'link' ? 'solid' : 'outline'}
                      size="sm"
                      onPress={() => setInviteType('link')}
                      className="flex-1"
                    >
                      <MaterialIcons name="link" size={16} color={inviteType === 'link' ? 'white' : '#3B82F6'} />
                      <ButtonText className="ml-2">Invite Link</ButtonText>
                    </Button>
                    <Button
                      variant={inviteType === 'email' ? 'solid' : 'outline'}
                      size="sm"
                      onPress={() => setInviteType('email')}
                      className="flex-1"
                    >
                      <MaterialIcons name="email" size={16} color={inviteType === 'email' ? 'white' : '#3B82F6'} />
                      <ButtonText className="ml-2">Email Invite</ButtonText>
                    </Button>
                  </HStack>
                </VStack>

                {/* Email Input (if email type) */}
                {inviteType === 'email' && (
                  <VStack className="gap-2">
                    <Text size="sm" className="font-medium text-typography-700">
                      Email Addresses *
                    </Text>
                    <Input variant="outline" size="md">
                      <InputField
                        placeholder="Enter email addresses (comma-separated)..."
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        multiline
                        numberOfLines={2}
                      />
                    </Input>
                    <Text size="xs" className="text-typography-500">
                      Separate multiple email addresses with commas (e.g., user1@example.com, user2@example.com)
                    </Text>
                  </VStack>
                )}

                {/* Message Input */}
                <VStack className="gap-2">
                  <Text size="sm" className="font-medium text-typography-700">
                    Custom Message (Optional)
                  </Text>
                  <Input variant="outline" size="md">
                    <InputField
                      placeholder="Add a personal message..."
                      value={message}
                      onChangeText={setMessage}
                      multiline
                      numberOfLines={3}
                    />
                  </Input>
                </VStack>

                {/* Generated Link Display - Only show if just generated */}
                {generatedLink && (
                  <VStack className="gap-2">
                    <Text size="sm" className="font-medium text-typography-700">
                      ✅ New Invite Link Generated
                    </Text>
                    <View className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
                      <Text size="sm" className="text-green-800 dark:text-green-200 break-all">
                        {generatedLink}
                      </Text>
                    </View>
                    <HStack className="gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => handleCopyLink(generatedLink)}
                        className="flex-1"
                      >
                        <MaterialIcons name="content-copy" size={16} color="#3B82F6" />
                        <ButtonText className="ml-1">Copy</ButtonText>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => handleShareLink(generatedLink)}
                        className="flex-1"
                      >
                        <MaterialIcons name="share" size={16} color="#3B82F6" />
                        <ButtonText className="ml-1">Share</ButtonText>
                      </Button>
                    </HStack>
                    <Text size="xs" className="text-typography-500 text-center">
                      This link will appear in the Active Invites list below and persist across app sessions
                    </Text>
                    <Button
                      variant="link"
                      size="sm"
                      onPress={() => setGeneratedLink(null)}
                      className="self-center"
                    >
                      <ButtonText className="text-xs">Dismiss</ButtonText>
                    </Button>
                  </VStack>
                )}

                {/* Create Invite Button */}
                <Button
                  variant="solid"
                  action="primary"
                  size="md"
                  onPress={handleCreateInvite}
                  disabled={creatingInvite[community.id] || (inviteType === 'email' && !email.trim())}
                  className="w-full"
                >
                  <ButtonText>
                    {creatingInvite[community.id]
                      ? 'Creating...'
                      : inviteType === 'link'
                        ? 'Generate Invite Link'
                        : (() => {
                            const emailCount = email.split(',').filter(e => e.trim().length > 0).length;
                            return emailCount > 1 ? `Send Invites to ${emailCount} Emails` : 'Send Email Invite';
                          })()
                    }
                  </ButtonText>
                </Button>
              </>
            ) : (
              <View className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <Text size="sm" className="text-typography-600 text-center">
                  You don't have permission to create invites for this community.
                </Text>
              </View>
            )}

            {/* No Invites Message */}
            {canCreateInvites && invites.length === 0 && !isLoading && (
              <View className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <VStack className="gap-2 items-center">
                  <MaterialIcons name="link" size={32} color="#6B7280" />
                  <Text size="sm" className="font-medium text-typography-700 text-center">
                    No Active Invites
                  </Text>
                  <Text size="xs" className="text-typography-500 text-center">
                    Create your first invite link above. Once generated, it will appear here and persist across app sessions.
                  </Text>
                </VStack>
              </View>
            )}

            {/* Active Invites List */}
            {canCreateInvites && invites.length > 0 && (
              <VStack className="gap-3">
                <VStack className="gap-1">
                  <Text size="md" className="font-medium text-typography-700">
                    Active Invites ({invites.length})
                  </Text>
                  <Text size="xs" className="text-typography-500">
                    These invites persist across app sessions and remain accessible until revoked
                  </Text>
                </VStack>
                <VStack className="gap-2">
                  {invites.map((invite) => (
                    <View
                      key={invite.id}
                      className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <VStack className="gap-2">
                        <HStack className="items-center justify-between">
                          <VStack className="flex-1">
                            <Text size="sm" className="font-medium text-typography-700">
                              {invite.type === 'email' ? invite.email : 'Invite Link'}
                            </Text>
                            <Text size="xs" className="text-typography-500">
                              Created {new Date(invite.createdAt).toLocaleDateString()}
                              {invite.expiresAt && ` • Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                            </Text>
                          </VStack>
                          <Button
                            variant="outline"
                            size="sm"
                            onPress={() => handleRevokeInvite(invite.id)}
                            disabled={revokingInvite[`${community.id}-${invite.id}`]}
                          >
                            <ButtonText className="text-red-600">
                              {revokingInvite[`${community.id}-${invite.id}`] ? 'Revoking...' : 'Revoke'}
                            </ButtonText>
                          </Button>
                        </HStack>

                        {/* Show invite link with copy/share options for link invites */}
                        {invite.type !== 'email' && (
                          <VStack className="gap-2">
                            <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                              <Text size="xs" className="text-blue-800 dark:text-blue-200 break-all font-mono">
                                {getInviteUrl(invite.code)}
                              </Text>
                            </View>
                            <HStack className="gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onPress={() => handleCopyLink(getInviteUrl(invite.code))}
                                className="flex-1"
                              >
                                <MaterialIcons name="content-copy" size={14} color="#3B82F6" />
                                <ButtonText className="ml-1 text-xs">Copy Link</ButtonText>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onPress={() => handleShareLink(getInviteUrl(invite.code))}
                                className="flex-1"
                              >
                                <MaterialIcons name="share" size={14} color="#3B82F6" />
                                <ButtonText className="ml-1 text-xs">Share Link</ButtonText>
                              </Button>
                            </HStack>
                          </VStack>
                        )}
                      </VStack>
                    </View>
                  ))}
                </VStack>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            action="secondary"
            size="md"
            onPress={onClose}
            className="flex-1"
          >
            <ButtonText>Close</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
