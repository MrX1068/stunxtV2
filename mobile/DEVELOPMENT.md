# 🛠️ Development Guide

Complete guide for developers working on the StunxtV2 mobile application.

## 🚀 Development Environment Setup

### **Prerequisites**

#### **Required Software**
```bash
# Node.js (LTS version recommended)
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# Git
git --version

# Expo CLI
npm install -g @expo/cli
```

#### **Platform-Specific Setup**

**For iOS Development (macOS only):**
```bash
# Install Xcode from Mac App Store
# Install Xcode Command Line Tools
xcode-select --install

# Install iOS Simulator (included with Xcode)
# Verify installation
xcrun simctl list devices
```

**For Android Development:**
```bash
# Install Android Studio
# Set up Android SDK (API 33+)
# Create Android Virtual Device (AVD)

# Set environment variables
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### **Project Setup**

1. **Clone and Navigate**
   ```bash
   git clone <repository-url>
   cd stunxtV2/mobile
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   
   # Edit with your local settings
   nano .env.local
   ```

4. **Start Development Server**
   ```bash
   npm start
   ```

## 📁 Project Structure Deep Dive

### **App Directory (`app/`)**
File-based routing with Expo Router:

```
app/
├── _layout.tsx              # Root layout with providers
├── index.tsx                # Welcome/landing screen
├── onboarding.tsx           # User onboarding flow
├── settings.tsx             # App settings
│
├── (tabs)/                  # Tab navigation group
│   ├── _layout.tsx          # Tab bar configuration
│   ├── home.tsx             # Dashboard/home feed
│   ├── communities.tsx      # Communities list
│   ├── messages.tsx         # Messages inbox
│   ├── events.tsx           # Events calendar
│   └── profile.tsx          # User profile
│
├── auth/                    # Authentication flow
│   ├── _layout.tsx          # Auth-specific layout
│   ├── welcome.tsx          # Auth welcome screen
│   ├── login.tsx            # Login form
│   ├── register.tsx         # Registration form
│   ├── forgot-password.tsx  # Password reset
│   ├── otp-verification.tsx # OTP verification
│   └── profile-setup.tsx    # Post-registration setup
│
├── community/               # Community features
│   ├── [id].tsx             # Community detail (dynamic route)
│   ├── settings.tsx         # Community settings
│   └── members.tsx          # Community members
│
├── create-community.tsx     # Community creation modal
├── create-space.tsx         # Space creation modal
└── ...
```

### **Components Directory (`components/`)**

```
components/
├── ui/                      # Base UI components
│   ├── box/                 # Layout components
│   ├── button/              # Button variants
│   ├── input/               # Form inputs
│   ├── text/                # Typography
│   ├── modal/               # Modal dialogs
│   └── index.ts             # Barrel exports
│
├── forms/                   # Form components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── CommunityForm.tsx
│
├── community/               # Community-specific components
│   ├── CommunityCard.tsx
│   ├── CommunityHeader.tsx
│   ├── MemberAvatar.tsx
│   └── PostCard.tsx
│
├── common/                  # Common/shared components
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   ├── EmptyState.tsx
│   └── Avatar.tsx
│
├── ThemeSelector.tsx        # Theme switching
└── ThemeToggle.tsx          # Dark/light toggle
```

### **Stores Directory (`stores/`)**

State management with Zustand:

```
stores/
├── index.ts                 # Store exports
├── auth.ts                  # Authentication state
├── api.ts                   # API configuration
├── posts.ts                 # Posts/content state
├── communities.ts           # Communities state
├── messages.ts              # Messages state
└── settings.ts              # App settings state
```

## 🎨 UI Development Guidelines

### **Using Gluestack UI Components**

```tsx
// ✅ Good: Use pre-built components
import { VStack, HStack, Box, Button, Text } from "@/components/ui";

function ProfileCard({ user }: { user: User }) {
  return (
    <Box className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <HStack className="items-center gap-3">
        <Avatar source={{ uri: user.avatar }} size="md" />
        <VStack className="flex-1">
          <Text className="font-semibold text-lg">{user.name}</Text>
          <Text className="text-gray-600">{user.bio}</Text>
        </VStack>
        <Button size="sm" variant="outline">
          <ButtonText>Follow</ButtonText>
        </Button>
      </HStack>
    </Box>
  );
}

// ❌ Avoid: Custom styling that breaks consistency
function ProfileCard({ user }: { user: User }) {
  return (
    <View style={{ 
      backgroundColor: '#ff0000', // Custom colors
      padding: 15,               // Non-standard spacing
      borderRadius: 5,           // Non-standard radius
    }}>
      {/* ... */}
    </View>
  );
}
```

### **NativeWind Best Practices**

```tsx
// ✅ Good: Use semantic classes
<View className="flex-1 bg-background-0 p-4">
  <Text className="text-typography-900 dark:text-typography-100">
    This text adapts to theme changes
  </Text>
</View>

// ✅ Good: Responsive design
<View className="p-4 md:p-6 lg:p-8">
  <Text className="text-lg md:text-xl lg:text-2xl">
    Responsive text
  </Text>
</View>

// ✅ Good: Dark mode support
<Button className="bg-primary-500 dark:bg-primary-600">
  <ButtonText className="text-white">Submit</ButtonText>
</Button>

// ❌ Avoid: Hardcoded colors
<View style={{ backgroundColor: '#3b82f6' }}>
  <Text style={{ color: '#ffffff' }}>Submit</Text>
</View>
```

### **Component Naming Conventions**

```tsx
// ✅ Good: PascalCase for components
function CommunityCard() {}
function UserProfile() {}
function MessageBubble() {}

// ✅ Good: Descriptive names
function LoadingSpinner() {}
function ErrorBoundary() {} 
function EmptyState() {}

// ❌ Avoid: Generic names
function Card() {}      // Too generic
function Component() {} // Not descriptive
function Item() {}      // Unclear purpose
```

## 🗃️ State Management Patterns

### **Zustand Store Creation**

```typescript
// stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  
  // Private actions (don't expose in interface)
  _setUser: (user: User | null) => void;
  _setLoading: (loading: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      // Actions
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await api.login(credentials);
          await SecureStore.setItemAsync('accessToken', response.accessToken);
          set({ 
            user: response.user, 
            isAuthenticated: true,
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      logout: async () => {
        await SecureStore.deleteItemAsync('accessToken');
        set({ user: null, isAuthenticated: false });
      },
      
      updateProfile: async (data) => {
        const user = get().user;
        if (!user) return;
        
        const updatedUser = await api.updateProfile(user.id, data);
        set({ user: updatedUser });
      },
      
      // Private actions
      _setUser: (user) => set({ user, isAuthenticated: !!user }),
      _setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### **TanStack Query Patterns**

```typescript
// hooks/useCommunities.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query hook
export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const response = await api.get('/communities');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}

// Infinite query for pagination
export function useCommunitiesPaginated() {
  return useInfiniteQuery({
    queryKey: ['communities', 'paginated'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get(`/communities?page=${pageParam}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });
}

// Mutation hook
export function useCreateCommunity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCommunityData) => {
      const response = await api.post('/communities', data);
      return response.data;
    },
    onSuccess: (newCommunity) => {
      // Update communities list
      queryClient.setQueryData(['communities'], (old: Community[]) => [
        newCommunity,
        ...old,
      ]);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user', 'communities'] });
    },
    onError: (error) => {
      // Handle error (show toast, etc.)
      console.error('Failed to create community:', error);
    },
  });
}
```

## 🔄 Real-Time Development

### **WebSocket Integration**

```typescript
// services/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(userId: string) {
    if (this.socket?.connected) return;
    
    this.socket = io(process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001', {
      auth: {
        userId,
      },
      transports: ['websocket'],
    });
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.reconnectAttempts = 0;
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.handleReconnection();
    });
    
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    }
  }
  
  joinCommunity(communityId: string) {
    this.socket?.emit('join-community', communityId);
  }
  
  leaveCommunity(communityId: string) {
    this.socket?.emit('leave-community', communityId);
  }
  
  sendMessage(communityId: string, message: string) {
    this.socket?.emit('send-message', {
      communityId,
      message,
      timestamp: new Date().toISOString(),
    });
  }
  
  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new-message', callback);
  }
  
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
```

### **Real-Time Hooks**

```typescript
// hooks/useRealTimeMessages.ts
export function useRealTimeMessages(communityId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user || !communityId) return;
    
    // Connect and join community
    socketService.connect(user.id);
    socketService.joinCommunity(communityId);
    
    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      queryClient.setQueryData(['messages', communityId], (old: Message[]) => {
        if (!old) return [message];
        return [...old, message];
      });
      
      // Show notification if app is in background
      if (AppState.currentState !== 'active') {
        Notifications.scheduleNotificationAsync({
          content: {
            title: message.author.name,
            body: message.content,
            data: { communityId, messageId: message.id },
          },
          trigger: null,
        });
      }
    };
    
    socketService.onNewMessage(handleNewMessage);
    
    // Cleanup
    return () => {
      socketService.leaveCommunity(communityId);
      socketService.socket?.off('new-message', handleNewMessage);
    };
  }, [communityId, user?.id, queryClient]);
}
```

## 🧪 Testing Guidelines

### **Unit Testing Components**

```typescript
// __tests__/components/CommunityCard.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommunityCard } from '@/components/community/CommunityCard';

// Test utilities
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('CommunityCard', () => {
  const mockCommunity = {
    id: '1',
    name: 'Test Community',
    description: 'A test community',
    memberCount: 150,
    isJoined: false,
  };
  
  it('renders community information correctly', () => {
    const { getByText } = renderWithProviders(
      <CommunityCard community={mockCommunity} />
    );
    
    expect(getByText('Test Community')).toBeTruthy();
    expect(getByText('A test community')).toBeTruthy();
    expect(getByText('150 members')).toBeTruthy();
  });
  
  it('shows join button when not joined', () => {
    const { getByText } = renderWithProviders(
      <CommunityCard community={mockCommunity} />
    );
    
    expect(getByText('Join')).toBeTruthy();
  });
  
  it('calls onJoin when join button is pressed', async () => {
    const onJoin = jest.fn();
    const { getByText } = renderWithProviders(
      <CommunityCard community={mockCommunity} onJoin={onJoin} />
    );
    
    fireEvent.press(getByText('Join'));
    
    await waitFor(() => {
      expect(onJoin).toHaveBeenCalledWith(mockCommunity.id);
    });
  });
});
```

### **Testing Hooks**

```typescript
// __tests__/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '@/stores/auth';

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('useAuth', () => {
  beforeEach(() => {
    // Reset store state
    useAuth.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });
  
  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
  
  it('handles login correctly', async () => {
    const { result } = renderHook(() => useAuth());
    
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    const mockCredentials = { email: 'test@example.com', password: 'password' };
    
    // Mock API response
    jest.spyOn(api, 'login').mockResolvedValue({
      user: mockUser,
      accessToken: 'token123',
    });
    
    await act(async () => {
      await result.current.login(mockCredentials);
    });
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
```

### **Integration Testing**

```typescript
// __tests__/screens/CommunityScreen.test.tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import CommunityScreen from '@/app/community/[id]';

// Mock navigation
const mockRoute = {
  params: { id: '1' },
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('CommunityScreen', () => {
  it('loads and displays community data', async () => {
    const mockCommunity = {
      id: '1',
      name: 'Test Community',
      description: 'Test description',
      posts: [],
      members: [],
    };
    
    // Mock API response
    jest.spyOn(api, 'getCommunity').mockResolvedValue(mockCommunity);
    
    const { getByText } = render(
      <NavigationContainer>
        <CommunityScreen route={mockRoute} navigation={mockNavigation} />
      </NavigationContainer>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(getByText('Test Community')).toBeTruthy();
      expect(getByText('Test description')).toBeTruthy();
    });
  });
});
```

## 🚀 Build & Deployment

### **Development Builds**

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS (creates eas.json)
eas build:configure

# Build for development (includes developer tools)
eas build --platform ios --profile development
eas build --platform android --profile development

# Install development build on device
eas build:run --platform ios
eas build:run --platform android
```

### **Preview Builds**

```bash
# Build preview version (production-like but with different bundle ID)
eas build --platform ios --profile preview
eas build --platform android --profile preview

# Share with testers
eas build:list  # Get build URLs
```

### **Production Builds**

```bash
# Build for app stores
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to app stores
eas submit --platform ios
eas submit --platform android --latest
```

### **Environment Variables**

```bash
# .env.development
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
EXPO_PUBLIC_ENVIRONMENT=development

# .env.staging
EXPO_PUBLIC_API_URL=https://staging-api.stunxtv2.com/api
EXPO_PUBLIC_WS_URL=wss://staging-ws.stunxtv2.com
EXPO_PUBLIC_ENVIRONMENT=staging

# .env.production
EXPO_PUBLIC_API_URL=https://api.stunxtv2.com/api
EXPO_PUBLIC_WS_URL=wss://ws.stunxtv2.com
EXPO_PUBLIC_ENVIRONMENT=production
```

## 📱 Platform-Specific Considerations

### **iOS Specific**

```typescript
// Platform-specific code
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
  // iOS-specific implementation
}

// Conditional styling
<View className={`p-4 ${Platform.OS === 'ios' ? 'pt-12' : 'pt-8'}`}>

// Safe area handling
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Header() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ paddingTop: insets.top }}>
      {/* Header content */}
    </View>
  );
}
```

### **Android Specific**

```typescript
// Android-specific permissions
import * as Notifications from 'expo-notifications';

if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

// Hardware back button handling
import { BackHandler } from 'react-native';

useEffect(() => {
  const backAction = () => {
    // Handle back button press
    return true; // Prevent default behavior
  };
  
  const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
  
  return () => backHandler.remove();
}, []);
```

## 🔧 Debugging & Development Tools

### **Expo Developer Tools**

```bash
# Start with specific options
npx expo start --dev-client    # Use development build
npx expo start --tunnel        # Use tunnel for external access
npx expo start --offline       # Work offline
npx expo start --clear         # Clear Metro cache
```

### **React Native Debugger**

```bash
# Install React Native Debugger
brew install --cask react-native-debugger

# Enable network inspect in app
import { NativeModules } from 'react-native';
if (__DEV__) {
  NativeModules.DevSettings.setIsDebuggingRemotely(true);
}
```

### **Flipper Integration**

```typescript
// Add Flipper plugins for debugging
import { logger } from 'flipper-plugin-redux-debugger';

// Network debugging
import flipperNetworkPlugin from 'react-native-flipper-network';
flipperNetworkPlugin();

// Performance monitoring
import { startProfiling, stopProfiling } from '@react-native-async-storage/async-storage';
```

## 📝 Code Style & Standards

### **ESLint Configuration**

```json
{
  "extends": [
    "expo",
    "@react-native-community",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-unused-vars": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### **Prettier Configuration**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### **Import Organization**

```typescript
// ✅ Good: Organized imports
// React imports
import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';

// Third-party imports
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

// Local imports
import { VStack, HStack, Button, Text } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { api } from '@/services/api';

// Type imports (separate section)
import type { Community, User } from '@/types';
```

---

## 🎯 Next Steps

1. **Read the [Architecture Guide](./ARCHITECTURE.md)** for system design patterns
2. **Check the [API Documentation](../backend/API.md)** for backend integration
3. **Review existing components** in `components/` for patterns
4. **Run tests** before submitting PRs: `npm test`
5. **Follow coding standards** with ESLint and Prettier

Happy coding! 🚀