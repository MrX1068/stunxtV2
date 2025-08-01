# 📱 StunxtV2 Mobile App

A modern, enterprise-grade mobile application built with Expo and React Native for the StunxtV2 community platform.

## 🚀 Overview

StunxtV2 Mobile is the native iOS and Android application that provides users with a seamless community experience. Built with cutting-edge technologies, it offers real-time messaging, community management, events, and content creation features.

### ✨ Key Features

- 🏘️ **Community Management** - Create and join communities with ease
- 💬 **Real-time Messaging** - Instant messaging with WebSocket support
- 📅 **Events & Scheduling** - Live events and virtual meetups
- 🌙 **Dark/Light Theme** - Automatic theme switching support
- 🔔 **Push Notifications** - Stay updated with community activities
- 📱 **Native Performance** - 60fps animations and smooth interactions
- 🔐 **Secure Authentication** - JWT-based auth with biometric support
- 🎨 **Modern UI** - Professional design with Gluestack UI components

## 🛠️ Technology Stack

### Core Framework
- **[Expo SDK 53+](https://expo.dev/)** - The fastest way to build React Native apps
- **[React Native 0.79.5](https://reactnative.dev/)** - Cross-platform mobile development
- **[TypeScript 5.8+](https://www.typescriptlang.org/)** - Type-safe development

### UI & Styling
- **[Gluestack UI v2](https://gluestack.io/)** - 60+ production-ready components
- **[NativeWind 4.1+](https://www.nativewind.dev/)** - Tailwind CSS for React Native
- **[React Native Reanimated 3.17+](https://docs.swmansion.com/react-native-reanimated/)** - 60fps native animations
- **[Moti](https://moti.fyi/)** - Declarative animations for React Native

### Navigation & Routing
- **[Expo Router 5.1+](https://expo.github.io/router/)** - File-based routing system
- **[React Native Screens](https://github.com/software-mansion/react-native-screens)** - Native navigation primitives

### State Management
- **[Zustand 5.0+](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[TanStack Query 5.83+](https://tanstack.com/query/latest)** - Powerful data fetching and caching

### Development Tools
- **[Metro](https://metrojs.dev/)** - JavaScript bundler for React Native
- **[Babel](https://babeljs.io/)** - JavaScript compiler with custom plugins
- **[ESLint](https://eslint.org/)** & **[Prettier](https://prettier.io/)** - Code formatting and linting

## 📁 Project Structure

```
mobile/
├── 📱 app/                          # Expo Router screens (file-based routing)
│   ├── (tabs)/                      # Tab navigation screens
│   │   ├── home.tsx                 # Home/Dashboard screen
│   │   ├── communities.tsx          # Communities list
│   │   ├── messages.tsx             # Messages inbox
│   │   └── profile.tsx              # User profile
│   ├── auth/                        # Authentication screens
│   │   ├── welcome.tsx              # Welcome screen
│   │   ├── login.tsx                # Login form
│   │   └── register.tsx             # Registration form
│   ├── community/                   # Community-related screens
│   │   └── [id].tsx                 # Dynamic community detail screen
│   ├── _layout.tsx                  # Root layout with providers
│   ├── index.tsx                    # Landing/welcome screen
│   ├── onboarding.tsx               # User onboarding flow
│   ├── create-community.tsx         # Community creation modal
│   ├── create-space.tsx             # Space creation modal
│   └── settings.tsx                 # App settings
│
├── 🧩 components/                   # Reusable UI components
│   ├── ui/                          # Gluestack UI component wrappers
│   │   ├── box/                     # Layout box component
│   │   ├── button/                  # Button components
│   │   ├── input/                   # Form input components
│   │   ├── text/                    # Typography components
│   │   └── index.ts                 # Component exports
│   ├── community/                   # Community-specific components
│   ├── ThemeSelector.tsx            # Theme selection component
│   └── ThemeToggle.tsx              # Dark/light mode toggle
│
├── 🗂️ stores/                       # Zustand state management
│   ├── auth.ts                      # Authentication state
│   ├── api.ts                       # API configuration
│   ├── posts.ts                     # Posts/content state
│   └── index.ts                     # Store exports
│
├── 🔧 providers/                    # React Context providers
│   ├── AuthProvider.tsx             # Authentication context
│   ├── ThemeContext.tsx             # Theme management context
│   └── NotificationProvider.tsx     # Push notifications context
│
├── 🛠️ utils/                        # Utility functions
│   └── formatters.ts                # Data formatting helpers
│
├── 🎨 assets/                       # Static assets
│   ├── icon.png                     # App icon
│   ├── splash-icon.png              # Splash screen icon
│   ├── adaptive-icon.png            # Android adaptive icon
│   └── favicon.png                  # Web favicon
│
├── ⚙️ Configuration Files
├── app.json                         # Expo app configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── babel.config.js                  # Babel configuration
├── metro.config.js                  # Metro bundler configuration
├── gluestack-ui.config.json        # Gluestack UI configuration
├── global.css                       # Global CSS styles
└── nativewind-env.d.ts             # NativeWind type definitions
```

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your development machine:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Git**
- **Expo CLI**: `npm install -g @expo/cli`

#### For iOS Development
- **macOS** (required for iOS development)
- **Xcode 14+** ([Mac App Store](https://apps.apple.com/us/app/xcode/id497799835))
- **iOS Simulator** (included with Xcode)

#### For Android Development
- **Android Studio** ([Download](https://developer.android.com/studio))
- **Android SDK & Build Tools**
- **Android Emulator** or physical device

### 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stunxtV2/mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

4. **Run on your preferred platform**
   ```bash
   # iOS (requires macOS)
   npm run ios
   
   # Android
   npm run android
   
   # Web (for testing)
   npm run web
   ```

### 📱 Running on Device

#### Using Expo Go (Recommended for development)
1. Install **Expo Go** from the App Store (iOS) or Google Play Store (Android)
2. Scan the QR code displayed in your terminal or browser
3. The app will load directly on your device

#### Using Development Build
For production-like testing with native features:
```bash
# Build for iOS
eas build --platform ios --profile development

# Build for Android  
eas build --platform android --profile development
```

## 🏗️ Architecture Overview

### File-Based Routing with Expo Router

The app uses Expo Router for navigation, which provides file-based routing similar to Next.js:

```typescript
// app/_layout.tsx - Root layout with providers
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// app/index.tsx - Landing screen
export default function Index() {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }
  
  return <WelcomeScreen />;
}
```

### State Management with Zustand

Simple, lightweight state management without boilerplate:

```typescript
// stores/auth.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    // Login logic
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

### UI Components with Gluestack UI

Pre-built, accessible components with consistent styling:

```tsx
import { VStack, Box, Heading, Text, Button } from "@/components/ui";

export default function ExampleScreen() {
  return (
    <VStack className="flex-1 p-6 gap-4">
      <Box className="bg-primary-50 p-4 rounded-lg">
        <Heading size="lg" className="text-primary-900">
          Welcome to StunxtV2
        </Heading>
        <Text className="text-primary-700 mt-2">
          Connect with your community
        </Text>
      </Box>
      
      <Button className="w-full">
        <ButtonText>Get Started</ButtonText>
      </Button>
    </VStack>
  );
}
```

### Styling with NativeWind

Tailwind CSS classes that work across platforms:

```tsx
// Responsive design
<View className="flex-1 p-4 md:p-6 lg:p-8">
  
// Dark mode support
<Text className="text-gray-900 dark:text-gray-100">
  
// Platform-specific styles
<View className="ios:shadow-sm android:elevation-2">
```

## 🎨 Theming & Design System

### Color System

The app uses a comprehensive color system with semantic naming:

```javascript
// Primary colors (brand colors)
primary: { 50: '#f0f9ff', 500: '#3b82f6', 900: '#1e3a8a' }

// Semantic colors
success: { 50: '#f0fdf4', 500: '#22c55e', 900: '#14532d' }
error: { 50: '#fef2f2', 500: '#ef4444', 900: '#7f1d1d' }
warning: { 50: '#fffbeb', 500: '#f59e0b', 900: '#78350f' }

// Typography colors
typography: { 50: '#fafafa', 500: '#737373', 900: '#171717' }
```

### Dark Mode Support

Automatic theme switching based on system preferences:

```tsx
import { useTheme } from '@/providers/ThemeContext';

function ThemedComponent() {
  const { isDark, colorMode, toggleTheme } = useTheme();
  
  return (
    <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <Text className="text-typography-900 dark:text-typography-100">
        This text adapts to the theme
      </Text>
    </View>
  );
}
```

## 🔧 Development Workflow

### Available Scripts

```bash
# Development
npm start          # Start Expo development server
npm run android    # Run on Android emulator/device
npm run ios        # Run on iOS simulator/device
npm run web        # Run in web browser

# Building
npm run build      # Create production build
npm run preview    # Preview production build

# Code Quality
npm run lint       # Run ESLint
npm run type-check # Run TypeScript checks
npm run format     # Format code with Prettier
```

### Environment Configuration

The app supports multiple environments through Expo's configuration:

```json
// app.json
{
  "expo": {
    "name": "StunxtV2",
    "slug": "stunxtv2",
    "scheme": "stunxtv2",
    "platforms": ["ios", "android", "web"],
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-notifications"
    ]
  }
}
```

### Adding New Screens

1. Create a new file in the `app/` directory
2. Export a React component as default
3. The file name becomes the route path

```tsx
// app/new-feature.tsx
export default function NewFeatureScreen() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text>New Feature Screen</Text>
    </View>
  );
}

// Accessible at: /new-feature
```

### Adding New Components

1. Create component in `components/` directory
2. Follow the established naming convention
3. Export from `components/index.ts` if it's reusable

```tsx
// components/CustomCard.tsx
interface CustomCardProps {
  title: string;
  children: React.ReactNode;
}

export function CustomCard({ title, children }: CustomCardProps) {
  return (
    <Box className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <Heading size="md" className="mb-2">{title}</Heading>
      {children}
    </Box>
  );
}
```

## 🔌 API Integration

### TanStack Query Setup

Efficient data fetching with caching and background updates:

```typescript
// stores/api.ts
import { useQuery, useMutation } from '@tanstack/react-query';

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const response = await fetch('/api/communities');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCommunityData) => {
      const response = await fetch('/api/communities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}
```

### WebSocket Integration

Real-time features using Socket.IO:

```typescript
// stores/socket.ts
import { io } from 'socket.io-client';

const socket = io(process.env.EXPO_PUBLIC_WS_URL);

export function useRealTimeMessages(communityId: string) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    socket.emit('join-community', communityId);
    
    socket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    return () => {
      socket.emit('leave-community', communityId);
      socket.off('new-message');
    };
  }, [communityId]);
  
  return messages;
}
```

## 🔐 Authentication & Security

### Secure Token Storage

Using Expo Secure Store for sensitive data:

```typescript
// stores/auth.ts
import * as SecureStore from 'expo-secure-store';

export const useAuth = create<AuthState>((set, get) => ({
  login: async (credentials) => {
    const response = await api.login(credentials);
    
    // Store tokens securely
    await SecureStore.setItemAsync('accessToken', response.accessToken);
    await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    
    set({ 
      user: response.user, 
      isAuthenticated: true 
    });
  },
  
  logout: async () => {
    // Remove stored tokens
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    
    set({ 
      user: null, 
      isAuthenticated: false 
    });
  },
}));
```

### Biometric Authentication

Integration with device biometrics:

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  
  if (hasHardware && isEnrolled) {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access StunxtV2',
      biometricPrompt: 'Use your biometric to authenticate',
    });
    
    return result.success;
  }
  
  return false;
}
```

## 🔔 Push Notifications

### Setup

Push notifications are configured using Expo Notifications:

```typescript
// providers/NotificationProvider.tsx
import * as Notifications from 'expo-notifications';

export function NotificationProvider({ children }) {
  useEffect(() => {
    // Configure notification handling
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    
    // Register for push notifications
    registerForPushNotifications();
  }, []);
  
  return children;
}
```

### Handling Notifications

```typescript
// Handle notification taps
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { data } = response.notification.request.content;
    
    if (data.type === 'community_message') {
      router.push(`/community/${data.communityId}`);
    }
  });
  
  return () => subscription.remove();
}, []);
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Components

```typescript
// __tests__/components/CustomCard.test.tsx
import { render, screen } from '@testing-library/react-native';
import { CustomCard } from '@/components/CustomCard';

describe('CustomCard', () => {
  it('renders title and children correctly', () => {
    render(
      <CustomCard title="Test Card">
        <Text>Test content</Text>
      </CustomCard>
    );
    
    expect(screen.getByText('Test Card')).toBeTruthy();
    expect(screen.getByText('Test content')).toBeTruthy();
  });
});
```

## 📦 Building & Deployment

### Development Builds

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for development
eas build --platform ios --profile development
eas build --platform android --profile development
```

### Production Builds

```bash
# Build for app stores
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

### Continuous Integration

The project includes GitHub Actions workflows for:
- Running tests on PRs
- Building development previews
- Automated releases

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes following the coding standards
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Coding Standards

- Use TypeScript for all new code
- Follow the existing code style (ESLint + Prettier)
- Write tests for new components and features
- Use semantic commit messages
- Update documentation for API changes

### Code Style

```typescript
// ✅ Good: Use TypeScript interfaces
interface UserProfileProps {
  user: User;
  onEdit: () => void;
}

// ✅ Good: Use functional components with hooks
export function UserProfile({ user, onEdit }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <VStack className="p-4 gap-3">
      <Heading size="lg">{user.name}</Heading>
      <Button onPress={onEdit}>
        <ButtonText>Edit Profile</ButtonText>
      </Button>
    </VStack>
  );
}

// ✅ Good: Use NativeWind classes for styling
<View className="flex-1 bg-background-0 p-4">
  <Text className="text-typography-900 dark:text-typography-100">
    Themed text
  </Text>
</View>
```

## 📚 Additional Resources

### Documentation Links
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Gluestack UI Components](https://gluestack.io/ui/docs)
- [NativeWind Documentation](https://www.nativewind.dev/quick-start)
- [TanStack Query Guide](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### Learning Resources
- [React Native Tutorial](https://reactnative.dev/docs/tutorial)
- [Expo Learn](https://docs.expo.dev/tutorial/introduction/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Community
- [Expo Discord](https://discord.gg/4gtbPAdpaE)
- [React Native Community](https://github.com/react-native-community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

## 🐛 Troubleshooting

### Common Issues

**Metro bundler cache issues:**
```bash
npx expo start --clear
```

**iOS build fails:**
```bash
cd ios && pod install
```

**Android build fails:**
```bash
cd android && ./gradlew clean
```

**TypeScript errors:**
```bash
npx tsc --noEmit
```

**Dependency conflicts:**
```bash
rm -rf node_modules
npm install
```

### Getting Help

1. Check the [troubleshooting section](https://docs.expo.dev/troubleshooting/overview/)
2. Search [existing issues](https://github.com/expo/expo/issues)
3. Ask on [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
4. Join the [Expo Discord community](https://discord.gg/4gtbPAdpaE)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Built with ❤️ by the StunxtV2 team**

Ready to contribute? Check out our [Contributing Guide](../CONTRIBUTING.md) and [Code of Conduct](../CODE_OF_CONDUCT.md).