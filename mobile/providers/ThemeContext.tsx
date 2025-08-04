import React, { createContext, useContext, useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useColorScheme as useRNColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

type ColorMode = "light" | "dark" | "system";

interface ThemeContextType {
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  isDark: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "app-theme-mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>("system");
  const [isLoading, setIsLoading] = useState(true);

  // Calculate if current mode is dark
  const isDark = colorMode === "system" 
    ? systemColorScheme === "dark" 
    : colorMode === "dark";

  // Debug log for theme state
 

  // Load theme from secure storage on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      
        
        if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
          setColorMode(savedTheme as ColorMode);
        } else {
          // If no saved theme or invalid, default to system
        
          setColorMode("system");
        }
      } catch (error) {
        // Fallback to system theme if storage fails
        setColorMode("system");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTheme();
  }, []);

  // Listen to system color scheme changes when in system mode
  useEffect(() => {
    if (colorMode === "system") {
    
    }
  }, [systemColorScheme, colorMode]);

  // Save theme to secure storage when it changes
  const handleSetColorMode = async (newMode: ColorMode) => {
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newMode);
      setColorMode(newMode);
    } catch (error) {
      // Still update state even if storage fails
      setColorMode(newMode);
    }
  };

  // Toggle between light and dark (skip system)
  const toggleColorMode = () => {
    const newMode = isDark ? "light" : "dark";
    handleSetColorMode(newMode);
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        colorMode, 
        setColorMode: handleSetColorMode, 
        toggleColorMode,
        isDark, 
        isLoading 
      }}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
