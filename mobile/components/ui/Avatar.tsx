import React from 'react';
import { Image, View, ViewStyle, ImageStyle } from 'react-native';
import { Box } from '@/components/ui';

interface AvatarProps {
  url?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  fallback?: React.ReactNode;
}

const AVATAR_SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96,
};

/**
 * Optimized Avatar component with automatic image transformations
 */
export const Avatar: React.FC<AvatarProps> = ({
  url,
  size = 'md',
  style,
  imageStyle,
  fallback
}) => {
  const avatarSize = AVATAR_SIZES[size];
  
  const getOptimizedUrl = (originalUrl: string, targetSize: number) => {
    if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
      return originalUrl;
    }
    
    // Add Cloudinary transformations for performance
    const transforms = `w_${targetSize * 2},h_${targetSize * 2},c_fill,f_auto,q_auto`;
    return originalUrl.replace('/upload/', `/upload/${transforms}/`);
  };

  const optimizedUrl = url ? getOptimizedUrl(url, avatarSize) : null;

  const renderFallback = () => {
    if (fallback) return fallback;
    
    // Default fallback
    return (
      <Box 
        className="items-center justify-center bg-primary-100"
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
        }}
      >
        <Text className="text-primary-600" style={{ fontSize: avatarSize * 0.4 }}>
          👤
        </Text>
      </Box>
    );
  };

  if (!optimizedUrl) {
    return (
      <View style={[{ width: avatarSize, height: avatarSize }, style]}>
        {renderFallback()}
      </View>
    );
  }

  return (
    <View style={[{ width: avatarSize, height: avatarSize }, style]}>
      <Image
        source={{ uri: optimizedUrl }}
        style={[
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
          imageStyle,
        ]}
        onError={() => {
          // Could set fallback state here
          console.warn('Avatar image failed to load:', optimizedUrl);
        }}
        resizeMode="cover"
      />
    </View>
  );
};

export default Avatar;
