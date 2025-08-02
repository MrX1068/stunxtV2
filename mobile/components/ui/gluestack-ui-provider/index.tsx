import React, { useEffect } from 'react';
import { config } from './config';
import { View, ViewProps } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/overlay';
import { ToastProvider } from '@gluestack-ui/toast';
import { useColorScheme } from 'nativewind';
import { useTheme } from '../../../providers/ThemeContext';

export type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  mode,
  children,
  style,
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { isDark } = useTheme();

  // Use theme from context or fallback to prop/default
  const currentMode = mode || (isDark ? 'dark' : 'light');

  useEffect(() => {
    setColorScheme(currentMode);
  }, [currentMode, setColorScheme]);

  return (
    <View
      style={[
        config[(colorScheme === 'light' || colorScheme === 'dark' ? colorScheme : currentMode === 'dark' ? 'dark' : 'light')],
        { flex: 1, height: '100%', width: '100%' },
        style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
