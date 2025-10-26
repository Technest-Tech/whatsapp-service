# WhatsApp Web API Documentation

This document provides comprehensive information about the REST API endpoints for the WhatsApp Web Dashboard, including authentication, message sending/receiving, and device management.

## Table of Contents
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Device Management](#device-management)
- [Message Operations](#message-operations)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Authentication

All API endpoints require authentication using one of the following methods:

### Method 1: X-API-Key Header
```bash
curl -H "X-API-Key: your_api_key_here" https://your-domain.com/api/endpoint
```

### Method 2: Authorization Bearer Token
```bash
curl -H "Authorization: Bearer your_api_key_here" https://your-domain.com/api/endpoint
```

### Creating API Keys
1. Open the WhatsApp Web Dashboard
2. Navigate to the Devices page
3. Click the "Device Details" button (info icon) on any device
4. Go to the "API Keys" tab
5. Enter a name for your API key and click "Create"
6. Copy the generated API key (it starts with `wa_`)

## API Endpoints

### Base URL
```
https://your-domain.com/api
```

### Send Message
**POST** `/send-message`

Send a WhatsApp message to any number or group.

**Headers:**
- `X-API-Key: your_api_key` or `Authorization: Bearer your_api_key`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "to": "1234567890@c.us",
  "message": "Hello from WhatsApp API!"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "messageId": "3EB0C767D26A8B4A5F6A",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST "https://your-domain.com/api/send-message" \
  -H "X-API-Key: wa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890@c.us",
    "message": "Hello from WhatsApp API!"
  }'
```

### Get Messages
**GET** `/messages`

Retrieve recent messages from the device.

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "3EB0C767D26A8B4A5F6A",
      "from": "1234567890@c.us",
      "to": "9876543210@c.us",
      "body": "Hello!",
      "timestamp": 1705312200,
      "type": "chat",
      "fromMe": true,
      "isGroup": false,
      "receivedAt": "2024-01-15T10:30:00.000Z",
      "formattedTime": "2024-01-15 10:30:00"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "https://your-domain.com/api/messages?limit=50" \
  -H "X-API-Key: wa_your_api_key_here"
```

### Search Messages
**GET** `/messages/search`

Search for messages containing specific text.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results to return (default: 50)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "3EB0C767D26A8B4A5F6A",
      "from": "1234567890@c.us",
      "body": "Hello world!",
      "timestamp": 1705312200,
      "formattedTime": "2024-01-15 10:30:00"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "https://your-domain.com/api/messages/search?q=hello&limit=20" \
  -H "X-API-Key: wa_your_api_key_here"
```

### Get Device Status
**GET** `/device/status`

Check the current status of the device.

**Response:**
```json
{
  "success": true,
  "device": {
    "id": "device-uuid-here",
    "name": "My WhatsApp Device",
    "status": "connected",
    "lastSeen": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T09:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET "https://your-domain.com/api/device/status" \
  -H "X-API-Key: wa_your_api_key_here"
```

### Get Chats
**GET** `/chats`

Retrieve all chats (conversations) from the device.

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "id": "1234567890@c.us",
      "name": "John Doe",
      "isGroup": false,
      "unreadCount": 2,
      "lastMessage": {
        "body": "Hello!",
        "timestamp": 1705312200,
        "fromMe": false
      }
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "https://your-domain.com/api/chats" \
  -H "X-API-Key: wa_your_api_key_here"
```

### Get Chat Messages
**GET** `/chats/{chatId}/messages`

Retrieve messages from a specific chat.

**Path Parameters:**
- `chatId`: The chat ID (e.g., `1234567890@c.us`)

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 50)

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "3EB0C767D26A8B4A5F6A",
      "body": "Hello!",
      "timestamp": 1705312200,
      "from": "1234567890@c.us",
      "to": "9876543210@c.us",
      "fromMe": true,
      "type": "chat",
      "isForwarded": false
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET "https://your-domain.com/api/chats/1234567890@c.us/messages?limit=20" \
  -H "X-API-Key: wa_your_api_key_here"
```

## Device Management

### Create API Key
**POST** `/devices/{deviceId}/api-keys`

Create a new API key for a device.

**Request Body:**
```json
{
  "keyName": "Mobile App Key"
}
```

**Response:**
```json
{
  "success": true,
  "apiKey": {
    "id": "api-key-uuid",
    "deviceId": "device-uuid",
    "keyName": "Mobile App Key",
    "authKey": "wa_abcdef1234567890",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get API Keys
**GET** `/devices/{deviceId}/api-keys`

Get all API keys for a device.

**Response:**
```json
{
  "success": true,
  "apiKeys": [
    {
      "id": "api-key-uuid",
      "deviceId": "device-uuid",
      "keyName": "Mobile App Key",
      "authKey": "wa_abcdef1234567890",
      "is_active": true,
      "created_at": "2024-01-15T10:30:00.000Z",
      "last_used": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

### Delete API Key
**DELETE** `/api-keys/{keyId}`

Delete an API key.

**Response:**
```json
{
  "success": true,
  "message": "API key deleted successfully"
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Not Found - Device or resource not found |
| 500 | Internal Server Error - Server-side error |

### Example Error Response
```json
{
  "success": false,
  "error": "Device is not connected. Current status: disconnected"
}
```

## Examples

### Complete Mobile App Integration Example

```javascript
// Configuration
const API_BASE_URL = 'https://your-domain.com/api';
const API_KEY = 'wa_your_api_key_here';

// Send a message
async function sendMessage(to, message) {
  try {
    const response = await fetch(`${API_BASE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, message })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Get recent messages
async function getMessages(limit = 50) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages?limit=${limit}`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    const data = await response.json();
    return data.messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// Check device status
async function getDeviceStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/device/status`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    const data = await response.json();
    return data.device;
  } catch (error) {
    console.error('Error checking device status:', error);
    throw error;
  }
}

// Usage examples
sendMessage('1234567890@c.us', 'Hello from my app!');
getMessages(20).then(messages => console.log(messages));
getDeviceStatus().then(device => console.log(device.status));
```

### Python Integration Example

```python
import requests
import json

class WhatsAppAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def send_message(self, to, message):
        url = f"{self.base_url}/send-message"
        data = {'to': to, 'message': message}
        response = requests.post(url, headers=self.headers, json=data)
        return response.json()
    
    def get_messages(self, limit=50):
        url = f"{self.base_url}/messages"
        params = {'limit': limit}
        response = requests.get(url, headers=self.headers, params=params)
        return response.json()
    
    def search_messages(self, query, limit=50):
        url = f"{self.base_url}/messages/search"
        params = {'q': query, 'limit': limit}
        response = requests.get(url, headers=self.headers, params=params)
        return response.json()
    
    def get_device_status(self):
        url = f"{self.base_url}/device/status"
        response = requests.get(url, headers=self.headers)
        return response.json()

# Usage
api = WhatsAppAPI('https://your-domain.com/api', 'wa_your_api_key_here')

# Send a message
result = api.send_message('1234567890@c.us', 'Hello from Python!')
print(result)

# Get recent messages
messages = api.get_messages(20)
print(messages)

# Search messages
search_results = api.search_messages('hello')
print(search_results)
```

## Rate Limiting

Currently, there are no rate limits implemented, but it's recommended to:
- Avoid sending more than 10 messages per second
- Implement proper error handling and retry logic
- Monitor your API usage

## Security Best Practices

1. **Keep your API keys secure** - Never expose them in client-side code
2. **Use HTTPS** - Always use secure connections
3. **Rotate API keys regularly** - Delete old keys and create new ones
4. **Monitor usage** - Check your API key usage in the dashboard
5. **Validate inputs** - Always validate phone numbers and message content

## Support

For issues or questions:
1. Check the device status in the dashboard
2. Ensure your device is connected before using the API
3. Verify your API key is correct and active
4. Check the server logs for detailed error information

---

**Note:** This API is designed for legitimate use cases. Please ensure compliance with WhatsApp's Terms of Service and applicable laws in your jurisdiction.
