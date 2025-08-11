import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useJoinRequestStore } from '../../stores/joinRequests';

/**
 * ✅ JOIN REQUEST NOTIFICATION BADGE
 * 
 * Features:
 * - Shows pending join request count for admins/moderators
 * - Auto-refreshes pending requests
 * - Professional notification badge design
 * - Click to open join request management
 */

interface JoinRequestBadgeProps {
  communityId: string;
  onPress?: () => void;
  className?: string;
}

export const JoinRequestBadge: React.FC<JoinRequestBadgeProps> = ({
  communityId,
  onPress,
  className = '',
}) => {
  const {
    fetchPendingRequests,
    getPendingCount,
    pendingRequestsLoading,
  } = useJoinRequestStore();

  const pendingCount = getPendingCount(communityId);
  const isLoading = pendingRequestsLoading[communityId] || false;

  // Auto-fetch pending requests on mount
  useEffect(() => {
    if (communityId) {
      fetchPendingRequests(communityId);
    }
  }, [communityId, fetchPendingRequests]);

  // Don't show if no pending requests
  if (pendingCount === 0 && !isLoading) {
    return null;
  }

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center space-x-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800 active:scale-95 ${className}`}
    >
      <MaterialIcons 
        name="pending-actions" 
        size={16} 
        color="#F59E0B" 
      />
      
      <Text className="text-amber-700 dark:text-amber-300 font-medium text-sm">
        {isLoading ? 'Loading...' : `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}`}
      </Text>
      
      {pendingCount > 0 && (
        <View className="bg-amber-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
          <Text className="text-white text-xs font-bold">
            {pendingCount > 99 ? '99+' : pendingCount}
          </Text>
        </View>
      )}
      
      <MaterialIcons 
        name="chevron-right" 
        size={16} 
        color="#F59E0B" 
      />
    </Pressable>
  );
};
