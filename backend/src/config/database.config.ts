export const databaseConfig = () => {
  const databaseType = process.env.DATABASE_TYPE || 'postgres';
  
  const baseConfig = {
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    autoLoadEntities: true,
    retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY || '1000', 10), // Reduced from 3000ms
    maxQueryExecutionTime: parseInt(process.env.DATABASE_MAX_QUERY_TIME || '2000', 10), // Reduced from 5000ms for faster timeouts
  };

  if (databaseType === 'sqlite') {
    return {
      database: {
        type: 'sqlite' as const,
        database: process.env.DATABASE_NAME || 'database.sqlite',
        ...baseConfig,
      },
    };
  }

  // PostgreSQL configuration optimized for real-time messaging
  return {
    database: {
      type: 'postgres' as const,
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'stunxtv2',
      ssl: process.env.DATABASE_SSL === 'true',
      ...baseConfig,
      extra: {
        // Optimized connection pool settings for real-time messaging
        connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '20', 10), // Increased from 10
        acquireTimeout: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT || '30000', 10), // Reduced from 60000ms 
        timeout: parseInt(process.env.DATABASE_TIMEOUT || '20000', 10), // Reduced from 60000ms
        idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '10000', 10), // Add idle timeout
        // PostgreSQL specific optimizations
        max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10),
        min: parseInt(process.env.DATABASE_MIN_CONNECTIONS || '5', 10),
        // Connection pool configuration for better performance
        statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '15000', 10), // 15s statement timeout
        query_timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '10000', 10), // 10s query timeout
        // Enable connection keep-alive
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
      },
    },
  };
};
