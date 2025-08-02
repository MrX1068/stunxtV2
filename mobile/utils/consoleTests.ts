// Quick console test commands - paste these in your console or add to any component

// Test 1: Set invalid token and make API call
const testInvalidToken = async () => {
  const { testTokenRefresh } = await import('../utils/testTokenRefresh');
  const { useApiStore } = await import('../stores/api');
  
  console.log('🧪 Setting invalid token...');
  await testTokenRefresh();
  
  console.log('🚀 Making API call that should trigger refresh...');
  try {
    const result = await useApiStore.getState().get('/communities');
    console.log('✅ Success after refresh:', result);
  } catch (error) {
    console.error('❌ Failed:', error);
  }
};

// Test 2: Multiple simultaneous calls
const testMultiple = async () => {
  const { testTokenRefresh } = await import('../utils/testTokenRefresh');
  const { useApiStore } = await import('../stores/api');
  
  await testTokenRefresh();
  const api = useApiStore.getState();
  
  console.log('🚀 Making 3 simultaneous API calls...');
  const promises = [
    api.get('/communities'),
    api.get('/users/profile'),
    api.get('/posts')
  ];
  
  try {
    const results = await Promise.allSettled(promises);
    console.log('📊 Results:', results);
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// To run these tests, call:
// testInvalidToken();
// testMultiple();

export { testInvalidToken, testMultiple };
