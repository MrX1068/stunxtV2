import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores/auth';

export const testTokenRefresh = async () => {
  try {
    console.log('🧪 Testing token refresh functionality...');
    
    // Method 1: Set an invalid/expired token
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    await SecureStore.setItemAsync('accessToken', invalidToken);
    
    // Update the auth store with the invalid token
    useAuthStore.getState().setToken(invalidToken);
    
    console.log('✅ Set invalid token. Now make an API call to test refresh!');
    console.log('🔍 Watch the console for token refresh logs');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting test token:', error);
    return false;
  }
};

export const testTokenRefreshWithExpiredToken = async () => {
  try {
    console.log('🧪 Testing with expired token...');
    
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
    
    console.log('✅ Set expired token. Make API calls to test refresh!');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting expired token:', error);
    return false;
  }
};

export const clearAllTokens = async () => {
  try {
    console.log('🧹 Clearing all tokens...');
    
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    
    // Use logout to properly clear the auth state
    await useAuthStore.getState().logout();
    
    console.log('✅ All tokens cleared');
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
    return false;
  }
};

export const testMultipleApiCalls = async () => {
  try {
    console.log('🧪 Testing multiple simultaneous API calls with invalid token...');
    
    // Set invalid token first
    await testTokenRefresh();
    
    // Import API store
    const { useApiStore } = await import('../stores/api');
    const api = useApiStore.getState();
    
    // Make multiple API calls simultaneously
    console.log('🚀 Making 5 simultaneous API calls...');
    
    const promises = [
      api.get('/communities'),
      api.get('/users/profile'),
      api.get('/posts'),
      api.get('/notifications'),
      api.get('/settings')
    ];
    
    const results = await Promise.allSettled(promises);
    
    console.log('📊 Results:', results);
    
    return results;
  } catch (error) {
    console.error('❌ Error testing multiple API calls:', error);
    return false;
  }
};
