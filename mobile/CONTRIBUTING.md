# 🤝 Contributing to StunxtV2 Mobile

Thank you for your interest in contributing to the StunxtV2 mobile application! This guide will help you get started.

## 🚀 Quick Start for Contributors

### **1. Setup Development Environment**

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/stunxtV2.git
cd stunxtV2/mobile

# Install dependencies
npm install

# Start development server
npm start
```

### **2. Run on Your Device**

- **Option A:** Install Expo Go app and scan QR code
- **Option B:** Use iOS Simulator (`npm run ios`)
- **Option C:** Use Android Emulator (`npm run android`)

### **3. Make Your Changes**

- Create a feature branch: `git checkout -b feature/amazing-feature`
- Make your changes following our coding standards
- Test your changes thoroughly
- Commit with descriptive messages

### **4. Submit Your Contribution**

```bash
# Push to your fork
git push origin feature/amazing-feature

# Open a Pull Request on GitHub
# Wait for review and feedback
```

## 📋 Contribution Guidelines

### **What We Welcome**

- 🐛 **Bug fixes** - Help us squash those pesky bugs
- ✨ **New features** - Add exciting functionality
- 📚 **Documentation** - Improve guides and examples
- 🎨 **UI improvements** - Enhance user experience
- ⚡ **Performance optimizations** - Make the app faster
- 🧪 **Tests** - Increase code coverage
- ♿ **Accessibility improvements** - Make the app more inclusive

### **Before You Start**

- 📋 Check existing [issues](https://github.com/MrX1068/stunxtV2/issues) for similar problems
- 💬 Join our [Discord](https://discord.gg/stunxtv2) to discuss your idea
- 📖 Read our [Development Guide](./DEVELOPMENT.md) for technical details
- 🏗️ Understand our [Architecture](./ARCHITECTURE.md)

## 🛠️ Development Standards

### **Code Style**

We use automated tools to maintain code quality:

```bash
# Check code style
npm run lint

# Format code automatically
npm run format

# Check TypeScript types
npm run type-check
```

### **Naming Conventions**

```typescript
// ✅ Components: PascalCase
function CommunityCard() {}
function UserProfile() {}

// ✅ Files: kebab-case or PascalCase for components
community-card.tsx
UserProfile.tsx

// ✅ Variables and functions: camelCase
const userName = 'john';
function handleSubmit() {}

// ✅ Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.stunxtv2.com';

// ✅ Types and interfaces: PascalCase
interface User {}
type CommunityStatus = 'active' | 'inactive';
```

### **Component Structure**

```typescript
// ✅ Good component structure
import React from 'react';
import { VStack, HStack, Text, Button } from '@/components/ui';
import type { User } from '@/types';

interface UserCardProps {
  user: User;
  onPress?: () => void;
}

export function UserCard({ user, onPress }: UserCardProps) {
  return (
    <VStack className="p-4 bg-white dark:bg-gray-800 rounded-lg">
      <HStack className="items-center justify-between">
        <Text className="font-semibold">{user.name}</Text>
        <Button onPress={onPress}>
          <ButtonText>View Profile</ButtonText>
        </Button>
      </HStack>
    </VStack>
  );
}
```

### **State Management Patterns**

```typescript
// ✅ Zustand store pattern
interface AuthState {
  // State properties
  user: User | null;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const user = await api.login(credentials);
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: () => set({ user: null }),
}));
```

## 🧪 Testing Requirements

### **Writing Tests**

All new features should include tests:

```typescript
// __tests__/components/UserCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { UserCard } from '@/components/UserCard';

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  it('renders user information correctly', () => {
    const { getByText } = render(<UserCard user={mockUser} />);
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('calls onPress when button is tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <UserCard user={mockUser} onPress={onPress} />
    );
    
    fireEvent.press(getByText('View Profile'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### **Running Tests**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📱 Mobile-Specific Guidelines

### **Platform Considerations**

```typescript
// ✅ Handle platform differences gracefully
import { Platform } from 'react-native';

function PlatformSpecificComponent() {
  const padding = Platform.OS === 'ios' ? 'pt-12' : 'pt-8';
  
  return (
    <View className={`flex-1 ${padding}`}>
      {Platform.OS === 'ios' && <IOSSpecificFeature />}
      {Platform.OS === 'android' && <AndroidSpecificFeature />}
    </View>
  );
}
```

### **Performance Best Practices**

```typescript
// ✅ Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexCalculation data={data} />;
});

// ✅ Use useCallback for event handlers
const MyComponent = ({ onPress }) => {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);
  
  return <Button onPress={handlePress}>Press me</Button>;
};

// ✅ Use FlashList for large lists
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  estimatedItemSize={100}
/>
```

### **Accessibility Guidelines**

```typescript
// ✅ Add accessibility labels
<Button
  accessibilityLabel="Add to favorites"
  accessibilityHint="Adds this item to your favorites list"
>
  <Icon name="heart" />
</Button>

// ✅ Use semantic roles
<View accessibilityRole="button" accessible>
  <Text>Custom Button</Text>
</View>

// ✅ Support screen readers
<Text accessibilityRole="header">
  Section Title
</Text>
```

## 🎨 UI/UX Contribution Guidelines

### **Design System Usage**

```typescript
// ✅ Use design tokens from theme
<View className="p-4 bg-background-0 rounded-lg">
  <Text className="text-typography-900 text-lg font-semibold">
    Title
  </Text>
  <Text className="text-typography-600 mt-2">
    Description
  </Text>
</View>

// ✅ Follow component patterns
import { VStack, HStack, Button, ButtonText } from '@/components/ui';

<VStack className="gap-4">
  <HStack className="justify-between items-center">
    <Text>Settings</Text>
    <Button variant="outline" size="sm">
      <ButtonText>Edit</ButtonText>
    </Button>
  </HStack>
</VStack>
```

### **Dark Mode Support**

```typescript
// ✅ Always include dark mode styles
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-gray-100">
    This text adapts to theme
  </Text>
</View>
```

## 📚 Documentation Standards

### **Code Documentation**

```typescript
/**
 * Represents a user in the community platform
 */
interface User {
  /** Unique identifier for the user */
  id: string;
  /** Display name */
  name: string;
  /** Email address (optional for privacy) */
  email?: string;
}

/**
 * Custom hook for managing user authentication
 * @returns Authentication state and actions
 */
export function useAuth() {
  // Implementation
}
```

### **README Updates**

When adding new features, update relevant documentation:

- Update the main README.md if it affects setup or usage
- Add to TROUBLESHOOTING.md if it introduces common issues
- Update DEVELOPMENT.md for new development patterns

## 🔄 Pull Request Process

### **Before Submitting**

- [ ] Code follows our style guidelines
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] Code is properly formatted (`npm run format`)
- [ ] Documentation is updated if needed
- [ ] Self-review: does the code solve the problem elegantly?

### **PR Description Template**

```markdown
## Description
Brief description of changes made

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Tested on iOS
- [ ] Tested on Android

## Screenshots/Videos
(If UI changes, include screenshots or screen recordings)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
```

### **Review Process**

1. **Automated Checks** - CI runs tests and linting
2. **Code Review** - Team members review for quality and standards
3. **Testing** - Changes are tested on different devices
4. **Approval** - At least one maintainer approves
5. **Merge** - Changes are merged to main branch

## 🐛 Bug Reports

### **Before Reporting**

- Search existing issues for similar problems
- Check if it's already fixed in the latest version
- Try to reproduce the issue consistently

### **Bug Report Template**

```markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
Add screenshots to help explain your problem.

**Device Information:**
 - OS: [e.g. iOS 17.0]
 - Device: [e.g. iPhone 15]
 - App Version: [e.g. 1.0.0]

**Additional Context**
Add any other context about the problem here.
```

## 💡 Feature Requests

### **Feature Request Template**

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request.
```

## 🏆 Recognition

Contributors are recognized in various ways:

- 📝 **Contributors list** in README
- 🎖️ **GitHub achievements** and badges
- 💬 **Community shoutouts** on Discord
- 🌟 **Feature highlights** in release notes

## 📞 Getting Help

### **Community Channels**

- 💬 [Discord Server](https://discord.gg/stunxtv2) - Real-time chat
- 🐛 [GitHub Issues](https://github.com/MrX1068/stunxtV2/issues) - Bug reports and feature requests
- 📧 [Email](mailto:support@stunxtv2.com) - Direct support

### **Development Resources**

- 📖 [Development Guide](./DEVELOPMENT.md) - Detailed development setup
- 🏗️ [Architecture Guide](./ARCHITECTURE.md) - System design patterns
- 🛠️ [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and fixes
- 🚀 [Quick Start](./QUICK_START.md) - Get running in 5 minutes

## 🎯 Good First Issues

New to the project? Look for issues labeled:

- 🟢 `good first issue` - Perfect for beginners
- 📚 `documentation` - Help improve our docs
- 🐛 `bug` - Fix reported issues
- 🎨 `ui/ux` - Improve user experience
- ♿ `accessibility` - Make the app more inclusive

## 📜 Code of Conduct

### **Our Standards**

- ✅ **Be respectful** and inclusive
- ✅ **Be constructive** in feedback
- ✅ **Be collaborative** and helpful
- ✅ **Be patient** with newcomers
- ❌ **No harassment** or discrimination
- ❌ **No spam** or off-topic content

### **Enforcement**

Violations will be addressed by:

1. **Warning** - First offense discussion
2. **Temporary ban** - Serious or repeat violations
3. **Permanent ban** - Severe violations

Report issues to: conduct@stunxtv2.com

---

## 🎉 Thank You!

Every contribution makes StunxtV2 better for everyone. Whether it's:

- 🐛 Fixing a small bug
- ✨ Adding a major feature
- 📚 Improving documentation
- 💬 Helping others in the community

**You make a difference!** 🚀

---

**Ready to contribute?** Start with our [Quick Start Guide](./QUICK_START.md) or join our [Discord community](https://discord.gg/stunxtv2) to get help from other developers.

Happy coding! 💙