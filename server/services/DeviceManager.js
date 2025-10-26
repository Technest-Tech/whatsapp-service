const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Database = require('../database/database');

class DeviceManager {
  constructor(io) {
    this.io = io;
    this.devices = new Map();
    this.dataDir = path.join(__dirname, '../../data');
    this.db = new Database();
    this.ensureDataDir();
    this.loadDevices();
  }

  ensureDataDir() {
    fs.ensureDirSync(this.dataDir);
  }

  async loadDevices() {
    try {
      // Wait for database to be ready
      await this.db.waitForReady();
      
      const devicesData = await this.db.getAllDevices();
      
      // Restore device metadata (without client instances)
      for (const deviceData of devicesData) {
        const device = {
          id: deviceData.id,
          name: deviceData.name,
          status: 'disconnected', // Will be updated when client initializes
          qrCode: null,
          lastSeen: deviceData.last_seen ? new Date(deviceData.last_seen) : new Date(),
          createdAt: new Date(deviceData.created_at),
          client: null // Will be recreated when needed
        };
        this.devices.set(deviceData.id, device);
      }
      
      console.log(`Loaded ${devicesData.length} devices from database`);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  }

  async createDevice(deviceName) {
    const deviceId = uuidv4();
    const deviceDataDir = path.join(this.dataDir, deviceId);
    
    await fs.ensureDir(deviceDataDir);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: deviceId,
        dataPath: deviceDataDir
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    const device = {
      id: deviceId,
      name: deviceName,
      client,
      status: 'initializing',
      qrCode: null,
      lastSeen: new Date(),
      createdAt: new Date()
    };

    this.devices.set(deviceId, device);
    this.setupClientEvents(device);
    
    // Save to database
    try {
      await this.db.createDevice({
        id: deviceId,
        name: deviceName,
        status: 'initializing'
      });
    } catch (error) {
      console.error('Error saving device to database:', error);
    }
    
    return device;
  }

  setupClientEvents(device) {
    const { client, id } = device;

    client.on('qr', async (qr) => {
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qr);
        device.qrCode = qrCodeDataURL;
        device.status = 'qr_ready';
        
        this.io.to(`device-${id}`).emit('qr-code', {
          deviceId: id,
          qrCode: qrCodeDataURL
        });
        
        this.io.emit('device-update', this.getDeviceInfo(device));
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    });

    client.on('ready', async () => {
      device.status = 'connected';
      device.qrCode = null;
      device.lastSeen = new Date();
      
      // Update database
      try {
        await this.db.updateDevice(id, {
          status: 'connected',
          lastSeen: device.lastSeen
        });
      } catch (error) {
        console.error('Error updating device status in database:', error);
      }
      
      this.io.to(`device-${id}`).emit('device-ready', { deviceId: id });
      this.io.emit('device-update', this.getDeviceInfo(device));
      
      console.log(`Device ${device.name} is ready!`);
    });

    client.on('authenticated', async () => {
      device.status = 'authenticated';
      
      // Update database
      try {
        await this.db.updateDevice(id, {
          status: 'authenticated'
        });
      } catch (error) {
        console.error('Error updating device status in database:', error);
      }
      
      this.io.emit('device-update', this.getDeviceInfo(device));
    });

    client.on('auth_failure', async (msg) => {
      device.status = 'auth_failed';
      
      // Update database
      try {
        await this.db.updateDevice(id, {
          status: 'auth_failed'
        });
      } catch (error) {
        console.error('Error updating device status in database:', error);
      }
      
      this.io.to(`device-${id}`).emit('auth-failure', { 
        deviceId: id, 
        message: msg 
      });
      this.io.emit('device-update', this.getDeviceInfo(device));
    });

    client.on('disconnected', async (reason) => {
      device.status = 'disconnected';
      
      // Update database
      try {
        await this.db.updateDevice(id, {
          status: 'disconnected'
        });
      } catch (error) {
        console.error('Error updating device status in database:', error);
      }
      
      this.io.to(`device-${id}`).emit('device-disconnected', { 
        deviceId: id, 
        reason 
      });
      this.io.emit('device-update', this.getDeviceInfo(device));
    });

    client.on('message', async (message) => {
      this.io.to(`device-${id}`).emit('new-message', {
        deviceId: id,
        message: {
          id: message.id._serialized,
          from: message.from,
          to: message.to,
          body: message.body,
          timestamp: message.timestamp,
          type: message.type,
          isGroup: message.from.includes('@g.us'),
          isForwarded: message.isForwarded,
          fromMe: message.fromMe
        }
      });
    });

    // Initialize the client
    client.initialize().catch(error => {
      console.error(`Error initializing device ${device.name}:`, error);
      device.status = 'error';
      this.io.emit('device-update', this.getDeviceInfo(device));
    });
  }

  getDeviceInfo(device) {
    return {
      id: device.id,
      name: device.name,
      status: device.status,
      qrCode: device.qrCode,
      lastSeen: device.lastSeen,
      createdAt: device.createdAt
    };
  }

  getAllDevices() {
    return Array.from(this.devices.values()).map(device => this.getDeviceInfo(device));
  }

  getDevice(deviceId) {
    const device = this.devices.get(deviceId);
    return device ? this.getDeviceInfo(device) : null;
  }

  async deleteDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      try {
        if (device.client) {
          await device.client.destroy();
        }
        this.devices.delete(deviceId);
        
        // Delete from database
        await this.db.deleteDevice(deviceId);
        
        // Clean up device data directory
        const deviceDataDir = path.join(this.dataDir, deviceId);
        await fs.remove(deviceDataDir);
        
        this.io.emit('device-deleted', { deviceId });
        return true;
      } catch (error) {
        console.error('Error deleting device:', error);
        return false;
      }
    }
    return false;
  }

  async sendMessage(deviceId, to, message) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    if (device.status !== 'connected') {
      throw new Error(`Device is not connected. Current status: ${device.status}`);
    }

    if (!device.client) {
      throw new Error('WhatsApp client is not initialized');
    }

    try {
      console.log(`Sending message from device ${deviceId} to ${to}: ${message}`);
      const result = await device.client.sendMessage(to, message);
      console.log(`Message sent successfully. Message ID: ${result.id._serialized}`);
      
      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Failed to send message from device ${deviceId} to ${to}:`, error);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async getChats(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device || device.status !== 'connected') {
      throw new Error('Device not connected');
    }

    try {
      const chats = await device.client.getChats();
      return chats.map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage ? {
          body: chat.lastMessage.body,
          timestamp: chat.lastMessage.timestamp,
          fromMe: chat.lastMessage.fromMe
        } : null
      }));
    } catch (error) {
      throw new Error(`Failed to get chats: ${error.message}`);
    }
  }

  async getMessages(deviceId, chatId, limit = 50) {
    const device = this.devices.get(deviceId);
    if (!device || device.status !== 'connected') {
      throw new Error('Device not connected');
    }

    try {
      const chat = await device.client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit });
      
      return messages.map(message => ({
        id: message.id._serialized,
        body: message.body,
        timestamp: message.timestamp,
        from: message.from,
        to: message.to,
        fromMe: message.fromMe,
        type: message.type,
        isForwarded: message.isForwarded
      }));
    } catch (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  // API Key management methods
  async createApiKey(deviceId, keyName) {
    try {
      await this.db.waitForReady();
      const apiKey = await this.db.createApiKey(deviceId, keyName);
      return apiKey;
    } catch (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  async getApiKeys(deviceId) {
    try {
      await this.db.waitForReady();
      const apiKeys = await this.db.getApiKeysByDevice(deviceId);
      return apiKeys;
    } catch (error) {
      throw new Error(`Failed to get API keys: ${error.message}`);
    }
  }

  async deleteApiKey(apiKeyId) {
    try {
      await this.db.waitForReady();
      await this.db.deleteApiKey(apiKeyId);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }
}

module.exports = DeviceManager;
