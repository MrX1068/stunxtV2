# 🏗️ Mobile App Architecture

This document explains the technical architecture and design decisions behind the StunxtV2 mobile application.

## 🎯 Architecture Overview

The StunxtV2 mobile app follows a **modern, scalable architecture** designed for maintainability and performance:

```
┌─────────────────────────────────────────┐
│            User Interface              │
│     (Screens + Components)             │
├─────────────────────────────────────────┤
│           Navigation Layer             │
│        (Expo Router)                   │
├─────────────────────────────────────────┤
│          State Management              │
│     (Zustand + TanStack Query)         │
├─────────────────────────────────────────┤
│           Services Layer               │
│    (API, WebSocket, Storage)           │
├─────────────────────────────────────────┤
│            Native Layer                │
│       (React Native + Expo)           │
└─────────────────────────────────────────┘
```

## 🎨 Design Patterns

### 1. **File-Based Routing** (Expo Router)
```
app/
├── _layout.tsx              # Root layout with providers
├── index.tsx                # Landing screen
├── (tabs)/                  # Tab navigation group
│   ├── _layout.tsx          # Tab layout
│   ├── home.tsx             # Home screen
│   └── profile.tsx          # Profile screen
├── auth/                    # Authentication group
│   ├── _layout.tsx          # Auth layout
│   ├── login.tsx            # Login screen
│   └── register.tsx         # Register screen
└── community/
    └── [id].tsx             # Dynamic community screen
```

**Benefits:**
- ✅ Intuitive file structure
- ✅ Automatic route generation
- ✅ Type-safe navigation
- ✅ Built-in deep linking

### 2. **Component Composition**
```tsx
// High-level screen component
function CommunityScreen() {
  return (
    <VStack className="flex-1">
      <CommunityHeader />
      <CommunityContent />
      <CommunityActions />
    </VStack>
  );
}

// Reusable UI components
function CommunityHeader({ title, memberCount }) {
  return (
    <HStack className="p-4 bg-primary-50">
      <Heading size="lg">{title}</Heading>
      <Text className="text-gray-600">{memberCount} members</Text>
    </HStack>
  );
}
```

### 3. **Hook-Based State Management**
```tsx
// Custom hooks for business logic
function useCommunity(id: string) {
  const { data: community, isLoading } = useQuery({
    queryKey: ['community', id],
    queryFn: () => fetchCommunity(id),
  });
  
  const joinMutation = useMutation({
    mutationFn: joinCommunity,
    onSuccess: () => queryClient.invalidateQueries(['community', id]),
  });
  
  return {
    community,
    isLoading,
    joinCommunity: joinMutation.mutate,
    isJoining: joinMutation.isPending,
  };
}
```

## 🔧 Technology Choices & Rationale

### **Expo vs Bare React Native**
**Choice:** Expo managed workflow

**Why:**
- ✅ **Faster Development:** Over-the-air updates, easy device testing
- ✅ **Rich Ecosystem:** 50+ pre-built modules (Camera, Notifications, etc.)
- ✅ **Simplified Deployment:** EAS Build & Submit for app stores
- ✅ **Better DevX:** Hot reload, error boundaries, debugging tools
- ❌ **Trade-off:** Some native modules require development builds

### **Gluestack UI vs Other UI Libraries**
**Choice:** Gluestack UI v2

**Why:**
- ✅ **Enterprise-Ready:** 60+ production-tested components
- ✅ **100% Free:** No licensing costs unlike UI Kitten Pro
- ✅ **Accessibility-First:** WCAG 2.1 AA compliant by default
- ✅ **Customizable:** Full theming system with variants
- ✅ **Performance:** Tree-shakable, lightweight components

**Comparison:**
| Feature | Gluestack UI | React Native Elements | NativeBase |
|---------|--------------|----------------------|------------|
| Components | 60+ | 30+ | 40+ |
| Bundle Size | 🟢 Small | 🟡 Medium | 🔴 Large |
| TypeScript | ✅ Excellent | ✅ Good | ✅ Good |
| Accessibility | ✅ Built-in | ❌ Manual | ✅ Built-in |
| Cost | ✅ Free | ✅ Free | ❌ Pro features paid |

### **NativeWind vs Styled Components**
**Choice:** NativeWind (Tailwind CSS for React Native)

**Why:**
- ✅ **Consistency:** Same classes work on web and native
- ✅ **Developer Experience:** IntelliSense, fast development
- ✅ **Performance:** Compile-time CSS-in-JS, no runtime overhead
- ✅ **Dark Mode:** Built-in support with `dark:` prefix
- ✅ **Responsive:** Built-in breakpoints for different screen sizes

### **Zustand vs Redux Toolkit**
**Choice:** Zustand for local state

**Why:**
- ✅ **Simplicity:** 10x less boilerplate than Redux
- ✅ **TypeScript-First:** Excellent TypeScript integration
- ✅ **Small Bundle:** <2KB vs 10KB+ for Redux ecosystem
- ✅ **DevTools:** Built-in debugging support
- ✅ **Learning Curve:** Easy for new developers

**State Architecture:**
```tsx
// Simple, typed store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => { /* logic */ },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

### **TanStack Query vs SWR**
**Choice:** TanStack Query for server state

**Why:**
- ✅ **Feature-Rich:** Background refetching, caching, optimistic updates
- ✅ **DevTools:** Excellent debugging and inspection tools
- ✅ **Offline Support:** Built-in offline/online detection
- ✅ **TypeScript:** First-class TypeScript support
- ✅ **React Native:** Officially supports React Native

## 📱 Screen Architecture

### **Screen Component Pattern**
```tsx
// app/community/[id].tsx
export default function CommunityScreen() {
  const { id } = useLocalSearchParams();
  const { community, isLoading, error } = useCommunity(id);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBoundary error={error} />;
  
  return (
    <ScrollView className="flex-1 bg-background-0">
      <CommunityHeader community={community} />
      <CommunityPosts posts={community.posts} />
      <CommunityMembers members={community.members} />
    </ScrollView>
  );
}
```

### **Component Organization**
```
components/
├── ui/                      # Base UI components (from Gluestack)
│   ├── button/
│   ├── input/
│   └── text/
├── common/                  # Common app components
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── Avatar.tsx
├── forms/                   # Form-specific components
│   ├── LoginForm.tsx
│   └── CommunityForm.tsx
└── community/               # Domain-specific components
    ├── CommunityCard.tsx
    ├── CommunityHeader.tsx
    └── MemberList.tsx
```

## 🗃️ Data Flow Architecture

### **Unidirectional Data Flow**
```
UI Component → Action → Store → API → Store → UI Component
     ↑                                              ↓
     └──────────── Re-render on state change ──────┘
```

### **State Layers**
1. **UI State** (useState) - Form inputs, modal visibility
2. **Client State** (Zustand) - User session, app settings
3. **Server State** (TanStack Query) - API data, caching
4. **Persistent State** (Expo SecureStore) - Auth tokens, user preferences

### **API Integration Pattern**
```tsx
// services/api.ts
class ApiService {
  private baseURL = process.env.EXPO_PUBLIC_API_URL;
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await SecureStore.getItemAsync('accessToken');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    
    return response.json();
  }
}

// stores/communities.ts
export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => api.request<Community[]>('/communities'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## 🔄 Real-Time Architecture

### **WebSocket Integration**
```tsx
// services/socket.ts
class SocketService {
  private socket: Socket | null = null;
  
  connect(userId: string) {
    this.socket = io(process.env.EXPO_PUBLIC_WS_URL, {
      auth: { userId },
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
  }
  
  joinCommunity(communityId: string) {
    this.socket?.emit('join-community', communityId);
  }
  
  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('new-message', callback);
  }
}

// hooks/useRealTimeMessages.ts
export function useRealTimeMessages(communityId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    socket.joinCommunity(communityId);
    
    socket.onNewMessage((message) => {
      queryClient.setQueryData(['messages', communityId], (old: Message[]) => [
        ...old,
        message,
      ]);
    });
    
    return () => {
      socket.leaveCommunity(communityId);
    };
  }, [communityId]);
}
```

## 🎨 Theming Architecture

### **Design Token System**
```tsx
// config/theme.ts
export const theme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#3b82f6',
      900: '#1e3a8a',
    },
    semantic: {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    typography: {
      primary: '#1f2937',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
    },
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
};
```

### **Dark Mode Implementation**
```tsx
// providers/ThemeContext.tsx
export function ThemeProvider({ children }) {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorMode(colorScheme || 'light');
    });
    
    return () => subscription.remove();
  }, []);
  
  return (
    <ThemeContext.Provider value={{ colorMode, setColorMode }}>
      <StatusBar style={colorMode === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}
```

## 📊 Performance Optimization

### **Code Splitting**
```tsx
// Lazy load screens for better startup performance
const CommunityScreen = lazy(() => import('./community/[id]'));
const ProfileScreen = lazy(() => import('./(tabs)/profile'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <CommunityScreen />
</Suspense>
```

### **Image Optimization**
```tsx
// Use Expo Image for better performance
import { Image } from 'expo-image';

<Image
  source={{ uri: user.avatar }}
  placeholder="placeholder-hash"
  contentFit="cover"
  transition={200}
  className="w-12 h-12 rounded-full"
/>
```

### **List Performance**
```tsx
// Use FlashList for large lists
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={communities}
  renderItem={({ item }) => <CommunityCard community={item} />}
  estimatedItemSize={100}
  keyExtractor={(item) => item.id}
/>
```

## 🧪 Testing Architecture

### **Testing Pyramid**
```
       E2E Tests (Detox)
      ↗                ↖
  Integration Tests      
 ↗                        ↖
Unit Tests (Jest + RTL)    
```

### **Component Testing**
```tsx
// __tests__/components/CommunityCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { CommunityCard } from '@/components/community/CommunityCard';

describe('CommunityCard', () => {
  const mockCommunity = {
    id: '1',
    name: 'Test Community',
    memberCount: 150,
  };
  
  it('renders community information correctly', () => {
    const { getByText } = render(<CommunityCard community={mockCommunity} />);
    
    expect(getByText('Test Community')).toBeTruthy();
    expect(getByText('150 members')).toBeTruthy();
  });
  
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <CommunityCard community={mockCommunity} onPress={onPress} />
    );
    
    fireEvent.press(getByTestId('community-card'));
    expect(onPress).toHaveBeenCalledWith(mockCommunity);
  });
});
```

## 🚀 Build & Deployment Architecture

### **EAS Build Configuration**
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### **Environment Management**
```
.env.development     # Local development
.env.staging        # Staging environment
.env.production     # Production environment
```

---

## 🎯 Architecture Benefits

### **Scalability**
- ✅ **Modular Design:** Easy to add new features
- ✅ **Type Safety:** Catch errors at compile time
- ✅ **Code Reuse:** Shared components and hooks
- ✅ **Performance:** Optimized for large-scale apps

### **Developer Experience**
- ✅ **Fast Refresh:** Instant feedback during development
- ✅ **IntelliSense:** Rich IDE support with TypeScript
- ✅ **Debugging:** Excellent debugging tools
- ✅ **Testing:** Comprehensive testing setup

### **Maintainability**
- ✅ **Clear Structure:** Intuitive file organization
- ✅ **Separation of Concerns:** Logic separated from UI
- ✅ **Documentation:** Self-documenting code with TypeScript
- ✅ **Standards:** Consistent coding patterns

---

This architecture ensures the StunxtV2 mobile app is **scalable**, **maintainable**, and **performant** while providing an excellent developer experience.