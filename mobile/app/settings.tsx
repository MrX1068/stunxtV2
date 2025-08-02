import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
} from '@/components/ui';
import { useTheme } from '@/providers/ThemeContext';
import { useAuth } from '@/stores';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemeDebugPanel } from '@/components/debug/ThemeDebugPanel';

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

function SettingItem({ 
  title, 
  description, 
  icon, 
  onPress, 
  showChevron = true,
  rightElement 
}: SettingItemProps) {
  return (
    <Pressable onPress={onPress}>
      <Box className="bg-background-50 border border-outline-200 rounded-lg p-4 mb-3">
        <HStack className="items-center justify-between">
          <HStack space="md" className="items-center flex-1">
            <Box className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center">
              <Text size="lg">{icon}</Text>
            </Box>
            
            <VStack className="flex-1">
              <Text size="md" className="font-medium text-typography-900">
                {title}
              </Text>
              {description && (
                <Text size="sm" className="text-typography-500 mt-1">
                  {description}
                </Text>
              )}
            </VStack>
          </HStack>
          
          {rightElement || (showChevron && (
            <Text className="text-typography-400">›</Text>
          ))}
        </HStack>
      </Box>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { isDark, colorMode } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const settingsItems = [
    {
      title: 'Profile Settings',
      description: 'Update your personal information',
      icon: '👤',
      onPress: () => {},
    },
    {
      title: 'Notifications',
      description: 'Manage notification preferences',
      icon: '🔔',
      onPress: () => {},
    },
    {
      title: 'Privacy & Security',
      description: 'Control your privacy settings',
      icon: '🔒',
      onPress: () => {},
    },
    {
      title: 'Help & Support',
      description: 'Get help and contact support',
      icon: '❓',
      onPress: () => {},
    },
  ];

  return (
    <View className="flex-1 bg-background-0">
      {/* Header */}
      <Box className="bg-background-0 border-b border-outline-200 pt-12 pb-4 px-6">
        <Heading size="2xl" className="font-bold text-typography-900">
          Settings
        </Heading>
        <Text className="text-typography-600 mt-1">
          Manage your account and preferences
        </Text>
      </Box>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <VStack space="lg" className="p-6">
          {/* User Info */}
          {user && (
            <Box className="bg-primary-50 border border-primary-200 rounded-xl p-4">
              <HStack space="md" className="items-center">
                <Box className="w-16 h-16 bg-primary-600 rounded-full items-center justify-center">
                  <Text size="xl" className="font-bold text-white">
                    {user.fullName.split(' ').map(name => name.charAt(0)).join('').substring(0, 2)}
                  </Text>
                </Box>
                
                <VStack className="flex-1">
                  <Text size="lg" className="font-bold text-typography-900">
                    {user.fullName}
                  </Text>
                  <Text size="sm" className="text-typography-600">
                    {user.email}
                  </Text>
                  <Text size="xs" className="text-primary-600 font-medium mt-1">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Member
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )}

          {/* Appearance Section */}
          <VStack space="md">
            <Heading size="md" className="font-semibold text-typography-900">
              Appearance
            </Heading>
            
            <Box className="bg-background-50 border border-outline-200 rounded-xl p-4">
              <VStack space="md">
                <Text size="md" className="font-medium text-typography-900">
                  Theme
                </Text>
                <Text size="sm" className="text-typography-600 mb-2">
                  Choose how the app looks on your device
                </Text>
                <HStack space="md" className="items-center">
                  <Text size="md" className="text-typography-700">
                    Theme: {colorMode === 'system' ? 'System' : colorMode === 'dark' ? 'Dark' : 'Light'}
                  </Text>
                  <ThemeToggle size="md" />
                </HStack>
              </VStack>
            </Box>
          </VStack>

          {/* 🐛 Debug Panel - only in development */}
          {__DEV__ && (
            <VStack space="md">
              <Heading size="md" className="font-semibold text-typography-900">
                🛠️ Developer Tools
              </Heading>
              <ThemeDebugPanel />
            </VStack>
          )}

          {/* General Settings */}
          <VStack space="md">
            <Heading size="md" className="font-semibold text-typography-900">
              General
            </Heading>
            
            {settingsItems.map((item, index) => (
              <SettingItem
                key={index}
                title={item.title}
                description={item.description}
                icon={item.icon}
                onPress={item.onPress}
              />
            ))}
          </VStack>

          {/* Account Actions */}
          <VStack space="md">
            <Heading size="md" className="font-semibold text-typography-900">
              Account
            </Heading>
            
            <SettingItem
              title="Sign Out"
              description="Sign out of your account"
              icon="🚪"
              onPress={handleLogout}
              showChevron={false}
              rightElement={
                <Box className="bg-error-100 px-3 py-1 rounded-full">
                  <Text size="xs" className="text-error-700 font-medium">
                    Sign Out
                  </Text>
                </Box>
              }
            />
          </VStack>

          {/* App Info */}
          <VStack space="xs" className="items-center mt-8">
            <Text size="sm" className="text-typography-500">
              StuntX Community App
            </Text>
            <Text size="xs" className="text-typography-400">
              Version 2.0.0 • Built with ❤️
            </Text>
          </VStack>
        </VStack>
      </ScrollView>
    </View>
  );
}
