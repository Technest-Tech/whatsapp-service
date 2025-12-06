#!/usr/bin/env node

/**
 * Test script for the new Group APIs
 * This script tests the GET /api/groups and POST /api/groups/:id/messages endpoints
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration - Update these values
const API_BASE_URL = 'http://localhost:5001/api';
const API_KEY = 'wa_your_api_key_here'; // Replace with your actual API key

const headers = {
  'X-API-Key': API_KEY
};

async function testGetGroups() {
  console.log('🧪 Testing GET /api/groups...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/groups`, { headers });
    
    console.log('✅ GET /api/groups - Success!');
    console.log(`📊 Found ${response.data.groups.length} groups:`);
    
    response.data.groups.forEach((group, index) => {
      console.log(`   ${index + 1}. ${group.name} (${group.id})`);
      console.log(`      Participants: ${group.participants.length}`);
      console.log(`      Unread: ${group.unreadCount}`);
      if (group.lastMessage) {
        console.log(`      Last message: ${group.lastMessage.body.substring(0, 50)}...`);
      }
    });
    
    return response.data.groups;
  } catch (error) {
    console.error('❌ GET /api/groups - Failed!');
    console.error('Error:', error.response?.data || error.message);
    return [];
  }
}

async function testSendGroupMessage(groupId, message) {
  console.log(`🧪 Testing POST /api/groups/${groupId}/messages...`);
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/groups/${groupId}/messages`,
      { message },
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
    
    console.log('✅ POST /api/groups/:id/messages - Success!');
    console.log(`📨 Message sent: ${response.data.result.messageId}`);
    console.log(`⏰ Timestamp: ${response.data.result.timestamp}`);
    
    return response.data.result;
  } catch (error) {
    console.error('❌ POST /api/groups/:id/messages - Failed!');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

async function testSendGroupMessageWithMedia(groupId, message, mediaPath) {
  console.log(`🧪 Testing POST /api/groups/${groupId}/messages with media...`);
  
  if (!fs.existsSync(mediaPath)) {
    console.error(`❌ Media file not found: ${mediaPath}`);
    return null;
  }
  
  try {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('media', fs.createReadStream(mediaPath));
    
    const response = await axios.post(
      `${API_BASE_URL}/groups/${groupId}/messages`,
      formData,
      {
        headers: {
          ...headers,
          ...formData.getHeaders()
        }
      }
    );
    
    console.log('✅ POST /api/groups/:id/messages with media - Success!');
    console.log(`📨 Message sent: ${response.data.result.messageId}`);
    console.log(`📁 Media type: ${response.data.result.messageType}`);
    
    return response.data.result;
  } catch (error) {
    console.error('❌ POST /api/groups/:id/messages with media - Failed!');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Group API Tests...\n');
  
  // Test 1: Get groups
  const groups = await testGetGroups();
  console.log('');
  
  if (groups.length === 0) {
    console.log('⚠️  No groups found. Please ensure:');
    console.log('   1. Your device is connected');
    console.log('   2. You have joined some WhatsApp groups');
    console.log('   3. Your API key is correct');
    return;
  }
  
  // Test 2: Send text message to first group
  const firstGroup = groups[0];
  console.log(`📤 Testing with group: ${firstGroup.name}`);
  
  const textResult = await testSendGroupMessage(
    firstGroup.id, 
    `Test message from API at ${new Date().toISOString()}`
  );
  console.log('');
  
  // Test 3: Send media message (if test file exists)
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  const testTextPath = path.join(__dirname, 'test-image.txt');
  const testMediaPath = fs.existsSync(testImagePath) ? testImagePath : testTextPath;
  
  if (fs.existsSync(testMediaPath)) {
    const mediaResult = await testSendGroupMessageWithMedia(
      firstGroup.id,
      'Test media from API',
      testMediaPath
    );
    console.log('');
  } else {
    console.log('ℹ️  Skipping media test - no test file found');
    console.log('   To test media uploads, place a test-image.jpg or test-image.txt file in the project root');
    console.log('');
  }
  
  console.log('🎉 Group API tests completed!');
  console.log('\n📋 Summary:');
  console.log(`   - Found ${groups.length} groups`);
  console.log(`   - Text message: ${textResult ? '✅ Success' : '❌ Failed'}`);
  console.log(`   - Media message: ${fs.existsSync(testMediaPath) ? '✅ Success' : '⏭️  Skipped'}`);
}

// Check if API key is set
if (API_KEY === 'wa_your_api_key_here') {
  console.error('❌ Please update the API_KEY variable in this script with your actual API key');
  console.error('   You can get an API key from the WhatsApp Web Dashboard');
  process.exit(1);
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner error:', error.message);
  process.exit(1);
});
