import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

type ColorMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  colorMode: 'system',
  toggleColorMode: () => {},
  setColorMode: () => {},
  isDark: false,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [colorMode, setColorModeState] = useState<ColorMode>('system');

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync('theme');
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setColorModeState(savedTheme as ColorMode);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  // Save theme preference
  const setColorMode = async (mode: ColorMode) => {
    try {
      await SecureStore.setItemAsync('theme', mode);
      setColorModeState(mode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
      setColorModeState(mode);
    }
  };

  const toggleColorMode = () => {
    const newMode = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(newMode);
  };

  // Determine if current theme is dark
  const isDark = colorMode === 'dark';

  const value: ThemeContextType = {
    colorMode,
    toggleColorMode,
    setColorMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
