import React, { createContext, useContext, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useColorScheme as useRNColorScheme } from "react-native";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [theme, setTheme] = useState<Theme>("system");

  const isDark = theme === "system" 
    ? systemColorScheme === "dark" 
    : theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
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
