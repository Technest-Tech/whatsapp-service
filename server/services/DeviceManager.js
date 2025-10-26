const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Database = require('../database/database');

class DeviceManager {
  constructor(io, messageHandler = null) {
    this.io = io;
    this.devices = new Map();
    this.environment = process.env.NODE_ENV || 'production';
    this.dataDir = path.join(__dirname, '../../data', this.environment);
    this.db = new Database();
    this.messageHandler = messageHandler;
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
      
      console.log(`Loaded ${devicesData.length} devices from database for environment: ${this.environment}`);
      
      // Attempt to reconnect devices that were previously connected
      await this.reconnectDevices();
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  }

  async reconnectDevices() {
    const devicesToReconnect = Array.from(this.devices.values()).filter(
      device => device.status === 'connected' || device.status === 'initializing'
    );
    
    console.log(`Attempting to reconnect ${devicesToReconnect.length} devices...`);
    
    for (const device of devicesToReconnect) {
      try {
        await this.initializeDevice(device.id);
      } catch (error) {
        console.error(`Failed to reconnect device ${device.id}:`, error);
        await this.updateDeviceStatus(device.id, 'disconnected');
      }
    }
  }

  async initializeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.client) {
      return device; // Already initialized
    }

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

    device.client = client;
    device.status = 'initializing';
    this.setupClientEvents(device);
    
    await this.updateDeviceStatus(deviceId, 'initializing');
    
    return device;
  }

  async updateDeviceStatus(deviceId, status) {
    try {
      await this.db.updateDevice(deviceId, { 
        status,
        lastSeen: new Date()
      });
      
      const device = this.devices.get(deviceId);
      if (device) {
        device.status = status;
        device.lastSeen = new Date();
      }
      
      // Emit status update to connected clients
      this.io.emit('device-status-update', {
        deviceId,
        status,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating device status:', error);
    }
  }

  async createDevice(deviceName) {
    const deviceId = uuidv4();
    
    const device = {
      id: deviceId,
      name: deviceName,
      client: null,
      status: 'initializing',
      qrCode: null,
      lastSeen: new Date(),
      createdAt: new Date()
    };

    this.devices.set(deviceId, device);
    
    // Save to database first
    try {
      await this.db.createDevice({
        id: deviceId,
        name: deviceName,
        status: 'initializing'
      });
    } catch (error) {
      console.error('Error saving device to database:', error);
      throw error;
    }
    
    // Initialize the device client
    try {
      await this.initializeDevice(deviceId);
    } catch (error) {
      console.error('Error initializing device client:', error);
      await this.updateDeviceStatus(deviceId, 'disconnected');
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
      
      await this.updateDeviceStatus(id, 'connected');
      
      this.io.to(`device-${id}`).emit('device-ready', { deviceId: id });
      this.io.emit('device-update', this.getDeviceInfo(device));
      
      console.log(`Device ${device.name} is ready!`);
    });

    client.on('authenticated', async () => {
      device.status = 'authenticated';
      
      await this.updateDeviceStatus(id, 'authenticated');
      
      this.io.emit('device-update', this.getDeviceInfo(device));
    });

    client.on('auth_failure', async (msg) => {
      device.status = 'auth_failed';
      
      await this.updateDeviceStatus(id, 'auth_failed');
      
      this.io.to(`device-${id}`).emit('auth-failure', { 
        deviceId: id, 
        message: msg 
      });
      this.io.emit('device-update', this.getDeviceInfo(device));
    });

    client.on('disconnected', async (reason) => {
      device.status = 'disconnected';
      
      await this.updateDeviceStatus(id, 'disconnected');
      
      this.io.to(`device-${id}`).emit('device-disconnected', { 
        deviceId: id, 
        reason 
      });
      this.io.emit('device-update', this.getDeviceInfo(device));
    });

    client.on('message', async (message) => {
      const messageData = {
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        timestamp: message.timestamp,
        type: message.type,
        isGroup: message.from.includes('@g.us'),
        isForwarded: message.isForwarded,
        fromMe: message.fromMe
      };

      // Handle incoming message through MessageHandler
      await this.messageHandler.handleIncomingMessage(id, messageData);

      this.io.to(`device-${id}`).emit('new-message', {
        deviceId: id,
        message: messageData
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
      createdAt: device.createdAt,
      environment: this.environment
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
