export const databaseConfig = () => {
  const databaseType = process.env.DATABASE_TYPE || 'postgres';
  
  const baseConfig = {
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    autoLoadEntities: true,
    retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY || '3000', 10),
    maxQueryExecutionTime: parseInt(process.env.DATABASE_MAX_QUERY_TIME || '5000', 10),
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

  // PostgreSQL configuration
  return {
    database: {
      type: 'postgres' as const,
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      name: process.env.DATABASE_NAME || 'stunxtv2',
      ssl: process.env.DATABASE_SSL === 'true',
      ...baseConfig,
      extra: {
        connectionLimit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10),
        acquireTimeout: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT || '60000', 10),
        timeout: parseInt(process.env.DATABASE_TIMEOUT || '60000', 10),
      },
    },
  };
};
