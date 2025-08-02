// 🔧 Theme Debug & Reset Utility
// Run this to check/reset your theme data

import * as SecureStore from "expo-secure-store";

export const debugTheme = async () => {
  try {
    const storedTheme = await SecureStore.getItemAsync("app-theme-mode");
    console.log("🔍 Current stored theme:", storedTheme);
    return storedTheme;
  } catch (error) {
    console.error("❌ Error reading theme:", error);
    return null;
  }
};

export const resetTheme = async () => {
  try {
    await SecureStore.deleteItemAsync("app-theme-mode");
    console.log("✅ Theme reset successfully - will use system default");
    return true;
  } catch (error) {
    console.error("❌ Error resetting theme:", error);
    return false;
  }
};

export const setTheme = async (mode: 'light' | 'dark' | 'system') => {
  try {
    await SecureStore.setItemAsync("app-theme-mode", mode);
    console.log(`✅ Theme set to: ${mode}`);
    return true;
  } catch (error) {
    console.error("❌ Error setting theme:", error);
    return false;
  }
};

// Quick functions to call from console
export const forceLight = () => setTheme('light');
export const forceDark = () => setTheme('dark');
export const useSystem = () => setTheme('system');
