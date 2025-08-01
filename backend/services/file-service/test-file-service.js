#!/usr/bin/env node

/**
 * File Service Testing Script
 * Tests virus scanning, file uploads, and service health
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = process.env.FILE_SERVICE_URL || 'http://localhost:3001';
const TEST_FILES_DIR = './test-files';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const levelColors = {
    INFO: 'cyan',
    SUCCESS: 'green',
    ERROR: 'red',
    WARN: 'yellow',
    DEBUG: 'magenta',
  };
  
  console.log(
    `${colorize('bright', timestamp)} ${colorize(levelColors[level] || 'reset', `[${level}]`)} ${message}`
  );
  
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Create test files
function createTestFiles() {
  if (!fs.existsSync(TEST_FILES_DIR)) {
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
  }

  // Create a safe test image
  const safeImageContent = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x5C, 0xC2, 0xD2, 0x4E,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
    0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'safe-image.png'), safeImageContent);

  // Create EICAR test virus file (standard test virus)
  const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'eicar-test.txt'), eicarString);

  // Create a large test file
  const largeContent = Buffer.alloc(1024 * 1024, 'A'); // 1MB of 'A'
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'large-file.txt'), largeContent);

  // Create a text file
  const textContent = 'This is a safe text file for testing file uploads.';
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'safe-text.txt'), textContent);

  log('INFO', 'Created test files', {
    directory: TEST_FILES_DIR,
    files: fs.readdirSync(TEST_FILES_DIR),
  });
}

// Test service health
async function testHealth() {
  try {
    log('INFO', 'Testing service health...');
    
    const response = await axios.get(`${BASE_URL}/health`);
    log('SUCCESS', 'Health check passed', response.data);
    
    // Test virus scanner specific health
    const virusScannerResponse = await axios.get(`${BASE_URL}/health/virus-scanner`);
    log('SUCCESS', 'Virus scanner health check passed', virusScannerResponse.data);
    
    return true;
  } catch (error) {
    log('ERROR', 'Health check failed', {
      message: error.message,
      response: error.response?.data,
    });
    return false;
  }
}

// Test file upload
async function testFileUpload(filename, expectedResult = 'success') {
  try {
    const filePath = path.join(TEST_FILES_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      log('ERROR', `Test file not found: ${filename}`);
      return false;
    }

    log('INFO', `Testing file upload: ${filename} (expecting: ${expectedResult})`);

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('privacy', 'public');
    form.append('category', 'test');

    const response = await axios.post(`${BASE_URL}/upload`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000, // 30 seconds
    });

    if (expectedResult === 'success') {
      log('SUCCESS', `File uploaded successfully: ${filename}`, response.data);
      return true;
    } else {
      log('WARN', `Upload succeeded but was expected to fail: ${filename}`, response.data);
      return false;
    }
  } catch (error) {
    if (expectedResult === 'virus_detected' && error.response?.status === 400) {
      log('SUCCESS', `Virus correctly detected and blocked: ${filename}`, error.response.data);
      return true;
    } else if (expectedResult === 'fail') {
      log('SUCCESS', `Upload correctly failed: ${filename}`, error.response?.data || error.message);
      return true;
    } else {
      log('ERROR', `Upload failed unexpectedly: ${filename}`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return false;
    }
  }
}

// Test multiple file upload
async function testMultipleFileUpload() {
  try {
    log('INFO', 'Testing multiple file upload...');

    const form = new FormData();
    form.append('files', fs.createReadStream(path.join(TEST_FILES_DIR, 'safe-image.png')));
    form.append('files', fs.createReadStream(path.join(TEST_FILES_DIR, 'safe-text.txt')));
    form.append('privacy', 'private');
    form.append('category', 'test-multiple');

    const response = await axios.post(`${BASE_URL}/upload/multiple`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 60000, // 60 seconds
    });

    log('SUCCESS', 'Multiple files uploaded successfully', response.data);
    return true;
  } catch (error) {
    log('ERROR', 'Multiple file upload failed', {
      message: error.message,
      response: error.response?.data,
    });
    return false;
  }
}

// Test virus scanning specifically
async function testVirusScanning() {
  try {
    log('INFO', 'Testing virus scanning capabilities...');

    // First, check if virus scanning is enabled
    const healthResponse = await axios.get(`${BASE_URL}/health/virus-scanner`);
    const virusScannerStatus = healthResponse.data;

    if (!virusScannerStatus.enabled) {
      log('WARN', 'Virus scanning is disabled, skipping virus tests');
      return true;
    }

    if (virusScannerStatus.status !== 'available') {
      log('WARN', 'Virus scanner is not available, skipping virus tests', virusScannerStatus);
      return true;
    }

    log('INFO', 'Virus scanner is available, testing with EICAR file...', virusScannerStatus);

    // Test with EICAR test virus
    return await testFileUpload('eicar-test.txt', 'virus_detected');
  } catch (error) {
    log('ERROR', 'Virus scanning test failed', {
      message: error.message,
      response: error.response?.data,
    });
    return false;
  }
}

// Performance test
async function testPerformance() {
  try {
    log('INFO', 'Testing upload performance with large file...');
    
    const startTime = Date.now();
    const success = await testFileUpload('large-file.txt', 'success');
    const endTime = Date.now();
    
    if (success) {
      const duration = endTime - startTime;
      const throughput = (1024 / (duration / 1000)).toFixed(2); // KB/s
      
      log('SUCCESS', 'Performance test completed', {
        fileSize: '1MB',
        duration: `${duration}ms`,
        throughput: `${throughput} KB/s`,
      });
    }
    
    return success;
  } catch (error) {
    log('ERROR', 'Performance test failed', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('INFO', colorize('bright', '🧪 Starting File Service Tests'));
  log('INFO', `Testing against: ${BASE_URL}`);
  
  createTestFiles();
  
  const tests = [
    { name: 'Service Health', test: testHealth },
    { name: 'Safe Image Upload', test: () => testFileUpload('safe-image.png', 'success') },
    { name: 'Safe Text Upload', test: () => testFileUpload('safe-text.txt', 'success') },
    { name: 'Virus Scanning', test: testVirusScanning },
    { name: 'Multiple File Upload', test: testMultipleFileUpload },
    { name: 'Performance Test', test: testPerformance },
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    log('INFO', colorize('bright', `\n📋 Running: ${name}`));
    
    try {
      const startTime = Date.now();
      const success = await test();
      const duration = Date.now() - startTime;
      
      results.push({
        name,
        success,
        duration,
      });
      
      if (success) {
        log('SUCCESS', `✅ ${name} passed (${duration}ms)`);
      } else {
        log('ERROR', `❌ ${name} failed (${duration}ms)`);
      }
    } catch (error) {
      log('ERROR', `💥 ${name} crashed`, error.message);
      results.push({
        name,
        success: false,
        duration: 0,
        error: error.message,
      });
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  log('INFO', colorize('bright', '\n📊 Test Summary'));
  console.log(`${colorize('green', `✅ Passed: ${passed}`)} | ${colorize('red', `❌ Failed: ${total - passed}`)} | ${colorize('blue', `📋 Total: ${total}`)}`);
  
  if (passed === total) {
    log('SUCCESS', colorize('bright', '🎉 All tests passed!'));
    process.exit(0);
  } else {
    log('ERROR', colorize('bright', '❌ Some tests failed'));
    process.exit(1);
  }
}

// Cleanup function
function cleanup() {
  try {
    if (fs.existsSync(TEST_FILES_DIR)) {
      fs.rmSync(TEST_FILES_DIR, { recursive: true, force: true });
      log('INFO', 'Cleaned up test files');
    }
  } catch (error) {
    log('WARN', 'Failed to cleanup test files', error.message);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('INFO', 'Received SIGINT, cleaning up...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', 'Received SIGTERM, cleaning up...');
  cleanup();
  process.exit(0);
});

// Check if axios is available
try {
  require.resolve('axios');
  require.resolve('form-data');
} catch (error) {
  log('ERROR', 'Required dependencies not found. Please install: npm install axios form-data');
  process.exit(1);
}

// Run the tests
runTests().catch(error => {
  log('ERROR', 'Test runner crashed', error.message);
  cleanup();
  process.exit(1);
});
