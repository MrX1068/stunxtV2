import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SpaceInfoScreen } from '../../../components/details/SpaceInfoScreen';
import { useCommunitySpaceStore } from '../../../stores/communitySpace';
import { Text } from '../../../components/ui/text';
import { Button, ButtonText } from '../../../components/ui/button';

/**
 * ✅ SPACE INFO ROUTE
 * 
 * Dedicated screen route for space information following Telegram/WhatsApp patterns
 * Route: /space-info/[communityId]/[spaceId]
 * 
 * Features:
 * - Full-screen space info display
 * - Member management with RBAC
 * - Professional navigation with back button
 * - Proper route-based navigation (not modal)
 */

export default function SpaceInfoRoute() {
  const { communityId, spaceId, spaceData } = useLocalSearchParams<{
    communityId: string;
    spaceId: string;
    spaceData?: string;
  }>();
  
  const { communitySpaces, fetchSpaceById } = useCommunitySpaceStore();
  const [space, setSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch space data
  useEffect(() => {
    const loadSpace = async () => {
      if (!communityId || !spaceId) {
        setError('Community ID and Space ID are required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // ✅ OPTIMIZATION: First try to use passed space data
        if (spaceData) {
          try {
            const parsedSpace = JSON.parse(spaceData);
            setSpace(parsedSpace);
            setLoading(false);
            console.log('✅ [SpaceInfoRoute] Using passed space data (no API call needed)');
            return;
          } catch (parseError) {
            console.warn('⚠️ [SpaceInfoRoute] Failed to parse passed space data, falling back to API');
          }
        }

        // Second, check if space is already in store
        const spaces = communitySpaces[communityId] || [];
        const existingSpace = spaces.find(s => s.id === spaceId);
        if (existingSpace) {
          setSpace(existingSpace);
          setLoading(false);
          console.log('✅ [SpaceInfoRoute] Using cached space data');
          return;
        }

        // Last resort: Fetch space from API
        console.log('🔄 [SpaceInfoRoute] Fetching space from API (fallback)');
        const fetchedSpace = await fetchSpaceById(communityId, spaceId);
        if (fetchedSpace) {
          setSpace(fetchedSpace);
        } else {
          setError('Space not found');
        }
      } catch (err: any) {
        console.error('❌ [SpaceInfoRoute] Failed to load space:', err);
        setError(err.message || 'Failed to load space information');
      } finally {
        setLoading(false);
      }
    };

    loadSpace();
  }, [communityId, spaceId, spaceData, communitySpaces, fetchSpaceById]);

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
  if (error || !space) {
    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center p-6">
        <Text className="text-lg font-medium text-red-600 dark:text-red-400 text-center mb-4">
          {error || 'Space not found'}
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

  // Render space info screen
  return (
    <SpaceInfoScreen 
      space={space} 
      communityId={communityId!}
      onClose={handleClose}
    />
  );
}
