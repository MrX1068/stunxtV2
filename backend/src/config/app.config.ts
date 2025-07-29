export const appConfig = () => ({
  app: {
    name: process.env.APP_NAME || 'StunxtV2',
    version: process.env.APP_VERSION || '2.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    url: process.env.APP_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:3000').split(','),
    sessionSecret: process.env.SESSION_SECRET || 'super-secret-session-key-change-in-production',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD || '5', 10),
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '1800000', 10), // 30 minutes
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10), // 24 hours
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    passwordRequireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
    passwordRequireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true',
    passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10), // seconds
    limit: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10), // requests per ttl
    authTtl: parseInt(process.env.AUTH_RATE_LIMIT_TTL || '60', 10), // seconds
    authLimit: parseInt(process.env.AUTH_RATE_LIMIT_REQUESTS || '10', 10), // auth requests per ttl
  },
  email: {
    from: process.env.EMAIL_FROM || 'noreply@stunxt.com',
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    secure: process.env.EMAIL_SECURE === 'true',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3: {
      bucket: process.env.S3_BUCKET || 'stunxt-uploads',
      endpoint: process.env.S3_ENDPOINT || '',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    },
  },
  websocket: {
    port: parseInt(process.env.WS_PORT || '3001', 10),
    cors: {
      origin: (process.env.WS_ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:3000').split(','),
      credentials: true,
    },
  },
});
