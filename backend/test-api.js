#!/usr/bin/env node

/**
 * StunxtV2 API Test Suite
 * Comprehensive testing for Community and Space microservices
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let testUserId = null;
let testCommunityId = null;
let testSpaceId = null;

// Test configuration
const testUser = {
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

const testCommunity = {
  name: `Test Community ${Date.now()}`,
  description: 'A test community for API validation',
  type: 'public'
};

const testSpace = {
  name: `Test Space ${Date.now()}`,
  description: 'A test space for API validation',
  type: 'public'
};

// Helper functions
const makeRequest = async (method, url, data = null, useAuth = true) => {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (useAuth && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
};

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
};

// Test functions
const testAuthentication = async () => {
  log('Testing Authentication APIs', 'info');

  // Register user
  log('Registering new user...');
  const registerResult = await makeRequest('POST', '/auth/register', testUser, false);
  
  if (!registerResult.success) {
    log(`Registration failed: ${registerResult.error}`, 'error');
    return false;
  }
  
  log('User registered successfully', 'success');
  testUserId = registerResult.data.user?.id;

  // Login user
  log('Logging in user...');
  const loginResult = await makeRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  }, false);

  if (!loginResult.success) {
    log(`Login failed: ${loginResult.error}`, 'error');
    return false;
  }

  authToken = loginResult.data.access_token;
  log('User logged in successfully', 'success');
  return true;
};

const testCommunityAPIs = async () => {
  log('Testing Community APIs', 'info');

  // Create community
  log('Creating community...');
  const createResult = await makeRequest('POST', '/communities', testCommunity);
  
  if (!createResult.success) {
    log(`Community creation failed: ${createResult.error}`, 'error');
    return false;
  }

  testCommunityId = createResult.data.id;
  log(`Community created with ID: ${testCommunityId}`, 'success');

  // Get community
  log('Fetching community...');
  const getResult = await makeRequest('GET', `/communities/${testCommunityId}`);
  
  if (!getResult.success) {
    log(`Failed to fetch community: ${getResult.error}`, 'error');
    return false;
  }

  log('Community fetched successfully', 'success');

  // Get all communities
  log('Fetching all communities...');
  const getAllResult = await makeRequest('GET', '/communities');
  
  if (!getAllResult.success) {
    log(`Failed to fetch communities: ${getAllResult.error}`, 'error');
    return false;
  }

  log(`Fetched ${getAllResult.data.communities?.length || 0} communities`, 'success');

  // Join community (should already be owner, but test the endpoint)
  log('Testing community join...');
  const joinResult = await makeRequest('POST', `/communities/${testCommunityId}/join`, {});
  
  // This might fail if already a member, which is expected
  if (joinResult.success) {
    log('Community join tested successfully', 'success');
  } else {
    log(`Community join test: ${joinResult.error}`, 'warning');
  }

  // Get community members
  log('Fetching community members...');
  const membersResult = await makeRequest('GET', `/communities/${testCommunityId}/members`);
  
  if (!membersResult.success) {
    log(`Failed to fetch members: ${membersResult.error}`, 'error');
    return false;
  }

  log(`Community has ${membersResult.data.members?.length || 0} members`, 'success');

  return true;
};

const testSpaceAPIs = async () => {
  log('Testing Space APIs', 'info');

  if (!testCommunityId) {
    log('No community ID available for space testing', 'error');
    return false;
  }

  // Create space
  log('Creating space...');
  const createResult = await makeRequest('POST', `/communities/${testCommunityId}/spaces`, testSpace);
  
  if (!createResult.success) {
    log(`Space creation failed: ${createResult.error}`, 'error');
    return false;
  }

  testSpaceId = createResult.data.id;
  log(`Space created with ID: ${testSpaceId}`, 'success');

  // Get space
  log('Fetching space...');
  const getResult = await makeRequest('GET', `/communities/${testCommunityId}/spaces/${testSpaceId}`);
  
  if (!getResult.success) {
    log(`Failed to fetch space: ${getResult.error}`, 'error');
    return false;
  }

  log('Space fetched successfully', 'success');

  // Get community spaces
  log('Fetching community spaces...');
  const getSpacesResult = await makeRequest('GET', `/communities/${testCommunityId}/spaces`);
  
  if (!getSpacesResult.success) {
    log(`Failed to fetch spaces: ${getSpacesResult.error}`, 'error');
    return false;
  }

  log(`Community has ${getSpacesResult.data.spaces?.length || 0} spaces`, 'success');

  // Join space
  log('Joining space...');
  const joinResult = await makeRequest('POST', `/communities/${testCommunityId}/spaces/${testSpaceId}/join`, {});
  
  if (joinResult.success) {
    log('Space joined successfully', 'success');
  } else {
    log(`Space join test: ${joinResult.error}`, 'warning');
  }

  // Get space members
  log('Fetching space members...');
  const membersResult = await makeRequest('GET', `/communities/${testCommunityId}/spaces/${testSpaceId}/members`);
  
  if (!membersResult.success) {
    log(`Failed to fetch space members: ${membersResult.error}`, 'error');
    return false;
  }

  log(`Space has ${membersResult.data.members?.length || 0} members`, 'success');

  // Test search
  log('Testing space search...');
  const searchResult = await makeRequest('GET', `/communities/${testCommunityId}/spaces/search?q=test`);
  
  if (!searchResult.success) {
    log(`Space search failed: ${searchResult.error}`, 'error');
    return false;
  }

  log(`Search returned ${searchResult.data.spaces?.length || 0} results`, 'success');

  // Test popular spaces
  log('Testing popular spaces...');
  const popularResult = await makeRequest('GET', `/communities/${testCommunityId}/spaces/popular`);
  
  if (!popularResult.success) {
    log(`Popular spaces failed: ${popularResult.error}`, 'error');
    return false;
  }

  log(`Found ${popularResult.data.spaces?.length || 0} popular spaces`, 'success');

  return true;
};

const testGlobalSpaceAPIs = async () => {
  log('Testing Global Space APIs', 'info');

  // Global search
  log('Testing global space search...');
  const searchResult = await makeRequest('GET', '/spaces/search?q=test');
  
  if (!searchResult.success) {
    log(`Global search failed: ${searchResult.error}`, 'error');
    return false;
  }

  log(`Global search returned ${searchResult.data.spaces?.length || 0} results`, 'success');

  // Global popular spaces
  log('Testing global popular spaces...');
  const popularResult = await makeRequest('GET', '/spaces/popular');
  
  if (!popularResult.success) {
    log(`Global popular spaces failed: ${popularResult.error}`, 'error');
    return false;
  }

  log(`Found ${popularResult.data.spaces?.length || 0} globally popular spaces`, 'success');

  // User's all spaces
  log('Testing user\'s all spaces...');
  const userSpacesResult = await makeRequest('GET', '/spaces/me/all');
  
  if (!userSpacesResult.success) {
    log(`User spaces failed: ${userSpacesResult.error}`, 'error');
    return false;
  }

  log(`User is member of ${userSpacesResult.data.spaces?.length || 0} spaces`, 'success');

  return true;
};

const testStatisticsAPIs = async () => {
  log('Testing Statistics APIs', 'info');

  if (!testCommunityId || !testSpaceId) {
    log('Missing community or space ID for statistics testing', 'error');
    return false;
  }

  // Community stats
  log('Testing community statistics...');
  const communityStatsResult = await makeRequest('GET', `/communities/${testCommunityId}/stats`);
  
  if (!communityStatsResult.success) {
    log(`Community stats failed: ${communityStatsResult.error}`, 'error');
    return false;
  }

  log('Community statistics retrieved successfully', 'success');

  // Space stats
  log('Testing space statistics...');
  const spaceStatsResult = await makeRequest('GET', `/communities/${testCommunityId}/spaces/${testSpaceId}/stats`);
  
  if (!spaceStatsResult.success) {
    log(`Space stats failed: ${spaceStatsResult.error}`, 'error');
    return false;
  }

  log('Space statistics retrieved successfully', 'success');

  return true;
};

// Main test runner
const runAllTests = async () => {
  log('Starting StunxtV2 API Test Suite', 'info');
  log('========================================', 'info');

  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Community APIs', fn: testCommunityAPIs },
    { name: 'Space APIs', fn: testSpaceAPIs },
    { name: 'Global Space APIs', fn: testGlobalSpaceAPIs },
    { name: 'Statistics APIs', fn: testStatisticsAPIs }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    log(`\n--- Running ${test.name} Tests ---`, 'info');
    try {
      const result = await test.fn();
      if (result) {
        log(`✅ ${test.name} tests PASSED`, 'success');
        passedTests++;
      } else {
        log(`❌ ${test.name} tests FAILED`, 'error');
      }
    } catch (error) {
      log(`❌ ${test.name} tests CRASHED: ${error.message}`, 'error');
    }
  }

  log('\n========================================', 'info');
  log(`Test Results: ${passedTests}/${totalTests} test suites passed`, passedTests === totalTests ? 'success' : 'error');
  
  if (passedTests === totalTests) {
    log('🎉 All tests passed! Community and Space microservices are working correctly.', 'success');
  } else {
    log('⚠️  Some tests failed. Please check the logs above for details.', 'warning');
  }

  process.exit(passedTests === totalTests ? 0 : 1);
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Test suite crashed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testAuthentication,
  testCommunityAPIs,
  testSpaceAPIs,
  testGlobalSpaceAPIs,
  testStatisticsAPIs
};
