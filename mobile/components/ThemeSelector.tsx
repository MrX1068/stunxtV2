import React from 'react';
import { Pressable } from 'react-native';
import { Box, HStack, Text, VStack } from '@/components/ui';
import { useTheme } from '@/providers/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface ThemeOption {
  id: 'light' | 'dark' | 'system';
  label: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    iconName: 'wb-sunny',
    description: 'Light appearance'
  },
  {
    id: 'dark',
    label: 'Dark',
    iconName: 'nightlight-round',
    description: 'Dark appearance'
  },
  {
    id: 'system',
    label: 'System',
    iconName: 'smartphone',
    description: 'Follow system settings'
  }
];

interface ThemeSelectorProps {
  showDescription?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function ThemeSelector({ 
  showDescription = true, 
  orientation = 'vertical' 
}: ThemeSelectorProps) {
  const { colorMode, setColorMode, isDark, isLoading } = useTheme();

  if (isLoading) {
    return (
      <Box className="p-4">
        <Text className="text-typography-500">Loading theme...</Text>
      </Box>
    );
  }

  const handleThemeChange = (themeId: 'light' | 'dark' | 'system') => {
    setColorMode(themeId);
  };

  if (orientation === 'horizontal') {
    return (
      <HStack space="sm" className="items-center">
        {themeOptions.map((option) => {
          const isSelected = colorMode === option.id;
          
          return (
            <Pressable
              key={option.id}
              onPress={() => handleThemeChange(option.id)}
              className={`
                flex-1 p-3 rounded-lg border-2 items-center
                ${isSelected 
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900' 
                  : 'border-outline-200 bg-background-50'
                }
              `}
            >
              <MaterialIcons 
                name={option.iconName}
                size={20} 
                color={isSelected 
                  ? (isDark ? '#FFFFFF' : '#000000')
                  : (isDark ? '#A3A3A3' : '#666666')
                } 
              />
              <Text 
                size="xs" 
                className={`mt-1 font-medium ${
                  isSelected ? 'text-primary-700' : 'text-typography-600'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </HStack>
    );
  }

  return (
    <VStack space="xs">
      {themeOptions.map((option) => {
        const isSelected = colorMode === option.id;
        
        return (
          <Pressable
            key={option.id}
            onPress={() => handleThemeChange(option.id)}
            className={`
              p-4 rounded-lg border-2 
              ${isSelected 
                ? 'border-primary-600 bg-primary-50 dark:bg-primary-900' 
                : 'border-outline-200 bg-background-50'
              }
            `}
          >
            <HStack space="md" className="items-center">
              <Box 
                className={`
                  p-2 rounded-full 
                  ${isSelected 
                    ? 'bg-primary-100 dark:bg-primary-800' 
                    : 'bg-background-100'
                  }
                `}
              >
                <MaterialIcons 
                  name={option.iconName}
                  size={20} 
                  color={isSelected 
                    ? (isDark ? '#FFFFFF' : '#000000')
                    : (isDark ? '#A3A3A3' : '#666666')
                  } 
                />
              </Box>
              
              <VStack className="flex-1">
                <Text 
                  size="md" 
                  className={`font-medium ${
                    isSelected ? 'text-primary-700' : 'text-typography-900'
                  }`}
                >
                  {option.label}
                </Text>
                {showDescription && (
                  <Text 
                    size="sm" 
                    className={`${
                      isSelected ? 'text-primary-600' : 'text-typography-500'
                    }`}
                  >
                    {option.description}
                  </Text>
                )}
              </VStack>
              
              {isSelected && (
                <Box className="w-2 h-2 bg-primary-600 rounded-full" />
              )}
            </HStack>
          </Pressable>
        );
      })}
    </VStack>
  );
}

// Quick toggle button component
export function ThemeToggleButton() {
  const { toggleColorMode, isDark, isLoading } = useTheme();

  if (isLoading) return null;

  return (
    <Pressable
      onPress={toggleColorMode}
      className="p-3 rounded-full bg-background-100 border border-outline-200"
    >
      {isDark ? (
        <MaterialIcons name="wb-sunny" size={20} color="#FCD34D" />
      ) : (
        <MaterialIcons name="nightlight-round" size={20} color="#6366F1" />
      )}
    </Pressable>
  );
}

// Floating Action Button for theme toggle
export function ThemeFAB() {
  const { toggleColorMode, isDark, isLoading } = useTheme();

  if (isLoading) return null;

  return (
    <Pressable
      onPress={toggleColorMode}
      className="
        absolute bottom-6 right-6 w-14 h-14 
        bg-primary-600 rounded-full shadow-lg
        items-center justify-center
        elevation-8
      "
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }}
    >
      {isDark ? (
        <MaterialIcons name="wb-sunny" size={24} color="#FFFFFF" />
      ) : (
        <MaterialIcons name="nightlight-round" size={24} color="#FFFFFF" />
      )}
    </Pressable>
  );
}
