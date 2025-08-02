import React, { useRef, useEffect } from 'react';
import { View, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/providers/ThemeContext';

interface ThemeTransitionProps {
  children: React.ReactNode;
}

const { width, height } = Dimensions.get('window');

export function ThemeTransition({ children }: ThemeTransitionProps) {
  const { isDark } = useTheme();
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate theme transition with a diagonal sweep effect
    Animated.sequence([
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isDark]);

  const overlayScale = overlayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sqrt(width * width + height * height) * 2],
  });

  const overlayOpacity = overlayAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      {/* Theme transition overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 50, // Start from top-right corner
          right: 50,
          width: overlayScale,
          height: overlayScale,
          borderRadius: overlayScale,
          backgroundColor: isDark ? '#0F0F23' : '#FFFFFF',
          opacity: overlayOpacity,
          transform: [
            { translateX: Animated.multiply(overlayScale, -0.5) },
            { translateY: Animated.multiply(overlayScale, -0.5) },
          ],
          zIndex: 1000,
        }}
      />
    </View>
  );
}

// Enhanced theme provider wrapper with transitions
export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeTransition>
      {children}
    </ThemeTransition>
  );
}
