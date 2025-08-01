# 🛠️ Troubleshooting Guide

Common issues and solutions for StunxtV2 mobile development.

## 🚨 Common Setup Issues

### **Dependencies Version Mismatch**

**Problem:** Expo warns about incompatible package versions
```
The following packages should be updated for best compatibility:
  react-dom@19.1.0 - expected version: 19.0.0
  react-native-safe-area-context@5.5.2 - expected version: 5.4.0
```

**Solutions:**
```bash
# Option 1: Fix automatically (recommended)
npx expo install --fix

# Option 2: Install specific versions
npx expo install react-dom@19.0.0 react-native-safe-area-context@5.4.0

# Option 3: Update all dependencies
npx expo install --check
```

### **Metro Bundler Cache Issues**

**Problem:** App shows outdated code or strange errors after changes

**Solutions:**
```bash
# Clear Metro cache
npx expo start --clear

# Clear all caches
npx expo start --clear --reset-cache

# Clear npm cache (if needed)
npm cache clean --force
```

### **Node Modules Issues**

**Problem:** Package installation errors or module resolution issues

**Solutions:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear npm cache first
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **TypeScript Configuration Issues**

**Problem:** TypeScript can't find modules or types

**Solutions:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Regenerate Expo types
npx expo customize tsconfig.json

# Clear TypeScript cache
rm -rf .expo/types
npx expo start
```

## 📱 Platform-Specific Issues

### **iOS Issues**

#### **Simulator Won't Start**
```bash
# List available simulators
xcrun simctl list devices

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Reset simulator if corrupted
xcrun simctl erase "iPhone 15 Pro"
```

#### **Xcode Build Failures**
```bash
# Clean Xcode build folder
cd ios && xcodebuild clean

# Reset CocoaPods
cd ios && rm -rf Pods Podfile.lock
pod install
```

#### **Code Signing Issues**
```bash
# Check provisioning profiles
security find-identity -v -p codesigning

# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### **Android Issues**

#### **Emulator Won't Start**
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_4_API_30

# Cold boot emulator
emulator -avd Pixel_4_API_30 -wipe-data
```

#### **Gradle Build Issues**
```bash
# Clean Gradle build
cd android && ./gradlew clean

# Clear Gradle cache
cd android && rm -rf .gradle build
./gradlew clean build
```

#### **SDK/NDK Issues**
```bash
# Check Android SDK location
echo $ANDROID_HOME

# Install missing SDK components
sdkmanager "platforms;android-33" "build-tools;33.0.0"
```

## 🔧 Development Issues

### **Hot Reload Not Working**

**Problem:** Changes don't reflect immediately in the app

**Solutions:**
```bash
# Enable Fast Refresh (default in Expo)
# Shake device → "Enable Fast Refresh"

# Restart Metro bundler
npx expo start --clear

# Check if files are being watched
# Ensure files are in the correct directory structure
```

### **App Crashes on Startup**

**Problem:** App crashes immediately after opening

**Debugging Steps:**
```bash
# Check Metro logs
npx expo start --dev-client

# View device logs
# iOS: Xcode → Devices → View Device Logs
# Android: adb logcat

# Check for JavaScript errors
# Open Chrome DevTools → Sources → Pause on exceptions
```

### **Network Requests Failing**

**Problem:** API calls return network errors

**Solutions:**
```typescript
// Check API URL configuration
console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);

// Add network security config for Android (if using HTTP in dev)
// android/app/src/main/res/xml/network_security_config.xml
```

### **Image Loading Issues**

**Problem:** Images don't load or appear broken

**Solutions:**
```typescript
// Use Expo Image instead of React Native Image
import { Image } from 'expo-image';

// Add error handling
<Image
  source={{ uri: imageUrl }}
  onError={(error) => console.log('Image error:', error)}
  placeholder="image-placeholder-hash"
/>

// Check image URL accessibility
fetch(imageUrl).then(response => console.log(response.status));
```

## 🗃️ State Management Issues

### **Zustand State Not Persisting**

**Problem:** User state is lost on app restart

**Solutions:**
```typescript
// Ensure persist middleware is properly configured
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### **TanStack Query Not Caching**

**Problem:** API calls are made on every component mount

**Solutions:**
```typescript
// Check query configuration
export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: fetchCommunities,
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 10 * 60 * 1000,      // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,   // Disable refetch on focus
  });
}

// Check if QueryClient is properly configured
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});
```

## 🎨 UI & Styling Issues

### **NativeWind Classes Not Working**

**Problem:** Tailwind classes don't apply styles

**Solutions:**
```bash
# Check Tailwind configuration
cat tailwind.config.js

# Ensure content paths include your files
content: [
  "app/**/*.{tsx,jsx,ts,js}",
  "components/**/*.{tsx,jsx,ts,js}",
  "providers/**/*.{js,jsx,ts,tsx}",
]

# Regenerate CSS
rm global.css
npx tailwindcss -o global.css
```

### **Dark Mode Not Switching**

**Problem:** Dark mode toggle doesn't change app appearance

**Solutions:**
```typescript
// Check theme provider setup
import { useColorScheme } from 'react-native';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

function App() {
  const colorScheme = useColorScheme();
  
  return (
    <GluestackUIProvider mode={colorScheme ?? 'light'}>
      {/* App content */}
    </GluestackUIProvider>
  );
}

// Ensure dark mode classes are applied
<View className="bg-white dark:bg-gray-900">
  <Text className="text-black dark:text-white">
    This text should change color
  </Text>
</View>
```

### **Fonts Not Loading**

**Problem:** Custom fonts don't appear correctly

**Solutions:**
```typescript
// Check font loading in app/_layout.tsx
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <Stack />;
}
```

## 🔐 Authentication Issues

### **Secure Store Not Working**

**Problem:** SecureStore throws errors or doesn't persist data

**Solutions:**
```typescript
// Add error handling
import * as SecureStore from 'expo-secure-store';

async function storeToken(token: string) {
  try {
    await SecureStore.setItemAsync('accessToken', token);
  } catch (error) {
    console.error('Failed to store token:', error);
    // Fallback to AsyncStorage for web
    if (Platform.OS === 'web') {
      localStorage.setItem('accessToken', token);
    }
  }
}

// Check if SecureStore is available
const isSecureStoreAvailable = SecureStore.isAvailableAsync();
```

### **JWT Token Expired**

**Problem:** API returns 401 errors for authenticated requests

**Solutions:**
```typescript
// Implement token refresh logic
class ApiService {
  async request(url: string, options: RequestInit = {}) {
    let token = await SecureStore.getItemAsync('accessToken');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    
    if (response.status === 401) {
      // Try to refresh token
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (refreshToken) {
        try {
          const newToken = await this.refreshAccessToken(refreshToken);
          await SecureStore.setItemAsync('accessToken', newToken);
          
          // Retry original request
          return this.request(url, options);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          useAuth.getState().logout();
          throw new Error('Session expired');
        }
      }
    }
    
    return response;
  }
}
```

## 📱 Performance Issues

### **App Feels Slow/Laggy**

**Problem:** Animations are choppy or app feels unresponsive

**Solutions:**
```typescript
// Enable Hermes (should be default in React Native 0.70+)
// Check metro.config.js for Hermes configuration

// Use FlashList for large lists instead of FlatList
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  estimatedItemSize={100}
  keyExtractor={(item) => item.id}
/>

// Optimize images
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>

// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexView data={data} />;
});
```

### **Large Bundle Size**

**Problem:** App takes long to load or install

**Solutions:**
```bash
# Analyze bundle size
npx expo-bundle-analyzer

# Remove unused dependencies
npm uninstall unused-package

# Enable tree shaking
# Ensure imports are specific
import { Button } from '@/components/ui/button';
// Instead of: import { Button } from '@/components/ui';
```

## 🧪 Testing Issues

### **Tests Failing to Run**

**Problem:** Jest tests throw errors or don't execute

**Solutions:**
```bash
# Clear Jest cache
npx jest --clearCache

# Check Jest configuration
cat jest.config.js

# Install missing test dependencies
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

### **Mocking Issues**

**Problem:** Modules can't be mocked properly

**Solutions:**
```typescript
// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));
```

## 🔔 Push Notifications Issues

### **Notifications Not Receiving**

**Problem:** Push notifications don't arrive on device

**Solutions:**
```typescript
// Check notification permissions
import * as Notifications from 'expo-notifications';

const { status } = await Notifications.getPermissionsAsync();
if (status !== 'granted') {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Notification permissions denied');
    return;
  }
}

// Register for push notifications token
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-project-id',
});

// Test notification locally
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Test Notification',
    body: 'This is a test notification',
  },
  trigger: { seconds: 1 },
});
```

## 🌐 Web Platform Issues

### **Web Build Fails**

**Problem:** `npm run web` throws errors

**Solutions:**
```bash
# Install web-specific dependencies
npx expo install react-dom react-native-web

# Check metro.config.js for web platform support
# Ensure babel.config.js includes web platform
```

### **Web-Specific Styling Issues**

**Problem:** Styles look different on web

**Solutions:**
```typescript
// Use platform-specific styles
import { Platform } from 'react-native';

<View
  className={`p-4 ${Platform.OS === 'web' ? 'max-w-md mx-auto' : ''}`}
>
  {/* Content */}
</View>

// Create web-specific components
// components/Button.web.tsx (web-specific)
// components/Button.tsx (native)
```

## 🆘 Getting Help

### **Debug Information to Collect**

When asking for help, please provide:

```bash
# System information
node --version
npm --version
npx expo --version

# Project information
cat package.json | grep version
cat app.json | grep -A 5 expo

# Error logs
npx expo start --dev-client 2>&1 | tee debug.log

# Dependency tree
npm list --depth=1
```

### **Useful Commands for Debugging**

```bash
# Reset everything
npx expo start --clear --reset-cache
rm -rf node_modules package-lock.json && npm install

# Check project health
npx expo doctor
npx expo install --check

# Debug bundle
npx expo export --dump-sourcemap
npx expo-bundle-analyzer

# Check TypeScript
npx tsc --noEmit --skipLibCheck
```

### **Community Resources**

- 🔗 [Expo Discord](https://discord.gg/4gtbPAdpaE) - Real-time help
- 🔗 [Stack Overflow](https://stackoverflow.com/questions/tagged/expo) - Q&A
- 🔗 [Expo Forums](https://forums.expo.dev/) - Community discussions
- 🔗 [React Native Discord](https://discord.gg/react-native) - React Native specific

### **Reporting Bugs**

When reporting bugs to the team:

1. **Search existing issues** first
2. **Provide minimal reproduction** steps
3. **Include environment information**
4. **Add relevant error logs**
5. **Mention expected vs actual behavior**

**Bug Report Template:**
```markdown
## Bug Description
Brief description of the issue

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. iOS 17.0, Android 13]
- Device: [e.g. iPhone 15, Pixel 7]
- App Version: [e.g. 1.0.0]
- Expo SDK: [e.g. 53.0.20]

## Error Logs
```
Paste error logs here
```

## Additional Context
Any other context about the problem
```

---

## 🎯 Prevention Tips

1. **Keep dependencies updated** regularly
2. **Test on multiple platforms** during development
3. **Use TypeScript** for better error catching
4. **Clear caches** when things get weird
5. **Read error messages** carefully - they often contain the solution
6. **Use development builds** for better debugging
7. **Keep backups** of working configurations

---

Remember: Most issues have been encountered by others before. Don't hesitate to search for solutions online or ask the community for help! 🚀