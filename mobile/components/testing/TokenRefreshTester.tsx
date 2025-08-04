import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { 
  testTokenRefresh, 
  testTokenRefreshWithExpiredToken, 
  clearAllTokens, 
  testMultipleApiCalls 
} from '../../utils/testTokenRefresh';
import { useApiStore } from '../../stores/api';
import { useAuthStore } from '../../stores/auth';

export const TokenRefreshTester: React.FC = () => {
  const { get } = useApiStore();
  const { token, refreshToken } = useAuthStore();

  const handleTestInvalidToken = async () => {
    const success = await testTokenRefresh();
    if (success) {
      Alert.alert('Test Setup', 'Invalid token set! Now try making an API call.');
    }
  };

  const handleTestExpiredToken = async () => {
    const success = await testTokenRefreshWithExpiredToken();
    if (success) {
      Alert.alert('Test Setup', 'Expired token set! Now try making an API call.');
    }
  };

  const handleTestApiCall = async () => {
    try {
     
      const result = await get('/communities');
     
      Alert.alert('Success', 'API call completed! Check console for details.');
    } catch (error) {
      Alert.alert('Error', 'API call failed! Check console for details.');
    }
  };

  const handleTestMultipleCalls = async () => {
   
    const results = await testMultipleApiCalls();
    Alert.alert('Test Complete', 'Multiple API calls test completed! Check console for results.');
  };

  const handleClearTokens = async () => {
    const success = await clearAllTokens();
    if (success) {
      Alert.alert('Cleared', 'All tokens cleared!');
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
        🧪 Token Refresh Tester
      </Text>
      
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#e8f4fd', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Current Status:</Text>
        <Text>Token: {token ? '✅ Present' : '❌ None'}</Text>
        <Text>Refresh Token: {refreshToken ? '✅ Present' : '❌ None'}</Text>
      </View>

      <View style={{ gap: 15 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleTestInvalidToken}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            1. Set Invalid Token
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#FF9500',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleTestExpiredToken}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            2. Set Expired Token
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#34C759',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleTestApiCall}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            3. Test Single API Call
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#AF52DE',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleTestMultipleCalls}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            4. Test Multiple API Calls
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#FF3B30',
            padding: 15,
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={handleClearTokens}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
            Clear All Tokens
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 30, padding: 15, backgroundColor: '#fff3cd', borderRadius: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Testing Instructions:</Text>
        <Text style={{ fontSize: 12, lineHeight: 18 }}>
          1. Click "Set Invalid Token" to simulate an expired token{'\n'}
          2. Click "Test Single API Call" to see the refresh mechanism work{'\n'}
          3. Click "Test Multiple API Calls" to test the queue system{'\n'}
          4. Watch the console logs to see the token refresh process{'\n'}
          5. Use "Clear All Tokens" to reset the test
        </Text>
      </View>
    </ScrollView>
  );
};
