# 🚀 StunxtV2 - Project Setup & Development Guide

## 📁 **Complete Project Structure**

```
stunxtv2/
├── 📱 mobile/                          # Expo React Native App
│   ├── app/                           # Expo Router (file-based routing)
│   │   ├── (auth)/                    # Auth group routes
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/                    # Main app tabs
│   │   │   ├── communities.tsx
│   │   │   ├── messages.tsx
│   │   │   ├── events.tsx
│   │   │   └── profile.tsx
│   │   └── _layout.tsx                # Root layout
│   ├── src/
│   │   ├── components/                # Shared UI components
│   │   ├── features/                  # Feature-based modules
│   │   │   ├── auth/
│   │   │   ├── communities/
│   │   │   ├── discussions/
│   │   │   ├── messaging/
│   │   │   └── events/
│   │   ├── store/                     # Zustand stores
│   │   ├── api/                       # API client & TanStack Query
│   │   └── utils/                     # Utilities & helpers
│   ├── package.json
│   └── app.config.js
│
├── 🌐 backend/                         # Microservices Backend
│   ├── gateway/                       # API Gateway Service
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── services/
│   │   ├── user-management/           # User Service
│   │   ├── community-management/      # Community Service
│   │   ├── discussions/               # Posts & Comments Service
│   │   ├── messaging/                 # Real-time Chat Service
│   │   ├── events/                    # Events & Streaming Service
│   │   ├── content/                   # Courses & Content Service
│   │   ├── notifications/             # Notification Service
│   │   ├── ai-automation/             # AI & Automation Service
│   │   ├── analytics/                 # Analytics Service
│   │   ├── payments/                  # Payment & Subscription Service
│   │   └── email-marketing/           # Email Marketing Service
│   └── shared/                        # Shared libraries
│       ├── database/                  # Database schemas
│       ├── auth/                      # Auth utilities
│       └── events/                    # Event system
│
├── 🗄️ database/                        # Database scripts
│   ├── migrations/
│   ├── seeds/
│   └── schemas/
│
├── 🐳 docker/                          # Docker configuration
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── Dockerfiles/
│
├── 📋 docs/                            # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
│
├── 🧪 tests/                           # E2E & Integration tests
│   ├── e2e/
│   └── integration/
│
├── .github/                           # GitHub Actions
│   └── workflows/
│       ├── mobile-build.yml
│       └── backend-deploy.yml
│
├── README.md
├── TECH_DECISIONS.md
├── ARCHITECTURE.md
└── PROJECT_SETUP.md
```

---

## 🛠️ **Development Environment Setup**

### **Prerequisites**
```bash
# Required tools
- Node.js 18+ (LTS recommended)
- npm or yarn
- Docker Desktop
- Git
- VS Code (recommended)

# For mobile development
- Expo CLI: npm install -g @expo/cli
- EAS CLI: npm install -g eas-cli

# For backend development
- NestJS CLI: npm install -g @nestjs/cli
```

### **Initial Setup Commands**
```bash
# 1. Clone and setup workspace
git clone <repository-url> stunxtv2
cd stunxtv2

# 2. Setup mobile app
cd mobile
npm create expo-app . --template
npm install @gluestack-ui/themed nativewind moti

# 3. Setup backend services
cd ../backend
npm init -y
mkdir gateway services shared

# 4. Setup Docker environment
cd ..
docker-compose -f docker/docker-compose.dev.yml up -d
```

---

## 🏗️ **Service Development Standards**

### **NestJS Service Template**
```typescript
// Standard NestJS service structure
// services/[service-name]/src/

// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
    }),
  ],
})
export class AppModule {}

// Standard folder structure per service:
// src/
//   ├── entities/          # TypeORM entities
//   ├── controllers/       # REST endpoints
//   ├── services/          # Business logic
//   ├── dto/              # Data transfer objects
//   ├── guards/           # Auth guards
//   └── main.ts           # Service entry point
```

### **Database Schema Standards**
```sql
-- Standard table patterns
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit fields for all tables
ALTER TABLE table_name ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE table_name ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE table_name ADD COLUMN deleted_at TIMESTAMP NULL;

-- Indexing strategy
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
```

---

## 📱 **Mobile App Development Guide**

### **Feature Module Structure**
```typescript
// src/features/[feature]/index.ts
export { default as FeatureScreen } from './screens/FeatureScreen';
export { useFeatureStore } from './store/featureStore';
export { featureApi } from './api/featureApi';

// src/features/[feature]/screens/FeatureScreen.tsx
import { Box, VStack, Button } from '@gluestack-ui/themed';
import { MotiView } from 'moti';

export default function FeatureScreen() {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      className="flex-1"
    >
      <Box bg="$backgroundLight0" flex={1} p="$4">
        <VStack space="lg">
          <Button onPress={() => {}}>
            <Button.Text>Feature Action</Button.Text>
          </Button>
        </VStack>
      </Box>
    </MotiView>
  );
}
```

### **API Client Setup**
```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🔧 **Development Workflow**

### **Local Development Process**
```bash
# 1. Start development environment
docker-compose -f docker/docker-compose.dev.yml up -d

# 2. Start API Gateway
cd backend/gateway
npm run start:dev  # Port 3000

# 3. Start individual services
cd ../services/user-management
npm run start:dev  # Port 3001

cd ../community-management
npm run start:dev  # Port 3002

# 4. Start mobile app
cd ../../mobile
npm run start     # Expo development server

# 5. Monitor logs
docker-compose logs -f postgres redis
```

### **Service Development Checklist**
```yaml
For each new service:
  ✅ Create NestJS project structure
  ✅ Setup TypeORM entities
  ✅ Implement CRUD operations
  ✅ Add authentication guards
  ✅ Write unit tests
  ✅ Add API documentation (Swagger)
  ✅ Setup Docker configuration
  ✅ Add health check endpoint
  ✅ Implement error handling
  ✅ Add logging and monitoring
```

---

## 🐳 **Docker Configuration**

### **Development Docker Compose**
```yaml
# docker/docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: stunxtv2_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  api-gateway:
    build:
      context: ../backend/gateway
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ../backend/gateway:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
```

---

## 🧪 **Testing Strategy**

### **Testing Standards**
```typescript
// Unit Tests (Jest)
// backend/services/user-management/src/services/user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should create a user', async () => {
    const userData = { email: 'test@example.com', password: 'password' };
    const result = await service.create(userData);
    expect(result.email).toBe(userData.email);
  });
});

// Integration Tests (Supertest)
// backend/services/user-management/test/user.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(201);
  });
});
```

### **Mobile Testing**
```typescript
// mobile/src/components/__tests__/Button.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@gluestack-ui/themed';

describe('Button Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <Button>
        <Button.Text>Test Button</Button.Text>
      </Button>
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('handles press events', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress}>
        <Button.Text>Test Button</Button.Text>
      </Button>
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

---

## 🚀 **Deployment Strategy**

### **Development Deployment**
```yaml
Environment: Development
Platform: Local Docker + Expo Go

Services:
  - PostgreSQL (Docker)
  - Redis (Docker)
  - API Gateway (localhost:3000)
  - Individual services (localhost:300x)

Mobile:
  - Expo Development Build
  - Hot reload enabled
  - Debug mode active
```

### **Staging Deployment**
```yaml
Environment: Staging
Platform: Railway / Render

Services:
  - Managed PostgreSQL
  - Managed Redis
  - Container deployments
  - Environment variables

Mobile:
  - EAS Build (internal distribution)
  - TestFlight (iOS) / Internal App Sharing (Android)
  - Staging API endpoints
```

### **Production Deployment**
```yaml
Environment: Production
Platform: AWS

Infrastructure:
  - ECS/EKS for services
  - RDS for PostgreSQL
  - ElastiCache for Redis
  - Application Load Balancer
  - CloudFlare CDN

Mobile:
  - App Store & Google Play
  - EAS Build production
  - Production API endpoints
  - Push notification setup
```

---

## 📋 **Development Milestones**

### **Week 1-2: Foundation**
- [x] Project structure setup
- [x] Docker development environment
- [x] API Gateway basic setup
- [x] Database schema design
- [x] Mobile app initialization

### **Week 3-4: Core Services**
- [ ] User Management Service
- [ ] Authentication system
- [ ] Community Management Service
- [ ] Mobile app auth flow

### **Week 5-6: Communication**
- [ ] Discussion & Posts Service
- [ ] Basic messaging system
- [ ] Real-time connections
- [ ] Mobile chat interface

### **Week 7-8: MVP Features**
- [ ] Notification service
- [ ] Basic analytics
- [ ] Mobile app polish
- [ ] Testing and bug fixes

---

## 🔍 **Monitoring & Observability**

### **Development Monitoring**
```yaml
Tools:
  - Console logs for debugging
  - Expo DevTools for mobile
  - PostgreSQL query logs
  - Redis monitoring commands

Health Checks:
  - GET /health for each service
  - Database connection status
  - Redis connection status
  - External service status
```

### **Production Monitoring**
```yaml
Tools:
  - Sentry for error tracking
  - PostHog for analytics
  - CloudWatch for infrastructure
  - Grafana for custom dashboards

Alerts:
  - Service downtime
  - High error rates
  - Database performance
  - Memory/CPU usage
```

---

This setup guide provides a complete development workflow for building the StunxtV2 community platform. Each component is designed to work together while maintaining independence for scalability.

**Ready to start building?** Let me know which service or component you'd like to implement first! 🚀
