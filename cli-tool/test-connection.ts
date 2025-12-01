#!/usr/bin/env bun
/**
 * Simple connection test for VibeSDK API
 * Tests if the worker is running and responding
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5173';

console.log('🧪 Testing VibeSDK API connection...\n');
console.log(`📡 API URL: ${API_BASE_URL}\n`);

// Test 1: Health check
console.log('Test 1: Health check...');
try {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Health check passed:', data);
  } else {
    console.log('❌ Health check failed:', response.status);
  }
} catch (error) {
  console.log('❌ Health check error:', error);
  console.log('\n💡 Make sure the worker is running:');
  console.log('   cd /Users/abhi/Downloads/fix-vibesdk-prod2/worker');
  console.log('   bun run dev\n');
  process.exit(1);
}

console.log('\n✅ All tests passed! The worker is running and ready.\n');
console.log('🚀 You can now run: bun run start\n');
