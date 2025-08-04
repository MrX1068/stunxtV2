import { useState, useEffect } from 'react';
import { useApiStore } from '@/stores/api';
import { useAuth } from '@/stores/auth';

export interface AvatarSizes {
  thumbnail: string | null;  // 40x40
  small: string | null;      // 80x80  
  medium: string | null;     // 150x150
  large: string | null;      // 300x300
  original: string | null;
}

/**
 * Hook to fetch optimized avatar URLs from backend
 * Uses the /users/me/avatar/sizes endpoint
 */
export function useAvatarSizes(userId?: string) {
  const [avatarSizes, setAvatarSizes] = useState<AvatarSizes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiStore = useApiStore();
  const { user } = useAuth();

  const fetchAvatarSizes = async () => {
    if (!userId && !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use /users/me/avatar/sizes for current user or /users/{id}/avatar/sizes for others
      const endpoint = userId ? `/users/${userId}/avatar/sizes` : '/users/me/avatar/sizes';
      const response = await apiStore.get(endpoint);
      
      if (response.success || response.data) {
        setAvatarSizes(response.data || response);
      } else {
        setAvatarSizes(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch avatar sizes');
      setAvatarSizes(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvatarSizes();
  }, [userId, user]);

  return {
    avatarSizes,
    loading,
    error,
    refetch: fetchAvatarSizes
  };
}

/**
 * Hook for responsive avatars based on screen density
 * Perfect for high-DPI displays
 */
export function useResponsiveAvatar(avatarUrl: string | null, baseSize: number = 80) {
  return {
    // Generate responsive URLs client-side for immediate use
    srcSet: avatarUrl && avatarUrl.includes('cloudinary.com') ? {
      '1x': avatarUrl.replace('/upload/', `/upload/w_${baseSize},h_${baseSize},c_fill,f_auto,q_auto/`),
      '2x': avatarUrl.replace('/upload/', `/upload/w_${baseSize * 2},h_${baseSize * 2},c_fill,f_auto,q_auto/`),
      '3x': avatarUrl.replace('/upload/', `/upload/w_${baseSize * 3},h_${baseSize * 3},c_fill,f_auto,q_auto/`),
    } : null,
    
    // Default URL for non-responsive use
    defaultSrc: avatarUrl && avatarUrl.includes('cloudinary.com') 
      ? avatarUrl.replace('/upload/', `/upload/w_${baseSize},h_${baseSize},c_fill,f_auto,q_auto/`)
      : avatarUrl
  };
}
