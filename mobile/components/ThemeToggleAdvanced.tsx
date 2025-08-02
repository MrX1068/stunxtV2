import React, { useRef, useEffect } from 'react';
import { Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Box, HStack } from '@/components/ui';
import { useTheme } from '@/providers/ThemeContext';

export function ThemeToggleAdvanced() {
  const { isDark, toggleColorMode } = useTheme();
  const slideAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [isDark]);

  const handlePress = () => {
    // Scale animation for press feedback
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    toggleColorMode();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPress={handlePress}>
        <Box className="relative w-14 h-8 bg-gray-200 dark:bg-gray-700 rounded-full p-1 shadow-inner">
          {/* Toggle Track */}
          <Box className="absolute inset-1 flex-row justify-between items-center px-1">
            <MaterialIcons 
              name="wb-sunny" 
              size={14} 
              color={isDark ? "#9CA3AF" : "#F59E0B"} 
            />
            <MaterialIcons 
              name="nightlight-round" 
              size={14} 
              color={isDark ? "#6366F1" : "#9CA3AF"} 
            />
          </Box>
          
          {/* Toggle Knob */}
          <Animated.View
            className="w-6 h-6 bg-white shadow-lg rounded-full items-center justify-center"
            style={{
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 24],
                  }),
                },
              ],
            }}
          >
            <MaterialIcons 
              name={isDark ? "nightlight-round" : "wb-sunny"} 
              size={12} 
              color={isDark ? "#6366F1" : "#F59E0B"} 
            />
          </Animated.View>
        </Box>
      </Pressable>
    </Animated.View>
  );
}

export function ThemeToggleCompact() {
  const { isDark, toggleColorMode } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Rotation animation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });

    toggleColorMode();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={{
          transform: [
            {
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }),
            },
          ],
        }}
      >
        <Box className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center shadow-md">
          <MaterialIcons 
            name={isDark ? "light-mode" : "dark-mode"} 
            size={20} 
            color={isDark ? "#F59E0B" : "#6366F1"} 
          />
        </Box>
      </Animated.View>
    </Pressable>
  );
}
