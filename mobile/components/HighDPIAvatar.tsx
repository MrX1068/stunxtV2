import React from 'react';
import { Image, View, Text, PixelRatio } from 'react-native';
import { useResponsiveAvatar } from '../utils/useAvatarSizes';

interface HighDPIAvatarProps {
  src: string | null;
  size: number;
  fallbackText?: string;
  style?: any;
  className?: string;
}

/**
 * High-DPI Avatar Component
 * Automatically serves the right image density for the device screen
 * 
 * Perfect for:
 * - Premium user experiences
 * - High-resolution displays
 * - Professional profile pages
 */
export function HighDPIAvatar({ 
  src, 
  size, 
  fallbackText = '?',
  style,
  className 
}: HighDPIAvatarProps) {
  const pixelRatio = PixelRatio.get();
  const { srcSet, defaultSrc } = useResponsiveAvatar(src, size);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#f0f0f0',
    ...style
  };

  // Choose the right image based on device pixel ratio
  const getOptimalImageUrl = () => {
    if (!srcSet) return defaultSrc;
    
    if (pixelRatio >= 3) return srcSet['3x'];
    if (pixelRatio >= 2) return srcSet['2x'];
    return srcSet['1x'];
  };

  const optimalUrl = getOptimalImageUrl();

  if (!optimalUrl) {
    // Fallback UI
    const initials = fallbackText
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return (
      <View 
        style={{
          ...avatarStyle,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e1e1e1'
        }}
        className={className}
      >
        <Text style={{
          fontSize: size * 0.4,
          fontWeight: '600',
          color: '#666'
        }}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: optimalUrl }}
      style={avatarStyle}
      className={className}
      resizeMode="cover"
      onError={(error) => {
        console.warn('High-DPI avatar failed to load:', error.nativeEvent.error);
      }}
    />
  );
}

/**
 * Usage Examples:
 * 
 * // Regular avatar for lists
 * <Avatar src={user.avatarUrl} size={40} />
 * 
 * // High-DPI avatar for profile pages
 * <HighDPIAvatar src={user.avatarUrl} size={120} fallbackText={user.fullName} />
 * 
 * Performance Impact:
 * - iPhone 13 Pro (3x): Loads 360x360 image for 120px avatar
 * - Regular screens (1x): Loads 120x120 image for 120px avatar
 * - Result: Crisp images on all devices with optimal bandwidth usage
 */
