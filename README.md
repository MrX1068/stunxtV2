# 🚀 StunxtV2 - Enterprise Community Platform

## 🎯 **Project Overview**

StunxtV2 is an enterprise-grade mobile-first community platform inspired by Circle.so, built with modern technology stack for scalability, performance, and developer experience.

### **Key Features**
- 📱 **Mobile-First**: Native iOS/Android apps with Expo + React Native
- 🏘️ **Communities**: Custom branded spaces with member management
- 💬 **Real-time Chat**: 1-on-1 and group messaging with WebSocket
- 📅 **Events**: Live streaming, scheduling, and virtual events
- 📚 **Content**: Course creation and educational content delivery
- 🤖 **AI Integration**: Smart recommendations and automated assistance
- 📊 **Analytics**: Comprehensive engagement and growth metrics
- 💳 **Monetization**: Subscription management and payment processing

---

## 🛠️ **Technology Stack**

### **Mobile App**
- **Framework**: Expo (SDK 52+) with React Native
- **UI Library**: Gluestack UI v2 (100% free)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Animations**: Moti + React Native Reanimated
- **Navigation**: Expo Router (file-based routing)
- **State**: Zustand + TanStack Query
- **Language**: TypeScript

### **Backend Services**
- **Framework**: NestJS with TypeScript
- **Architecture**: Microservices with API Gateway
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis for sessions and real-time data
- **Search**: Elasticsearch (optional for MVP)
- **Authentication**: JWT with refresh tokens
- **Real-time**: WebSockets with Socket.io

### **Infrastructure**
- **Development**: Docker Compose + Local services
- **Staging**: Railway/Render for rapid deployment
- **Production**: AWS with ECS/EKS (planned migration)
- **Storage**: Supabase Storage → AWS S3
- **CDN**: CloudFlare for global content delivery
- **Monitoring**: Sentry + PostHog + CloudWatch

---

## 🏗️ **Project Structure**

```
stunxtv2/
├── 📱 mobile/                 # Expo React Native App
│   ├── app/                   # Expo Router (file-based routing)
│   ├── src/                   # Source code
│   └── package.json
│
├── 🌐 backend/                # Microservices Backend
│   ├── gateway/               # API Gateway Service
│   ├── services/              # Individual microservices
│   │   ├── user-management/
│   │   ├── community-management/
│   │   ├── messaging/
│   │   ├── events/
│   │   └── [other services]/
│   └── shared/                # Shared libraries
│
├── 🐳 docker/                 # Docker configuration
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
│
├── 📋 docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   ├── PROJECT_SETUP.md
│   └── API.md
│
└── 🧪 tests/                  # Testing suite
```

---

## 🚀 **Quick Start**

### **Prerequisites**
```bash
# Install required tools
- Node.js 18+ (LTS)
- Docker Desktop
- Git
- Expo CLI: npm install -g @expo/cli
- NestJS CLI: npm install -g @nestjs/cli
```

### **Setup Development Environment**
```bash
# 1. Clone repository
git clone <repository-url> stunxtv2
cd stunxtv2

# 2. Start infrastructure services
cd docker
docker-compose -f docker-compose.dev.yml up -d postgres redis adminer redis-commander

# 3. Setup mobile app
cd ../mobile
npm create expo-app . --template blank-typescript
npm install @gluestack-ui/themed nativewind moti zustand @tanstack/react-query

# 4. Setup backend services
cd ../backend/gateway
npm init -y
npm install @nestjs/core @nestjs/common @nestjs/platform-express

# 5. Start development servers
# Terminal 1: Mobile app
cd mobile && npm start

# Terminal 2: API Gateway
cd backend/gateway && npm run start:dev

# Terminal 3: Individual services
cd backend/services/user-management && npm run start:dev
```

### **Access Development Tools**
- **Mobile App**: Expo Go app or development build
- **API Gateway**: http://localhost:3000
- **Database UI**: http://localhost:8080 (Adminer)
- **Redis UI**: http://localhost:8081 (Redis Commander)
- **API Documentation**: http://localhost:3000/api (Swagger)

---

## 📚 **Documentation**

- **[Architecture Guide](./ARCHITECTURE.md)** - Complete system architecture and microservices design
- **[Project Setup](./PROJECT_SETUP.md)** - Detailed development setup and workflow
- **[Tech Decisions](./TECH_DECISIONS.md)** - Technology choices and rationale
- **[API Documentation](./docs/API.md)** - REST API endpoints and WebSocket events
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

---

## 🎯 **Development Phases**

### **Phase 1: MVP Foundation (8 weeks)**
- ✅ Project structure and Docker environment
- ✅ User authentication and management
- ✅ Basic community creation and management
- ✅ Simple messaging system
- ✅ Mobile app with core navigation

### **Phase 2: Core Features (8 weeks)**
- 📋 Advanced messaging and real-time chat
- 📋 Events and live streaming integration
- 📋 Content management and course system
- 📋 Push notifications and email system
- 📋 AI-powered features and automation

### **Phase 3: Enterprise Features (4 weeks)**
- 📋 Payment and subscription system
- 📋 Advanced analytics and reporting
- 📋 Performance optimization
- 📋 Production deployment and monitoring

---

## 🏢 **Enterprise Benefits**

### **Cost Efficiency**
- **Development**: $5/month → $94/month → $449-649/month scaling
- **100% Free Stack**: No licensing costs for core technologies
- **Open Source**: Full control over codebase and infrastructure

### **Performance & Scalability**
- **Mobile**: 60fps animations with native performance
- **Backend**: Microservices architecture for independent scaling
- **Database**: PostgreSQL with 60% cost savings vs MongoDB Atlas
- **CDN**: Global content delivery with CloudFlare

### **Developer Experience**
- **TypeScript**: End-to-end type safety
- **Modern Tools**: Industry-standard development stack
- **Hot Reload**: Instant feedback during development
- **Universal Code**: Same components work on web and mobile

### **Business Value**
- **Time to Market**: 5x faster development with pre-built components
- **Team Productivity**: Familiar tools and patterns
- **Future-Proof**: Modern architecture ready for scale
- **Vendor Independence**: No platform lock-in

---

## 🤝 **Contributing**

### **Development Standards**
- **Code Style**: ESLint + Prettier for consistent formatting
- **Testing**: Jest for unit tests, Detox for E2E mobile testing
- **Git Flow**: Feature branches with pull request reviews
- **Documentation**: Inline comments and README updates

### **Getting Started with Development**
1. Read the [Project Setup Guide](./PROJECT_SETUP.md)
2. Follow the [Architecture Documentation](./ARCHITECTURE.md)
3. Review existing code patterns in `/mobile/src` and `/backend/services`
4. Submit pull requests with tests and documentation

---

## 📞 **Support & Resources**

### **Development Resources**
- **Expo Documentation**: https://docs.expo.dev/
- **NestJS Documentation**: https://docs.nestjs.com/
- **Gluestack UI**: https://gluestack.io/
- **React Native**: https://reactnative.dev/

### **Community**
- **Discord**: [Join our development community]
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Comprehensive guides in `/docs` folder

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 **Next Steps**

Ready to start building? Check out our detailed setup guides:

1. **[📋 Project Setup Guide](./PROJECT_SETUP.md)** - Complete development environment setup
2. **[🏗️ Architecture Overview](./ARCHITECTURE.md)** - System design and microservices breakdown
3. **[🎯 Tech Decisions](./TECH_DECISIONS.md)** - Technology choices and enterprise benefits

**Let's build the future of community platforms together!** 🚀
