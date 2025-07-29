import React from 'react';
import { Pressable } from 'react-native';
import { Box } from '@/components/ui';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeContext';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md',
  className = '' 
}) => {
  const { colorMode, toggleColorMode, isDark } = useTheme();

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
  }[size];

  return (
    <Pressable
      onPress={toggleColorMode}
      className={`
        p-2 rounded-full 
        hover:bg-background-100 
        active:bg-background-200
        ${className}
      `}
    >
      <MaterialIcons
        name={isDark ? "light-mode" : "dark-mode"}
        size={iconSize}
        color="#666"
      />
    </Pressable>
  );
};
