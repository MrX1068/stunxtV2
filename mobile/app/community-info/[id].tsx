import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CommunityInfoScreen } from '../../components/details/CommunityInfoScreen';
import { useCommunityStore } from '../../stores/community';
import { Text } from '../../components/ui/text';
import { Button, ButtonText } from '../../components/ui/button';

/**
 * ✅ COMMUNITY INFO ROUTE
 * 
 * Dedicated screen route for community information following Telegram/WhatsApp patterns
 * Route: /community-info/[id]
 * 
 * Features:
 * - Full-screen community info display
 * - Member management with RBAC
 * - Professional navigation with back button
 * - Proper route-based navigation (not modal)
 */

export default function CommunityInfoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchCommunityById } = useCommunityStore();
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Always fetch fresh community data with current user's role
  useEffect(() => {
    const loadCommunity = async () => {
      if (!id) {
        setError('Community ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 [CommunityInfoRoute] Fetching fresh community data with user role');

        // Always fetch fresh data to ensure we have current memberRole
        const freshCommunity = await fetchCommunityById(id, true); // Force refresh

        if (freshCommunity) {
          setCommunity(freshCommunity);
          console.log('✅ [CommunityInfoRoute] Loaded community with role:', freshCommunity.memberRole);
        } else {
          setError('Community not found');
        }
      } catch (err: any) {
        console.error('❌ [CommunityInfoRoute] Failed to load community:', err);
        setError(err.message || 'Failed to load community information');
      } finally {
        setLoading(false);
      }
    };

    loadCommunity();
  }, [id, fetchCommunityById]);

  // Handle close/back navigation
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Error state
  if (error || !community) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center p-6">
        <Text className="text-lg font-medium text-red-600 dark:text-red-400 text-center mb-4">
          {error || 'Community not found'}
        </Text>
        <Button
          variant="outline"
          size="md"
          onPress={handleClose}
        >
          <ButtonText>Go Back</ButtonText>
        </Button>
      </View>
    );
  }

  // Render community info screen
  return (
    <CommunityInfoScreen 
      community={community} 
      onClose={handleClose}
    />
  );
}
