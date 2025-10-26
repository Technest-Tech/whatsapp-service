const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middleware/auth');

module.exports = (deviceManager, messageHandler) => {
  // Create auth middleware instance with database
  const authMiddleware = new AuthMiddleware(deviceManager.db);
  // Device management routes
  router.get('/devices', (req, res) => {
    try {
      const devices = deviceManager.getAllDevices();
      res.json({ success: true, devices });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/devices/:id', (req, res) => {
    try {
      const device = deviceManager.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' });
      }
      res.json({ success: true, device });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/devices', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Device name is required' });
      }

      const device = await deviceManager.createDevice(name);
      res.status(201).json({ success: true, device: deviceManager.getDeviceInfo(device) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete('/devices/:id', async (req, res) => {
    try {
      const success = await deviceManager.deleteDevice(req.params.id);
      if (success) {
        res.json({ success: true, message: 'Device deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Device not found' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Messaging routes
  router.post('/devices/:id/send', async (req, res) => {
    try {
      const { to, message } = req.body;
      console.log(`API: Send message request - Device: ${req.params.id}, To: ${to}, Message: ${message}`);
      
      if (!to || !message) {
        return res.status(400).json({ success: false, error: 'Recipient and message are required' });
      }

      const result = await deviceManager.sendMessage(req.params.id, to, message);
      console.log(`API: Message sent successfully - ${result.messageId}`);
      res.json({ success: true, result });
    } catch (error) {
      console.error(`API: Error sending message - ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/devices/:id/chats', async (req, res) => {
    try {
      const chats = await deviceManager.getChats(req.params.id);
      res.json({ success: true, chats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/devices/:id/chats/:chatId/messages', async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const messages = await deviceManager.getMessages(req.params.id, req.params.chatId, parseInt(limit));
      res.json({ success: true, messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Message history routes
  router.get('/devices/:id/messages', (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const messages = messageHandler.getMessageHistory(req.params.id, parseInt(limit));
      res.json({ success: true, messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/devices/:id/messages/search', (req, res) => {
    try {
      const { q, limit = 50 } = req.query;
      if (!q) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
      }
      const messages = messageHandler.searchMessages(req.params.id, q, parseInt(limit));
      res.json({ success: true, messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/devices/:id/messages/stats', (req, res) => {
    try {
      const stats = messageHandler.getMessageStats(req.params.id);
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete('/devices/:id/messages', (req, res) => {
    try {
      messageHandler.clearMessageHistory(req.params.id);
      res.json({ success: true, message: 'Message history cleared' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/devices/:id/messages/export', (req, res) => {
    try {
      const { format = 'json' } = req.query;
      const data = messageHandler.exportMessages(req.params.id, format);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="messages.json"');
        res.send(data);
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="messages.csv"');
        res.send(data);
      } else {
        res.json({ success: true, data });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Health check
  router.get('/health', (req, res) => {
    res.json({ 
      success: true, 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      devices: deviceManager.getAllDevices().length
    });
  });

  // API Key management routes
  router.post('/devices/:id/api-keys', async (req, res) => {
    try {
      const { keyName } = req.body;
      if (!keyName) {
        return res.status(400).json({ success: false, error: 'Key name is required' });
      }

      const apiKey = await deviceManager.createApiKey(req.params.id, keyName);
      res.status(201).json({ success: true, apiKey });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/devices/:id/api-keys', async (req, res) => {
    try {
      const apiKeys = await deviceManager.getApiKeys(req.params.id);
      res.json({ success: true, apiKeys });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete('/api-keys/:keyId', async (req, res) => {
    try {
      await deviceManager.deleteApiKey(req.params.keyId);
      res.json({ success: true, message: 'API key deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Public API endpoints (require authentication)
  router.post('/send-message', authMiddleware.authenticateApiKey.bind(authMiddleware), async (req, res) => {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ success: false, error: 'Recipient and message are required' });
      }

      const result = await deviceManager.sendMessage(req.deviceId, to, message);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/messages', authMiddleware.authenticateApiKey.bind(authMiddleware), (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const messages = messageHandler.getMessageHistory(req.deviceId, parseInt(limit));
      res.json({ success: true, messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/messages/search', authMiddleware.authenticateApiKey.bind(authMiddleware), (req, res) => {
    try {
      const { q, limit = 50 } = req.query;
      if (!q) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
      }
      const messages = messageHandler.searchMessages(req.deviceId, q, parseInt(limit));
      res.json({ success: true, messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/device/status', authMiddleware.authenticateApiKey.bind(authMiddleware), (req, res) => {
    try {
      const device = deviceManager.getDevice(req.deviceId);
      if (!device) {
        return res.status(404).json({ success: false, error: 'Device not found' });
      }
      res.json({ success: true, device });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/chats', authMiddleware.authenticateApiKey.bind(authMiddleware), async (req, res) => {
    try {
      const chats = await deviceManager.getChats(req.deviceId);
      res.json({ success: true, chats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/chats/:chatId/messages', authMiddleware.authenticateApiKey.bind(authMiddleware), async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const messages = await deviceManager.getMessages(req.deviceId, req.params.chatId, parseInt(limit));
      res.json({ success: true, messages });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
