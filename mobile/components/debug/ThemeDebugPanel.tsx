import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../providers/ThemeContext';
import { debugTheme, resetTheme, forceLight, forceDark, useSystem } from '../../utils/themeDebug';

export const ThemeDebugPanel = () => {
  const { colorMode, isDark, setColorMode } = useTheme();

  const handleDebug = async () => {
    const stored = await debugTheme();
    Alert.alert(
      '🔍 Theme Debug Info', 
      `Current Mode: ${colorMode}\nIs Dark: ${isDark}\nStored: ${stored || 'none'}`
    );
  };

  const handleReset = async () => {
    const success = await resetTheme();
    if (success) {
      // Force app to re-read theme
      setColorMode('system');
      Alert.alert('✅ Theme Reset', 'Theme has been reset to system default');
    }
  };

  return (
    <View className="p-4 bg-surface-50 dark:bg-surface-100Dark rounded-lg m-4">
      <Text className="text-lg font-bold mb-4 text-typography-900 dark:text-typography-100">
        🎨 Theme Debug Panel
      </Text>
      
      <Text className="mb-2 text-typography-700 dark:text-typography-300">
        Current: {colorMode} | Dark: {isDark ? 'Yes' : 'No'}
      </Text>

      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity 
          onPress={() => setColorMode('light')}
          className="bg-primary-500 px-3 py-2 rounded"
        >
          <Text className="text-white text-sm">☀️ Light</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setColorMode('dark')}
          className="bg-primary-600 px-3 py-2 rounded"
        >
          <Text className="text-white text-sm">🌙 Dark</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setColorMode('system')}
          className="bg-primary-700 px-3 py-2 rounded"
        >
          <Text className="text-white text-sm">📱 System</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity onPress={handleDebug} className="bg-info-500 px-3 py-2 rounded">
          <Text className="text-white text-sm">🔍 Debug</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleReset} className="bg-error-500 px-3 py-2 rounded">
          <Text className="text-white text-sm">🔄 Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
