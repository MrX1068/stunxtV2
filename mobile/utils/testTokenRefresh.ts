import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/auth';

export const testTokenRefresh = async () => {
  try {
    
    // Method 1: Set an invalid/expired token
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    await SecureStore.setItemAsync('accessToken', invalidToken);
    
    // Update the auth store with the invalid token
    useAuthStore.getState().setToken(invalidToken);
    
    
    
    return true;
  } catch (error) {
    return false;
  }
};

export const testTokenRefreshWithExpiredToken = async () => {
  try {
   
    // Create a token that expired 1 hour ago
    const expiredPayload = {
      sub: "test-user-id",
      email: "test@example.com",
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago (expired)
    };
    
    // This is just for testing - in real scenario, backend would generate this
    const expiredToken = 'expired.token.here';
    
    await SecureStore.setItemAsync('accessToken', expiredToken);
    useAuthStore.getState().setToken(expiredToken);
    
  
    
    return true;
  } catch (error) {
    return false;
  }
};

export const clearAllTokens = async () => {
  try {
    
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    
    // Use logout to properly clear the auth state
    await useAuthStore.getState().logout();
    
    
    return true;
  } catch (error) {
    return false;
  }
};

export const testMultipleApiCalls = async () => {
  try {
    
    // Set invalid token first
    await testTokenRefresh();
    
    // Import API store
    const { useApiStore } = await import('../stores/api');
    const api = useApiStore.getState();
    
    // Make multiple API calls simultaneously
  
    
    const promises = [
      api.get('/communities'),
      api.get('/users/profile'),
      api.get('/posts'),
      api.get('/notifications'),
      api.get('/settings')
    ];
    
    const results = await Promise.allSettled(promises);
    

    
    return results;
  } catch (error) {
    return false;
  }
};
