import React, { useRef } from 'react';
import { Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Box, HStack, Text } from '@/components/ui';
import { useTheme } from '@/providers/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: 'default' | 'compact' | 'professional';
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ 
  showLabel = true, 
  variant = 'default',
  size = 'md'
}: ThemeToggleProps) {
  const { isDark, toggleColorMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotation animation
    Animated.timing(rotateAnim, {
      toValue: isDark ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    toggleColorMode();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getSizeStyles = () => {
    switch (size) {
      case 'sm': return { iconSize: 18, padding: 8 };
      case 'lg': return { iconSize: 28, padding: 16 };
      default: return { iconSize: 24, padding: 12 };
    }
  };

  const { iconSize, padding } = getSizeStyles();

  if (variant === 'compact') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate }] }}>
        <Pressable onPress={handlePress}>
          <Box 
            className={`p-2 rounded-full ${
              isDark 
                ? 'bg-gray-800 border border-gray-700' 
                : 'bg-white border border-gray-200'
            } shadow-sm`}
          >
            <MaterialIcons 
              name={isDark ? 'dark-mode' : 'light-mode'} 
              size={iconSize} 
              color={isDark ? '#F59E0B' : '#6366F1'} 
            />
          </Box>
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === 'professional') {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable onPress={handlePress}>
          <Box 
            className={`px-4 py-2 rounded-xl border ${
              isDark 
                ? 'bg-gray-800 border-gray-600 shadow-lg' 
                : 'bg-white border-gray-200 shadow-md'
            }`}
          >
            <HStack space="sm" className="items-center">
              <Animated.View style={{ transform: [{ rotate }] }}>
                <MaterialIcons 
                  name={isDark ? 'dark-mode' : 'light-mode'} 
                  size={iconSize} 
                  color={isDark ? '#F59E0B' : '#6366F1'} 
                />
              </Animated.View>
              {showLabel && (
                <Text 
                  size="sm" 
                  className={`font-medium ${
                    isDark ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  {isDark ? 'Dark' : 'Light'} Mode
                </Text>
              )}
            </HStack>
          </Box>
        </Pressable>
      </Animated.View>
    );
  }

  // Default variant
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPress={handlePress}>
        <Box 
          className={`p-${padding / 4} rounded-2xl ${
            isDark 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
              : 'bg-gradient-to-br from-white to-gray-50 border border-gray-200'
          } shadow-lg`}
        >
          <HStack space="md" className="items-center">
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Box 
                className={`p-2 rounded-xl ${
                  isDark ? 'bg-amber-100' : 'bg-primary-100'
                }`}
              >
                <MaterialIcons 
                  name={isDark ? 'dark-mode' : 'light-mode'} 
                  size={iconSize} 
                  color={isDark ? '#F59E0B' : '#6366F1'} 
                />
              </Box>
            </Animated.View>
            {showLabel && (
              <Text 
                size="md" 
                className={`font-semibold ${
                  isDark ? 'text-gray-100' : 'text-gray-800'
                }`}
              >
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            )}
          </HStack>
        </Box>
      </Pressable>
    </Animated.View>
  );
}

// Advanced theme toggle with slide transition effect
export function ThemeSlideToggle() {
  const { isDark, toggleColorMode } = useTheme();
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isDark ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDark, slideAnim]);

  const handlePress = () => {
    toggleColorMode();
  };

  const slidePosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 36],
  });

  const backgroundColor = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E5E7EB', '#374151'],
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View 
        className="w-16 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 justify-center relative"
        style={{ backgroundColor }}
      >
        <Animated.View
          className="absolute w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center"
          style={{ left: slidePosition }}
        >
          <MaterialIcons 
            name={isDark ? 'dark-mode' : 'light-mode'} 
            size={16} 
            color={isDark ? '#F59E0B' : '#3B82F6'} 
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}
