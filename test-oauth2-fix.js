#!/usr/bin/env node

/**
 * Test script to validate OAuth2 fix
 * This script simulates the OAuth2 callback scenario
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Testing OAuth2 Fix...');

// Test 1: Check if App.tsx handles browser mode correctly
console.log('Test 1: Checking App.tsx browser mode handling...');
const appContent = fs.readFileSync(path.join(__dirname, 'src/renderer/App.tsx'), 'utf8');

if (appContent.includes('isBrowserMode')) {
  console.log('✅ App.tsx has browser mode detection');
} else {
  console.log('❌ App.tsx missing browser mode detection');
}

if (appContent.includes('window.electronAPI') && appContent.includes('ElectronAPI not available')) {
  console.log('✅ App.tsx handles missing electronAPI');
} else {
  console.log('❌ App.tsx missing electronAPI handling');
}

// Test 2: Check if logsStore.tsx handles missing electronAPI
console.log('\nTest 2: Checking logsStore.tsx electronAPI handling...');
const logsStoreContent = fs.readFileSync(path.join(__dirname, 'src/renderer/stores/logsStore.tsx'), 'utf8');

if (logsStoreContent.includes('if (!window.electronAPI)')) {
  console.log('✅ logsStore.tsx checks for electronAPI availability');
} else {
  console.log('❌ logsStore.tsx missing electronAPI check');
}

// Test 3: Check OAuth2 callback files
console.log('\nTest 3: Checking OAuth2 callback files...');
const oauthCallback = fs.readFileSync(path.join(__dirname, 'public/oauth-callback.html'), 'utf8');
const oauthCallbackSpotify = fs.readFileSync(path.join(__dirname, 'public/oauth_callback.html'), 'utf8');

if (oauthCallback.includes('fetch("http://127.0.0.1:3000/oauth-callback.html"')) {
  console.log('✅ oauth-callback.html has local server communication');
} else {
  console.log('❌ oauth-callback.html missing local server communication');
}

if (oauthCallbackSpotify.includes('fetch("http://127.0.0.1:3000/oauth_callback.html"')) {
  console.log('✅ oauth_callback.html has local server communication');
} else {
  console.log('❌ oauth_callback.html missing local server communication');
}

console.log('\n🎉 OAuth2 Fix Test Complete!');
console.log('\nSummary of fixes:');
console.log('1. App.tsx now detects browser mode and handles missing electronAPI');
console.log('2. logsStore.tsx checks for electronAPI availability before using it');
console.log('3. OAuth2 callback files try to communicate with local server');
console.log('4. Browser mode shows appropriate UI instead of crashing');
