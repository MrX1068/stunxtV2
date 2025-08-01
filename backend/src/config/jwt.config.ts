export const jwtConfig = () => ({
  jwt: {
    // JWT Settings
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-production',
    
    // Token Expiration (in seconds)
    accessTokenExpiration: parseInt(process.env.JWT_ACCESS_EXPIRES_IN) || 3600, // 1 hour (changed from 15 minutes)
    refreshTokenExpiration: parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 604800, // 7 days
    refreshTokenLongExpiration: parseInt(process.env.JWT_REFRESH_LONG_EXPIRES_IN) || 5184000, // 60 days (changed from 30 days)
    
    // OTP Settings
    otpExpiration: parseInt(process.env.OTP_EXPIRES_IN) || 600, // 10 minutes
    
    // JWT Metadata
    issuer: process.env.JWT_ISSUER || 'stunxt.com',
    audience: process.env.JWT_AUDIENCE || 'stunxt-users',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  },
});
