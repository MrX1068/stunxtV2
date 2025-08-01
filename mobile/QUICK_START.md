# 🚀 Quick Setup Guide

This guide will get you up and running with the StunxtV2 mobile app in under 10 minutes.

## ⚡ Prerequisites Check

Before starting, run this quick check:

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Check if Expo CLI is installed
expo --version

# If Expo CLI is not installed:
npm install -g @expo/cli
```

## 📱 One-Command Setup

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

That's it! 🎉

## 📲 Running on Your Device

### Option 1: Expo Go (Fastest)
1. Install **Expo Go** from App Store/Google Play
2. Scan the QR code from your terminal
3. App loads instantly on your device

### Option 2: iOS Simulator (macOS only)
```bash
npm run ios
```

### Option 3: Android Emulator
```bash
npm run android
```

## 🔧 Common Issues & Quick Fixes

### "Metro bundler won't start"
```bash
npx expo start --clear
```

### "Dependencies not found"
```bash
rm -rf node_modules
npm install
```

### "TypeScript errors"
```bash
npx tsc --noEmit
```

### "iOS build issues"
```bash
cd ios && pod install
```

## 🎯 What's Next?

After setup, check out:
- 📖 [Full README](./README.md) - Complete documentation
- 🏗️ [Architecture Guide](../ARCHITECTURE.md) - How everything works
- ⚙️ [Environment Setup](./DEVELOPMENT.md) - Advanced development setup

## 🆘 Need Help?

- 💬 [Discord Community](https://discord.gg/stunxtv2)
- 🐛 [Report Issues](https://github.com/MrX1068/stunxtV2/issues)
- 📚 [Expo Docs](https://docs.expo.dev/)

---

**Happy coding! 🚀**