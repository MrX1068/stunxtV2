import React from 'react';
import { Image, View, Text } from 'react-native';
import { useOptimizedAvatar, OptimizedAvatarProps } from '../utils/useOptimizedAvatar';

interface AvatarProps extends OptimizedAvatarProps {
  size?: number;
  fallbackText?: string;
  borderRadius?: number;
  style?: any;
}

/**
 * Optimized Avatar component that automatically uses the best image size
 * 
 * @example
 * <Avatar src={user.avatarUrl} size={80} fallbackText={user.fullName} />
 */
export function Avatar({ 
  src, 
  size = 80, 
  fallbackText = '?',
  borderRadius,
  className,
  alt = 'Avatar',
  style,
  ...props 
}: AvatarProps) {
  // Get the optimized URL for the target size
  const optimizedUrl = useOptimizedAvatar(src, { 
    size: size <= 40 ? 'thumbnail' :
          size <= 80 ? 'small' :
          size <= 150 ? 'medium' : 
          size <= 300 ? 'large' : 'original'
  }) as string | null;

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: borderRadius ?? size / 2,
    backgroundColor: '#f0f0f0',
    ...style
  };

  const fallbackStyle = {
    ...avatarStyle,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#e1e1e1'
  };

  const textStyle = {
    fontSize: size * 0.4,
    fontWeight: '600' as const,
    color: '#666',
    textTransform: 'uppercase' as const
  };

  if (!optimizedUrl) {
    // Show fallback with initials
    const initials = fallbackText
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2);

    return (
      <View style={fallbackStyle} className={className}>
        <Text style={textStyle}>{initials}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: optimizedUrl }}
      style={avatarStyle}
      className={className}
      accessibilityLabel={alt}
      resizeMode="cover"
      onError={() => {
        // Could implement fallback on error here
      }}
      {...props}
    />
  );
}

/**
 * Avatar with multiple size variants for responsive design
 */
export function ResponsiveAvatar({ 
  src, 
  baseSize = 80,
  fallbackText = '?',
  className,
  style,
  ...props 
}: AvatarProps & { baseSize?: number }) {
  
  const responsiveUrls = useOptimizedAvatar(src) as any;
  
  if (!responsiveUrls || !src) {
    return <Avatar src={null} size={baseSize} fallbackText={fallbackText} style={style} />;
  }

  // Use picture element for responsive images (web) or regular Image for mobile
  return (
    <Image
      source={{ 
        uri: responsiveUrls.medium, // Default to medium size
        // React Native doesn't support srcSet, but we could implement size selection logic
      }}
      style={{
        width: baseSize,
        height: baseSize,
        borderRadius: baseSize / 2,
        ...style
      }}
      className={className}
      resizeMode="cover"
      {...props}
    />
  );
}
