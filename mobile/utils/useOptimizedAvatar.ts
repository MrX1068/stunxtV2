import { useMemo } from 'react';

export interface AvatarSizes {
  thumbnail: string | null;  // 40x40
  small: string | null;      // 80x80  
  medium: string | null;     // 150x150
  large: string | null;      // 300x300
  original: string | null;
}

export interface UseOptimizedAvatarOptions {
  size?: 'thumbnail' | 'small' | 'medium' | 'large' | 'original';
  fallback?: string;
}

/**
 * Hook to get optimized avatar URLs for better performance
 * 
 * @example
 * const avatarUrl = useOptimizedAvatar(user.avatarUrl, { size: 'medium' });
 * 
 * @example 
 * const allSizes = useOptimizedAvatar(user.avatarUrl);
 * // Use allSizes.medium, allSizes.thumbnail, etc.
 */
export function useOptimizedAvatar(
  originalUrl: string | null | undefined,
  options: UseOptimizedAvatarOptions = {}
): string | AvatarSizes | null {
  const { size, fallback } = options;

  return useMemo(() => {
    if (!originalUrl) {
      return size ? (fallback || null) : null;
    }

    // Check if it's a Cloudinary URL that can be optimized
    if (!originalUrl.includes('cloudinary.com')) {
      return size ? originalUrl : {
        thumbnail: originalUrl,
        small: originalUrl,
        medium: originalUrl,
        large: originalUrl,
        original: originalUrl
      };
    }

    // Generate optimized URLs
    const getOptimizedUrl = (width: number, height: number) => {
      return originalUrl.replace(
        '/upload/',
        `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`
      );
    };

    const sizes: AvatarSizes = {
      thumbnail: getOptimizedUrl(40, 40),
      small: getOptimizedUrl(80, 80),
      medium: getOptimizedUrl(150, 150),
      large: getOptimizedUrl(300, 300),
      original: originalUrl
    };

    // Return specific size or all sizes
    return size ? (sizes[size] || originalUrl) : sizes;
  }, [originalUrl, size, fallback]);
}

/**
 * Component props helper for avatar components
 */
export interface OptimizedAvatarProps {
  src: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Get the best avatar URL for a given size
 */
export function getBestAvatarUrl(
  avatarUrl: string | null | undefined,
  targetSize: number
): string | null {
  if (!avatarUrl) return null;

  // Determine the best size based on target size
  let size: keyof AvatarSizes;
  if (targetSize <= 40) size = 'thumbnail';
  else if (targetSize <= 80) size = 'small';
  else if (targetSize <= 150) size = 'medium';
  else if (targetSize <= 300) size = 'large';  
  else size = 'original';

  const optimized = useOptimizedAvatar(avatarUrl, { size });
  return optimized as string | null;
}
