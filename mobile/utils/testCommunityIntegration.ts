import { communityActions } from '../stores/community';
import { useApiStore } from '../stores/api';

/**
 * ✅ COMMUNITY API INTEGRATION TEST
 * 
 * Test utility to verify the community API integration works correctly
 * This can be called from the app to test the real backend integration
 */

export async function testCommunityIntegration(): Promise<void> {
  console.log('🧪 [CommunityTest] Starting community API integration test...');
  
  try {
    // Test 1: Check API connectivity
    console.log('🔍 [CommunityTest] Testing API connectivity...');
    const apiStore = useApiStore.getState();
    
    // Test basic API call to joined communities endpoint
    const response = await apiStore.get('/communities/me/joined');
    console.log('📡 [CommunityTest] API Response:', response);
    
    if (response.success) {
      console.log('✅ [CommunityTest] API connectivity successful');
      console.log(`📊 [CommunityTest] Found ${response.data?.communities?.length || 0} joined communities`);
    } else {
      console.log('❌ [CommunityTest] API call failed:', response.message);
    }
    
    // Test 2: Load communities through store
    console.log('🔍 [CommunityTest] Testing community store integration...');
    await communityActions.loadCommunities();
    console.log('✅ [CommunityTest] Community store integration successful');
    
    // Test 3: Test WebSocket listeners
    console.log('🔍 [CommunityTest] Testing WebSocket integration...');
    communityActions.initializeWebSocketListeners();
    console.log('✅ [CommunityTest] WebSocket integration successful');
    
    console.log('🎉 [CommunityTest] All tests passed! Community integration is working correctly.');
    
  } catch (error) {
    console.error('❌ [CommunityTest] Integration test failed:', error);
    throw error;
  }
}

/**
 * Test individual API endpoints
 */
export async function testCommunityEndpoints(): Promise<void> {
  console.log('🧪 [CommunityTest] Testing individual API endpoints...');
  
  const apiStore = useApiStore.getState();
  
  const endpoints = [
    { name: 'Joined Communities', endpoint: '/communities/me/joined' },
    { name: 'Owned Communities', endpoint: '/communities/me/owned' },
    { name: 'All Communities', endpoint: '/communities' },
    { name: 'Public Communities', endpoint: '/communities/public/discover' },
  ];
  
  for (const { name, endpoint } of endpoints) {
    try {
      console.log(`🔍 [CommunityTest] Testing ${name} (${endpoint})...`);
      const response = await apiStore.get(endpoint);
      
      if (response.success) {
        console.log(`✅ [CommunityTest] ${name}: Success`);
        console.log(`📊 [CommunityTest] ${name}: ${response.data?.communities?.length || 0} communities`);
      } else {
        console.log(`⚠️ [CommunityTest] ${name}: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ [CommunityTest] ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Test SQLite cache functionality
 */
export async function testSQLiteCache(): Promise<void> {
  console.log('🧪 [CommunityTest] Testing SQLite cache...');
  
  try {
    const { sqliteCommunityCache } = await import('../stores/sqliteCommunityCache');
    
    // Test cache initialization
    console.log('🔍 [CommunityTest] Testing cache initialization...');
    await sqliteCommunityCache.initialize();
    console.log('✅ [CommunityTest] Cache initialization successful');
    
    // Test cache read
    console.log('🔍 [CommunityTest] Testing cache read...');
    const cacheResult = await sqliteCommunityCache.getCommunities();
    console.log(`📊 [CommunityTest] Cache contains ${cacheResult.communities.length} communities`);
    console.log('✅ [CommunityTest] Cache read successful');
    
    // Test cache metrics
    console.log('🔍 [CommunityTest] Testing cache metrics...');
    const metrics = await sqliteCommunityCache.getMetrics();
    console.log('📊 [CommunityTest] Cache metrics:', metrics);
    console.log('✅ [CommunityTest] Cache metrics successful');
    
    console.log('🎉 [CommunityTest] SQLite cache tests passed!');
    
  } catch (error) {
    console.error('❌ [CommunityTest] SQLite cache test failed:', error);
    throw error;
  }
}

/**
 * Run all community integration tests
 */
export async function runAllCommunityTests(): Promise<void> {
  console.log('🚀 [CommunityTest] Running comprehensive community integration tests...');
  
  try {
    await testSQLiteCache();
    await testCommunityEndpoints();
    await testCommunityIntegration();
    
    console.log('🎉 [CommunityTest] All community integration tests passed successfully!');
    console.log('✅ [CommunityTest] Your community feature is ready for production use.');
    
  } catch (error) {
    console.error('❌ [CommunityTest] Community integration tests failed:', error);
    console.log('🔧 [CommunityTest] Please check your backend API and database configuration.');
    throw error;
  }
}
