import React, { useEffect } from 'react';
import { config } from './config';
import { View, ViewProps, useColorScheme as useRNColorScheme } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/overlay';
import { ToastProvider } from '@gluestack-ui/toast';
import { useColorScheme } from 'nativewind';

export type ModeType = 'light' | 'dark' | 'system';

export function GluestackUIProvider({
  mode = 'system',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const systemColorScheme = useRNColorScheme();

  useEffect(() => {
    if (mode === 'system') {
      // Use system color scheme
      setColorScheme(systemColorScheme || 'light');
    } else {
      setColorScheme(mode);
    }
  }, [mode, systemColorScheme, setColorScheme]);

  const currentScheme = mode === 'system' ? (systemColorScheme || 'light') : mode;

  return (
    <View
      style={[
        config[currentScheme],
        { flex: 1, height: '100%', width: '100%' },
        props.style,
      ]}
    >
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
