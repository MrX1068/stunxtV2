# 🚀 StuntX Notification Service

Enterprise-grade notification microservice for the StuntX platform. Handles email, SMS, push notifications, and in-app notifications with multi-provider support and advanced analytics.

## 🎯 Features

### ✅ **Multi-Channel Notifications**
- **Email**: Brevo (Sendinblue) integration with templates
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **Web Push**: VAPID-based browser notifications
- **SMS**: Twilio integration for security alerts
- **In-App**: Database-stored notifications

### ✅ **Enterprise Features**
- **Queue Management**: Bull/Redis for async processing
- **Rate Limiting**: Throttling to prevent abuse
- **Analytics**: Comprehensive delivery tracking
- **Templates**: Handlebars-based email templates
- **Webhooks**: Provider callback handling
- **Monitoring**: Health checks and metrics

### ✅ **Cost Optimization**
- **Free Tiers**: FCM unlimited, Brevo 9k emails/month
- **Smart Routing**: Email → Brevo, SMS → Twilio (security only)
- **Efficient Scaling**: €15/month startup → €215/month enterprise

## 🛠️ Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: MySQL with TypeORM
- **Queue**: Redis + Bull
- **Email**: Brevo (Sendinblue) API
- **Push**: Firebase Admin SDK
- **SMS**: Twilio API
- **Documentation**: Swagger/OpenAPI

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Redis 6.0+
- Docker (optional)

### Installation

1. **Clone and Setup**
   ```bash
   cd backend/services/notification-service
   
   # Windows
   .\setup.ps1
   
   # Linux/Mac
   chmod +x setup.sh && ./setup.sh
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start Services**
   ```bash
   # With Docker
   docker-compose up -d
   
   # Or manually start MySQL & Redis
   # Then run:
   npm run start:dev
   ```

4. **Access API Documentation**
   ```
   http://localhost:3001/api/docs
   ```

## ⚙️ Configuration

### Required API Keys

#### Brevo (Email Service)
```env
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@stunxt.com
BREVO_SENDER_NAME=StuntX Platform
```
**Get API Key**: [Brevo Dashboard](https://app.brevo.com/settings/keys/api)

#### Firebase (Push Notifications)
```env
FIREBASE_CONFIG={"type":"service_account","project_id":"..."}
```
**Setup**: 
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project → Project Settings → Service Accounts
3. Generate new private key → Copy JSON content

#### VAPID (Web Push)
```env
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:admin@stunxt.com
```
**Generate Keys**: 
```bash
npx web-push generate-vapid-keys
```

#### Twilio (SMS - Optional)
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```
**Get Credentials**: [Twilio Console](https://console.twilio.com/)

## 📡 API Endpoints

### Core Notification API
```http
POST /api/notifications/send
POST /api/notifications/send-template
POST /api/notifications/bulk-send
GET  /api/notifications/user/:userId
GET  /api/notifications/analytics
```

### Email API
```http
POST /api/email/send
POST /api/email/send-template
POST /api/email/welcome
POST /api/email/password-reset
POST /api/email/send-bulk
```

### Push Notifications API
```http
POST /api/push/send
POST /api/push/send-web
POST /api/push/topic/:topic
POST /api/push/subscribe
GET  /api/push/vapid-key
```

### SMS API
```http
POST /api/sms/send
POST /api/sms/verification-code
POST /api/sms/2fa-code
POST /api/sms/security-alert
GET  /api/sms/status/:messageSid
```

### Analytics API
```http
GET /api/analytics/overview
GET /api/analytics/by-type
GET /api/analytics/daily
```

### Webhooks
```http
POST /api/webhooks/brevo
POST /api/webhooks/twilio
POST /api/webhooks/fcm
```

## 💡 Usage Examples

### Send Welcome Email
```typescript
const response = await fetch('http://localhost:3001/api/email/welcome', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'user@example.com',
    userName: 'John Doe'
  })
});
```

### Send Push Notification
```typescript
const response = await fetch('http://localhost:3001/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    title: 'New Message',
    body: 'You have a new message from Sarah',
    deviceTokens: ['fcm_token_here'],
    actionUrl: '/messages/123'
  })
});
```

### Send Template Notification
```typescript
const response = await fetch('http://localhost:3001/api/notifications/send-template', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    templateKey: 'post_liked',
    variables: {
      userName: 'John',
      postTitle: 'My Amazing Post',
      likerName: 'Sarah'
    },
    recipient: 'user@example.com'
  })
});
```

## 📊 Analytics & Monitoring

### Real-time Analytics
- Delivery rates by channel
- Open/click tracking
- Failure analysis
- Daily/weekly reports

### Performance Metrics
- Queue processing times
- Provider response times
- Error rates and trends
- Cost tracking

### Health Monitoring
```bash
# Check service health
curl http://localhost:3001/api/health

# Get metrics
curl http://localhost:3001/api/metrics
```

## 🔧 Development

### Scripts
```bash
npm run start:dev    # Development with hot reload
npm run start:debug  # Debug mode
npm run build        # Production build
npm run test         # Run tests
npm run lint         # ESLint check
```

### Database Migrations
```bash
# Generate migration
npm run typeorm:migration:generate -- -n MigrationName

# Run migrations
npm run typeorm:migration:run

# Revert migration
npm run typeorm:migration:revert
```

### Queue Management
```bash
# Monitor queues
npm run queue:monitor

# Clear failed jobs
npm run queue:clear:failed

# Retry failed jobs
npm run queue:retry:failed
```

## 🚀 Deployment

### Docker Production
```bash
# Build image
docker build -t stunxt-notification-service .

# Run with compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
```env
NODE_ENV=production
PORT=3001
DB_HOST=your_mysql_host
REDIS_HOST=your_redis_host
# ... API keys
```

### Scaling
- **Horizontal**: Multiple service instances behind load balancer
- **Queue Workers**: Separate worker processes for heavy loads
- **Database**: Read replicas for analytics queries

## 💰 Cost Analysis

### Startup Phase (€15/month)
- Brevo: FREE (9,000 emails)
- FCM: FREE (unlimited)
- Web Push: FREE (native browser)
- Twilio SMS: Pay-per-use (€0.05/SMS)
- Infrastructure: €15/month

### Growth Phase (€65/month)
- Brevo: €39/month (100,000 emails)
- FCM: FREE
- Web Push: FREE
- Twilio SMS: €1/month
- Infrastructure: €25/month

### Enterprise Phase (€215/month)
- Brevo: €149/month (1M+ emails)
- FCM: FREE
- Web Push: FREE
- Twilio SMS: €16/month
- Infrastructure: €50/month

## 🔒 Security

### Authentication
- JWT token validation
- API key authentication
- Webhook signature verification

### Rate Limiting
- Per-IP limits
- Per-user limits
- Queue throttling

### Data Protection
- Encrypted sensitive data
- GDPR compliant
- PII handling

## 📚 Templates

### Default Templates
- `welcome_email`: User registration
- `password_reset`: Password recovery
- `post_liked`: Social engagement
- `security_alert`: Account security
- `verification_code`: Phone/email verification

### Custom Templates
```typescript
// Create template
POST /api/templates
{
  "key": "custom_template",
  "name": "Custom Notification",
  "type": "email",
  "subject": "Hello {{userName}}!",
  "template": "<h1>Welcome {{userName}}</h1>",
  "variables": ["userName"]
}
```

## 🤝 Integration

### Main Application Integration
```typescript
// In your main app
class NotificationClient {
  async sendEmail(data) {
    return fetch('http://notification-service:3001/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}
```

### Event-Driven Integration
```typescript
// React to events
eventEmitter.on('user.registered', async (user) => {
  await notificationClient.sendEmail({
    to: user.email,
    templateKey: 'welcome_email',
    variables: { userName: user.name }
  });
});
```

## 🆘 Troubleshooting

### Common Issues

**Service won't start**
```bash
# Check logs
docker-compose logs notification-service

# Verify environment
npm run config:check
```

**Email not sending**
```bash
# Test Brevo API
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: YOUR_API_KEY"
```

**Push notifications failing**
```bash
# Validate Firebase config
npm run firebase:test
```

### Debug Mode
```bash
NODE_ENV=development DEBUG=* npm run start:dev
```

## 📈 Roadmap

- **Q1 2025**: WhatsApp Business API integration
- **Q2 2025**: Advanced A/B testing for templates
- **Q3 2025**: ML-powered send time optimization
- **Q4 2025**: Multi-language template support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: [Full API Docs](http://localhost:3001/api/docs)
- **Issues**: GitHub Issues
- **Email**: dev@stunxt.com

---

**Built with ❤️ for the StuntX Platform**
