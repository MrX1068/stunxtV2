import React, { useState, useCallback, useEffect } from 'react';
import { View, Alert, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Button, ButtonText } from '../ui/button';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { useMemberManagement } from '../../stores/memberManagementStore';

interface SpaceInviteManagementProps {
  spaceId: string;
  spaceName: string;
  communityId: string;
  userRole: string;
}

export function SpaceInviteManagement({
  spaceId,
  spaceName,
  communityId,
  userRole,
}: SpaceInviteManagementProps) {
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

  // Filter invites to show only space-related ones (using message field to store space context)
  const spaceInvites = (communityInvites[communityId] || []).filter(invite => 
    invite.message?.includes(`space:${spaceId}`) || 
    invite.message?.includes(`Space: ${spaceName}`)
  );

  const isLoading = loadingCommunityInvites[communityId] || false;
  const canCreateInvites = ['owner', 'admin', 'moderator'].includes(userRole);

  // Fetch invites when component mounts
  useEffect(() => {
    fetchCommunityInvites(communityId);
  }, [communityId, fetchCommunityInvites]);

  // Clear generated link notification if the same link appears in active invites
  useEffect(() => {
    if (generatedLink && spaceInvites.length > 0) {
      const generatedCode = generatedLink.split('/').pop();
      const existsInActiveInvites = spaceInvites.some(invite => 
        invite.type === 'link' && invite.code === generatedCode
      );
      
      if (existsInActiveInvites) {
        setGeneratedLink(null);
      }
    }
  }, [generatedLink, spaceInvites]);

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
          valid.map(emailAddr => {
            const spaceMessage = `Space: ${spaceName} - ${message.trim() || 'Join our space!'}`;
            return createCommunityInvite(communityId, {
              type: 'email',
              email: emailAddr,
              message: spaceMessage,
            });
          })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (successful > 0) {
          Alert.alert(
            'Space Email Invites Sent!',
            `Successfully sent ${successful} invitation${successful > 1 ? 's' : ''} to "${spaceName}".${failed > 0 ? ` ${failed} failed to send.` : ''}`,
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
        // Handle link invites
        const spaceMessage = `Space: ${spaceName} - ${message.trim() || 'Join our space!'}`;

        const inviteData = {
          type: inviteType,
          message: spaceMessage,
        };

        const invite = await createCommunityInvite(communityId, inviteData);
        const inviteUrl = `https://app.stunxt.com/invite/${invite.code}`;
        setGeneratedLink(inviteUrl);

        Alert.alert(
          'Space Invite Link Created!',
          `Your invite link for "${spaceName}" has been generated.`,
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
        error.message || 'Failed to create space invite. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [inviteType, email, message, communityId, spaceName, createCommunityInvite]);

  const handleCopyLink = useCallback(async (link: string) => {
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert('Copied!', 'Space invite link copied to clipboard.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Failed to copy link:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard.', [{ text: 'OK' }]);
    }
  }, []);

  const handleShareLink = useCallback(async (link: string) => {
    try {
      await Share.share({
        message: `Join "${spaceName}" space!\n\n${link}`,
        url: link,
        title: `Join ${spaceName}`,
      });
    } catch (error) {
      console.error('Failed to share link:', error);
    }
  }, [spaceName]);

  const handleRevokeInvite = useCallback(async (inviteId: string) => {
    Alert.alert(
      'Revoke Space Invite',
      'Are you sure you want to revoke this space invite? It will no longer be usable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeCommunityInvite(communityId, inviteId);
              Alert.alert('Space Invite Revoked', 'The space invite has been revoked successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to revoke space invite.');
            }
          },
        },
      ]
    );
  }, [communityId, revokeCommunityInvite]);

  // Helper function to get invite URL
  const getInviteUrl = useCallback((code: string) => {
    return `https://app.stunxt.com/invite/${code}`;
  }, []);

  if (!canCreateInvites) {
    return (
      <View className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <Text size="sm" className="text-typography-600 text-center">
          You don't have permission to manage invites for this space.
        </Text>
      </View>
    );
  }

  return (
    <VStack className="gap-4">
      <VStack className="gap-1">
        <Text size="lg" className="font-semibold text-typography-900">
          Space Invite Management
        </Text>
        <Text size="sm" className="text-typography-500">
          Create and manage invites for "{spaceName}" space
        </Text>
      </VStack>

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

      {/* Email Input for Email Invites */}
      {inviteType === 'email' && (
        <VStack className="gap-2">
          <Text size="sm" className="font-medium text-typography-700">
            Email Addresses
          </Text>
          <Input>
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

      {/* Custom Message */}
      <VStack className="gap-2">
        <Text size="sm" className="font-medium text-typography-700">
          Custom Message (Optional)
        </Text>
        <Input>
          <InputField
            placeholder="Add a personal message..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
        </Input>
      </VStack>

      {/* Generated Link Display */}
      {generatedLink && (
        <VStack className="gap-2">
          <Text size="sm" className="font-medium text-typography-700">
            ✅ New Space Invite Link Generated
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
            This link will appear in the Active Space Invites list below and persist across app sessions
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
        disabled={creatingInvite[communityId] || (inviteType === 'email' && !email.trim())}
        className="w-full"
      >
        <ButtonText>
          {creatingInvite[communityId]
            ? 'Creating...'
            : inviteType === 'link'
              ? 'Generate Space Invite Link'
              : (() => {
                  const emailCount = email.split(',').filter(e => e.trim().length > 0).length;
                  return emailCount > 1 ? `Send Space Invites to ${emailCount} Emails` : 'Send Space Email Invite';
                })()
          }
        </ButtonText>
      </Button>

      {/* No Space Invites Message */}
      {spaceInvites.length === 0 && !isLoading && (
        <View className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <VStack className="gap-2 items-center">
            <MaterialIcons name="link" size={32} color="#6B7280" />
            <Text size="sm" className="font-medium text-typography-700 text-center">
              No Active Space Invites
            </Text>
            <Text size="xs" className="text-typography-500 text-center">
              Create your first space invite link above. Once generated, it will appear here and persist across app sessions.
            </Text>
          </VStack>
        </View>
      )}

      {/* Active Space Invites List */}
      {spaceInvites.length > 0 && (
        <VStack className="gap-3">
          <VStack className="gap-1">
            <Text size="md" className="font-medium text-typography-700">
              Active Space Invites ({spaceInvites.length})
            </Text>
            <Text size="xs" className="text-typography-500">
              These space invites persist across app sessions and remain accessible until revoked
            </Text>
          </VStack>
          <VStack className="gap-2">
            {spaceInvites.map((invite) => (
              <View
                key={invite.id}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
              >
                <VStack className="gap-2">
                  <HStack className="items-center justify-between">
                    <VStack className="flex-1">
                      <Text size="sm" className="font-medium text-typography-700">
                        {invite.type === 'email' ? invite.email : 'Space Invite Link'}
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
                      disabled={revokingInvite[`${communityId}-${invite.id}`]}
                    >
                      <ButtonText className="text-red-600">
                        {revokingInvite[`${communityId}-${invite.id}`] ? 'Revoking...' : 'Revoke'}
                      </ButtonText>
                    </Button>
                  </HStack>

                  {/* Show invite link with copy/share options for link invites */}
                  {invite.type === 'link' && (
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
  );
}
