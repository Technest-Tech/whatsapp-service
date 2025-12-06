# WhatsApp Group APIs

This document describes the new Group APIs that have been added to the WhatsApp Web Dashboard.

## New Endpoints

### 1. Get Groups
**GET** `/api/groups`

Retrieves all WhatsApp groups from the authenticated device.

**Authentication:** Required (API Key)

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "120363123456789012@g.us",
      "name": "My Family Group",
      "participants": [
        {
          "id": "1234567890@c.us",
          "name": "John Doe",
          "isAdmin": true
        }
      ],
      "unreadCount": 5,
      "lastMessage": {
        "body": "See you tomorrow!",
        "timestamp": 1705312200,
        "fromMe": false,
        "from": "1234567890@c.us"
      },
      "createdAt": 1705225800
    }
  ]
}
```

### 2. Send Group Message
**POST** `/api/groups/{groupId}/messages`

Sends a message to a WhatsApp group. Supports both text messages and media files.

**Authentication:** Required (API Key)

**Content-Type:** `multipart/form-data`

**Parameters:**
- `message` (optional): Text message to send
- `media` (optional): Media file to send

**Supported Media Types:**
- Images: JPEG, JPG, PNG, GIF
- Documents: PDF, DOC, DOCX, TXT
- Media: MP4, MP3, WAV

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "messageId": "3EB0C767D26A8B4A5F6A",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "groupId": "120363123456789012@g.us",
    "messageType": "text"
  }
}
```

## Usage Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');
const FormData = require('form-data');

const API_KEY = 'wa_your_api_key_here';
const BASE_URL = 'http://localhost:5001/api';

// Get groups
async function getGroups() {
  const response = await axios.get(`${BASE_URL}/groups`, {
    headers: { 'X-API-Key': API_KEY }
  });
  return response.data.groups;
}

// Send text message to group
async function sendGroupMessage(groupId, message) {
  const response = await axios.post(
    `${BASE_URL}/groups/${groupId}/messages`,
    { message },
    { headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' } }
  );
  return response.data;
}

// Send media to group
async function sendGroupMedia(groupId, message, mediaPath) {
  const formData = new FormData();
  formData.append('message', message);
  formData.append('media', require('fs').createReadStream(mediaPath));
  
  const response = await axios.post(
    `${BASE_URL}/groups/${groupId}/messages`,
    formData,
    { headers: { 'X-API-Key': API_KEY, ...formData.getHeaders() } }
  );
  return response.data;
}
```

### Python
```python
import requests

API_KEY = 'wa_your_api_key_here'
BASE_URL = 'http://localhost:5001/api'
headers = {'X-API-Key': API_KEY}

# Get groups
def get_groups():
    response = requests.get(f"{BASE_URL}/groups", headers=headers)
    return response.json()

# Send text message to group
def send_group_message(group_id, message):
    response = requests.post(
        f"{BASE_URL}/groups/{group_id}/messages",
        headers=headers,
        json={'message': message}
    )
    return response.json()

# Send media to group
def send_group_media(group_id, message, media_path):
    files = {'media': open(media_path, 'rb')}
    data = {'message': message}
    response = requests.post(
        f"{BASE_URL}/groups/{group_id}/messages",
        headers=headers,
        files=files,
        data=data
    )
    files['media'].close()
    return response.json()
```

### cURL Examples

Get groups:
```bash
curl -X GET "http://localhost:5001/api/groups" \
  -H "X-API-Key: wa_your_api_key_here"
```

Send text message:
```bash
curl -X POST "http://localhost:5001/api/groups/120363123456789012@g.us/messages" \
  -H "X-API-Key: wa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello everyone!"}'
```

Send image with caption:
```bash
curl -X POST "http://localhost:5001/api/groups/120363123456789012@g.us/messages" \
  -H "X-API-Key: wa_your_api_key_here" \
  -F "message=Check out this photo!" \
  -F "media=@/path/to/image.jpg"
```

## Testing

A test script is provided to verify the APIs work correctly:

```bash
# Update the API_KEY in test_group_apis.js with your actual API key
node test_group_apis.js
```

The test script will:
1. Retrieve all groups from your device
2. Send a test text message to the first group
3. Send a test media file (if available) to the first group

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

Common error scenarios:
- **401 Unauthorized**: Invalid or missing API key
- **400 Bad Request**: Missing required parameters
- **500 Internal Server Error**: Device not connected or WhatsApp client issues

## File Upload Limits

- Maximum file size: 50MB
- Supported file types: Images (JPEG, JPG, PNG, GIF), Documents (PDF, DOC, DOCX, TXT), Media (MP4, MP3, WAV)
- Files are automatically cleaned up after sending

## Security Notes

- All endpoints require API key authentication
- Files are temporarily stored and automatically deleted after processing
- Group IDs must be valid WhatsApp group identifiers (ending with @g.us)
- Ensure your device is connected before using these APIs

