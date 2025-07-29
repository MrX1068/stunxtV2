# StunxtV2 Authentication API Testing Guide (PowerShell/Curl)

## Prerequisites
- Make sure your backend server is running on http://localhost:3000
- Install curl if not available (comes with Windows 10+)

## Step-by-Step Testing Flow

### 1. Register a New User
```powershell
curl -X POST http://localhost:3000/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","username":"testuser","fullName":"Test User","password":"Password123!","confirmPassword":"Password123!"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "username": "testuser",
      "fullName": "Test User",
      "status": "pending_verification"
    }
  }
}
```

### 2. Check Console for OTP Code
Since we don't have real email configured, check the server console for the OTP code that would be sent via email.

### 3. Verify Email with OTP
```powershell
# Replace 123456 with the actual OTP from console
curl -X POST http://localhost:3000/auth/verify-email `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","otp":"123456"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "emailVerified": true,
      "status": "active"
    }
  }
}
```

### 4. Login with Verified User
```powershell
curl -X POST http://localhost:3000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Password123!"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "username": "testuser",
      "fullName": "Test User"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    },
    "session": {
      "id": "session-uuid",
      "deviceType": "web",
      "ipAddress": "127.0.0.1"
    }
  }
}
```

### 5. Save Tokens for Protected Endpoints
**IMPORTANT:** Copy the `accessToken` and `refreshToken` from the login response for use in subsequent requests.

### 6. Get Current User Profile (Protected)
```powershell
# Replace YOUR_ACCESS_TOKEN with the actual token from login
curl -X GET http://localhost:3000/auth/me `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Get User Sessions (Protected)
```powershell
curl -X GET http://localhost:3000/auth/sessions `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 8. Get Security Statistics (Protected)
```powershell
curl -X GET http://localhost:3000/auth/security/stats `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 9. Change Password (Protected)
```powershell
curl -X PUT http://localhost:3000/auth/change-password `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"currentPassword":"Password123!","newPassword":"NewPassword123!","confirmPassword":"NewPassword123!"}'
```

### 10. Test Forgot Password Flow
```powershell
curl -X POST http://localhost:3000/auth/forgot-password `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com"}'
```

### 11. Reset Password with OTP
```powershell
# Check console for reset OTP code
curl -X POST http://localhost:3000/auth/reset-password `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","otp":"123456","newPassword":"ResetPassword123!","confirmPassword":"ResetPassword123!"}'
```

### 12. Refresh Token
```powershell
# Replace YOUR_REFRESH_TOKEN with the actual refresh token
curl -X POST http://localhost:3000/auth/refresh `
  -H "Content-Type: application/json" `
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### 13. Logout (Protected)
```powershell
curl -X POST http://localhost:3000/auth/logout `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

## Alternative Testing Methods

### Using VS Code REST Client Extension
1. Install the "REST Client" extension in VS Code
2. Open the `auth-api-tests.http` file we created
3. Click "Send Request" above each endpoint

### Using Postman
1. Import the endpoints as a Postman collection
2. Set up environment variables for tokens
3. Test each endpoint in sequence

### Using Thunder Client (VS Code Extension)
1. Install Thunder Client extension
2. Create requests for each endpoint
3. Use variables for tokens

## Important Notes

1. **Email Verification**: Since real email isn't configured, check the console output for OTP codes
2. **Rate Limiting**: The API has rate limiting enabled, so don't send requests too quickly
3. **Token Expiry**: Access tokens expire after 1 hour by default
4. **Session Management**: Each login creates a new session that can be managed
5. **Security Features**: Failed login attempts are tracked and can trigger account lockouts

## Testing Different Scenarios

### Test Rate Limiting
Try making multiple rapid requests to see rate limiting in action.

### Test Invalid Credentials
Try logging in with wrong password to test failed attempt tracking.

### Test Token Expiry
Wait for token to expire or manually test with invalid token.

### Test Session Management
Login from multiple "devices" and manage sessions.

## Expected Server Console Output
When testing, you should see:
- OTP codes for email verification and password reset
- Database queries being executed
- Security events being logged
- Session creation and management logs
