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
      
      // Clean up any stuck devices first
      await this.cleanupStuckDevices();
      
      // Attempt to reconnect devices that were previously connected
      await this.reconnectDevices();
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  }

  async reconnectDevices() {
    // Reconnect ALL devices that are not explicitly disconnected
    const devicesToReconnect = Array.from(this.devices.values()).filter(
      device => device.status !== 'disconnected'
    );
    
    console.log(`Attempting to reconnect ${devicesToReconnect.length} devices on startup...`);
    
    // Reconnect all devices in parallel (but with small delays to avoid overwhelming)
    for (let i = 0; i < devicesToReconnect.length; i++) {
      const device = devicesToReconnect[i];
      // Stagger reconnections by 2 seconds each
      setTimeout(async () => {
        try {
          await this.reconnectDevice(device.id);
        } catch (error) {
          console.error(`Failed to reconnect device ${device.id}:`, error);
          // Don't mark as disconnected - keep trying
        }
      }, i * 2000);
    }
  }

  // Add a new method to reconnect a device
  async reconnectDevice(deviceId, retryCount = 0) {
    const device = this.devices.get(deviceId);
    if (!device) {
      console.error(`Device ${deviceId} not found for reconnection`);
      return;
    }

    // Don't reconnect if it was explicitly logged out
    if (device.status === 'disconnected' && !device.client) {
      // Check database to see if it's still marked as disconnected
      try {
        const dbDevice = await this.db.getDevice(deviceId);
        if (dbDevice && dbDevice.status === 'disconnected') {
          // Only skip if it was logged out, otherwise try to reconnect
          console.log(`Device ${deviceId} is marked as disconnected - checking if it should reconnect...`);
          // If it's been disconnected for a while, try to reconnect anyway (might be a stale state)
        }
      } catch (error) {
        // Continue with reconnection
      }
    }

    // Don't reconnect if already connected
    if (device.status === 'connected' && device.client) {
      try {
        const state = await Promise.race([
          device.client.getState(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('State check timeout')), 5000)
          )
        ]);
        if (state === 'CONNECTED') {
          console.log(`Device ${deviceId} is already connected`);
          return;
        }
      } catch (error) {
        // Client exists but not connected, proceed with reconnection
        console.log(`Device ${deviceId} client exists but not connected, reinitializing...`);
      }
    }

    try {
      console.log(`Attempting to reconnect device ${deviceId} (attempt ${retryCount + 1})...`);
      
      // Clean up old client if it exists
      if (device.client) {
        try {
          await device.client.destroy();
        } catch (error) {
          console.log(`Error destroying old client for ${deviceId}:`, error.message);
        }
        device.client = null;
      }

      // Reinitialize the device
      await this.initializeDevice(deviceId);
      console.log(`Reconnection attempt ${retryCount + 1} completed for device ${deviceId}`);
      
      // Reset retry count on success
      retryCount = 0;
    } catch (error) {
      console.error(`Failed to reconnect device ${deviceId} (attempt ${retryCount + 1}):`, error);
      
      // NEVER mark as disconnected - keep status as reconnecting
      device.status = 'reconnecting';
      await this.updateDeviceStatus(deviceId, 'reconnecting');
      this.io.emit('device-update', this.getDeviceInfo(device));
      
      // Exponential backoff: 5s, 10s, 20s, 30s, then every 30s
      const delays = [5000, 10000, 20000, 30000];
      const delay = retryCount < delays.length 
        ? delays[retryCount] 
        : 30000; // Max 30 seconds between retries
      
      console.log(`Retrying reconnection for device ${deviceId} in ${delay/1000} seconds...`);
      
      // Retry with exponential backoff
      setTimeout(() => {
        this.reconnectDevice(deviceId, retryCount + 1);
      }, delay);
    }
  }

  async initializeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.client) {
      // Check if client is still alive
      try {
        const state = await device.client.getState();
        if (state === 'CONNECTED') {
          return device; // Already connected
        }
      } catch (error) {
        // Client exists but not working, destroy it
        console.log(`Existing client for ${deviceId} is not working, recreating...`);
        try {
          await device.client.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        device.client = null;
      }
    }

    const deviceDataDir = path.join(this.dataDir, deviceId);
    
    // DON'T clean up session data - we want to keep it for persistence
    // Only ensure the directory exists
    await fs.ensureDir(deviceDataDir);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: deviceId,
        dataPath: deviceDataDir
      }),
      puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          // Add stability flags
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          // Memory management
          '--max-old-space-size=512',
          '--js-flags=--max-old-space-size=512'
        ],
        // Keep browser alive
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
      },
      // Add webhook options for better connection management
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2413.51.html',
      }
    });

    device.client = client;
    device.status = 'initializing';
    this.setupClientEvents(device);
    
    await this.updateDeviceStatus(deviceId, 'initializing');
    
    // Initialize the client with timeout
    try {
      await Promise.race([
        client.initialize(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 60000) // Increased to 60 seconds
        )
      ]);
    } catch (error) {
      console.error(`Failed to initialize device ${deviceId}:`, error);
      device.status = 'disconnected';
      await this.updateDeviceStatus(deviceId, 'disconnected');
      // Don't throw error, just log it and continue
      console.log(`Device ${deviceId} will remain disconnected due to initialization failure`);
    }
    
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

    // Add error handler to catch browser crashes
    client.on('error', async (error) => {
      console.error(`Client error for device ${id}:`, error);
      // Don't immediately disconnect on error, try to recover
      if (error.message && (
        error.message.includes('Session closed') ||
        error.message.includes('Target closed') ||
        error.message.includes('Protocol error') ||
        error.message.includes('Navigation timeout') ||
        error.message.includes('net::ERR')
      )) {
        console.log(`Error detected for device ${id}, attempting reconnection...`);
        // Immediate reconnection attempt
        setTimeout(() => {
          this.reconnectDevice(id);
        }, 2000); // Reduced to 2 seconds
      }
    });

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
      // Even auth failure - try to reconnect (might be temporary)
      console.log(`Auth failure for device ${id}, will attempt reconnection...`);
      device.status = 'reconnecting';
      
      await this.updateDeviceStatus(id, 'reconnecting');
      
      this.io.to(`device-${id}`).emit('auth-failure', { 
        deviceId: id, 
        message: msg 
      });
      this.io.emit('device-update', this.getDeviceInfo(device));
      
      // Attempt to reconnect after a short delay
      setTimeout(() => {
        this.reconnectDevice(id);
      }, 5000);
    });

    client.on('disconnected', async (reason) => {
      console.log(`Device ${id} disconnected. Reason: ${reason}`);
      
      // ONLY mark as disconnected if it's an explicit LOGOUT
      // Everything else is temporary and should auto-reconnect
      if (reason === 'LOGOUT') {
        console.log(`Device ${id} was logged out by user - this is permanent`);
        device.status = 'disconnected';
        device.client = null;
        await this.updateDeviceStatus(id, 'disconnected');
        
        this.io.to(`device-${id}`).emit('device-disconnected', { 
          deviceId: id, 
          reason 
        });
        this.io.emit('device-update', this.getDeviceInfo(device));
      } else {
        // ANY other disconnection reason = temporary, auto-reconnect
        console.log(`Temporary disconnection for device ${id} (reason: ${reason}), auto-reconnecting...`);
        device.status = 'reconnecting';
        await this.updateDeviceStatus(id, 'reconnecting');
        
        this.io.emit('device-update', this.getDeviceInfo(device));
        
        // Immediate reconnection attempt (no delay for network issues)
        setTimeout(() => {
          this.reconnectDevice(id);
        }, reason === 'NAVIGATION' || reason === 'TIMEOUT' ? 1000 : 3000);
      }
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
    try {
      // Check if device exists in database first
      const dbDevice = await this.db.getDevice(deviceId);
      if (!dbDevice) {
        console.log(`Device ${deviceId} not found in database`);
        return false;
      }

      // Get device from memory if it exists
      const device = this.devices.get(deviceId);
      
      // Clean up client if it exists
      if (device && device.client) {
        try {
          await device.client.destroy();
        } catch (error) {
          console.log(`Client already destroyed for device ${deviceId}`);
        }
      }
      
      // Remove from memory
      this.devices.delete(deviceId);
      
      // Delete from database
      await this.db.deleteDevice(deviceId);
      
      // Clean up device data directory
      const deviceDataDir = path.join(this.dataDir, deviceId);
      await fs.remove(deviceDataDir);
      
      this.io.emit('device-deleted', { deviceId });
      console.log(`Device ${deviceId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting device:', error);
      return false;
    }
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
    if (!device) {
      throw new Error('Device not found');
    }

    if (!device.client) {
      await this.updateDeviceStatus(deviceId, 'disconnected');
      throw new Error('Device client not initialized');
    }

    if (device.status !== 'connected') {
      throw new Error(`Device not connected. Current status: ${device.status}`);
    }

    // Verify client is actually connected before making the call
    try {
      const state = await Promise.race([
        device.client.getState(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('State check timeout')), 10000)
        )
      ]);
      
      if (state !== 'CONNECTED') {
        console.log(`Device ${deviceId} state is ${state}, updating status...`);
        device.status = 'disconnected';
        await this.updateDeviceStatus(deviceId, 'disconnected');
        this.io.emit('device-update', this.getDeviceInfo(device));
        throw new Error(`Device is not connected. State: ${state}`);
      }
    } catch (error) {
      // Only mark as disconnected on actual session closure, not on timeout
      if (error.message.includes('Session closed') || 
          error.message.includes('Protocol error') || 
          error.message.includes('Target closed')) {
        console.error(`Device ${deviceId} state check failed:`, error.message);
        device.status = 'disconnected';
        device.client = null;
        await this.updateDeviceStatus(deviceId, 'disconnected');
        this.io.emit('device-update', this.getDeviceInfo(device));
        throw new Error('Device session is closed');
      } else if (error.message.includes('timeout')) {
        // State check timeout - skip the check and try getChats anyway
        // The device might still be connected, just slow to respond
        console.warn(`State check timeout for device ${deviceId} - proceeding with getChats anyway`);
      } else {
        throw error;
      }
    }

    try {
      // Add timeout to getChats call - but don't destroy client on timeout
      // WhatsApp Web can be slow, especially on first load
      const chats = await Promise.race([
        device.client.getChats(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getChats timeout after 45 seconds')), 45000)
        )
      ]);
      
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
      // Only mark as disconnected on actual session closure, not on timeout
      // Timeout just means the operation is slow, not that the device is disconnected
      if (error.message && (
        error.message.includes('Session closed') || 
        error.message.includes('Protocol error') ||
        error.message.includes('Target closed')
      )) {
        // Actual session closure - mark as disconnected
        console.error(`Session closed for device ${deviceId}, updating status...`);
        device.status = 'disconnected';
        if (device.client) {
          try {
            await device.client.destroy();
          } catch (e) {
            // Ignore destroy errors
          }
        }
        device.client = null;
        await this.updateDeviceStatus(deviceId, 'disconnected');
        this.io.emit('device-update', this.getDeviceInfo(device));
        throw new Error(`Failed to get chats: ${error.message}`);
      } else if (error.message && error.message.includes('timeout')) {
        // Timeout - don't mark as disconnected, just throw the error
        // The device might still be connected, just slow
        console.warn(`getChats timeout for device ${deviceId} - operation is slow but device may still be connected`);
        throw new Error(`Failed to get chats: Operation timed out. The device may still be connected but the operation is taking longer than expected.`);
      } else {
        // Other errors - just throw them
        throw new Error(`Failed to get chats: ${error.message}`);
      }
    }
  }

  async getMessages(deviceId, chatId, limit = 50) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    if (!device.client) {
      await this.updateDeviceStatus(deviceId, 'disconnected');
      throw new Error('Device client not initialized');
    }

    if (device.status !== 'connected') {
      throw new Error(`Device not connected. Current status: ${device.status}`);
    }

    // Verify client is actually connected before making the call
    try {
      const state = await Promise.race([
        device.client.getState(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('State check timeout')), 10000)
        )
      ]);
      
      if (state !== 'CONNECTED') {
        console.log(`Device ${deviceId} state is ${state}, updating status...`);
        device.status = 'disconnected';
        await this.updateDeviceStatus(deviceId, 'disconnected');
        this.io.emit('device-update', this.getDeviceInfo(device));
        throw new Error(`Device is not connected. State: ${state}`);
      }
    } catch (error) {
      // Only mark as disconnected on actual session closure, not on timeout
      if (error.message.includes('Session closed') || 
          error.message.includes('Protocol error') || 
          error.message.includes('Target closed')) {
        console.error(`Device ${deviceId} state check failed:`, error.message);
        device.status = 'disconnected';
        device.client = null;
        await this.updateDeviceStatus(deviceId, 'disconnected');
        this.io.emit('device-update', this.getDeviceInfo(device));
        throw new Error('Device session is closed');
      } else if (error.message.includes('timeout')) {
        // State check timeout - skip the check and try getMessages anyway
        // The device might still be connected, just slow to respond
        console.warn(`State check timeout for device ${deviceId} - proceeding with getMessages anyway`);
      } else {
        throw error;
      }
    }

    try {
      // Add timeout to getChatById and fetchMessages calls
      const chat = await Promise.race([
        device.client.getChatById(chatId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getChatById timeout')), 15000)
        )
      ]);
      
      const messages = await Promise.race([
        chat.fetchMessages({ limit }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('fetchMessages timeout')), 30000)
        )
      ]);
      
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
      // Only mark as disconnected on actual session closure, not on timeout
      if (error.message && (
        error.message.includes('Session closed') || 
        error.message.includes('Protocol error') ||
        error.message.includes('Target closed')
      )) {
        // Actual session closure - mark as disconnected
        console.error(`Session closed for device ${deviceId}, updating status...`);
        device.status = 'disconnected';
        if (device.client) {
          try {
            await device.client.destroy();
          } catch (e) {
            // Ignore destroy errors
          }
        }
        device.client = null;
        await this.updateDeviceStatus(deviceId, 'disconnected');
        this.io.emit('device-update', this.getDeviceInfo(device));
        throw new Error(`Failed to get messages: ${error.message}`);
      } else if (error.message && error.message.includes('timeout')) {
        // Timeout - don't mark as disconnected, just throw the error
        // The device might still be connected, just slow
        console.warn(`getMessages timeout for device ${deviceId} - operation is slow but device may still be connected`);
        throw new Error(`Failed to get messages: Operation timed out. The device may still be connected but the operation is taking longer than expected.`);
      } else {
        // Other errors - just throw them
        throw new Error(`Failed to get messages: ${error.message}`);
      }
    }
  }

  async getGroups(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device || device.status !== 'connected') {
      throw new Error('Device not connected');
    }

    try {
      const chats = await device.client.getChats();
      const groups = chats.filter(chat => chat.isGroup);
      
      return groups.map(group => ({
        id: group.id._serialized,
        name: group.name,
        participants: group.participants ? group.participants.map(p => ({
          id: p.id._serialized,
          name: p.name || p.pushname || p.number,
          isAdmin: p.isAdmin || false
        })) : [],
        unreadCount: group.unreadCount,
        lastMessage: group.lastMessage ? {
          body: group.lastMessage.body,
          timestamp: group.lastMessage.timestamp,
          fromMe: group.lastMessage.fromMe,
          from: group.lastMessage.from
        } : null,
        createdAt: group.timestamp
      }));
    } catch (error) {
      throw new Error(`Failed to get groups: ${error.message}`);
    }
  }

  async sendGroupMessage(deviceId, groupId, message, mediaFile = null) {
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
      console.log(`Sending group message from device ${deviceId} to group ${groupId}: ${message || 'media file'}`);
      
      let result;
      
      if (mediaFile) {
        // Send media message
        const { MessageMedia } = require('whatsapp-web.js');
        const media = MessageMedia.fromFilePath(mediaFile.path);
        
        // Add caption if message text is provided
        if (message) {
          media.caption = message;
        }
        
        result = await device.client.sendMessage(groupId, media);
        
        // Clean up the uploaded file after sending
        try {
          await fs.remove(mediaFile.path);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
      } else {
        // Send text message
        result = await device.client.sendMessage(groupId, message);
      }
      
      console.log(`Group message sent successfully. Message ID: ${result.id._serialized}`);
      
      return {
        success: true,
        messageId: result.id._serialized,
        timestamp: new Date(),
        groupId: groupId,
        messageType: mediaFile ? 'media' : 'text'
      };
    } catch (error) {
      console.error(`Failed to send group message from device ${deviceId} to group ${groupId}:`, error);
      
      // Clean up uploaded file if there was an error
      if (mediaFile) {
        try {
          await fs.remove(mediaFile.path);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file after error:', cleanupError);
        }
      }
      
      throw new Error(`Failed to send group message: ${error.message}`);
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

  async regenerateQRCode(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      // Destroy current client if it exists
      if (device.client) {
        try {
          await device.client.destroy();
        } catch (error) {
          console.log(`Client already destroyed for device ${deviceId}`);
        }
      }
      
      // Create new client
      const newClient = new Client({
        authStrategy: new LocalAuth({
          clientId: deviceId,
          dataPath: path.join(this.dataDir, deviceId)
        }),
        puppeteer: {
          headless: true,
          executablePath: '/usr/bin/chromium-browser',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-default-browser-check'
          ]
        }
      });

      device.client = newClient;
      this.setupClientEvents(device);
      
      // Initialize the new client with timeout
      await Promise.race([
        newClient.initialize(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('QR regeneration timeout')), 60000) // Increased to 60 seconds
        )
      ]);
      
      return true;
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      device.status = 'disconnected';
      await this.updateDeviceStatus(deviceId, 'disconnected');
      throw error;
    }
  }

  async cleanupStuckDevices() {
    const stuckDevices = Array.from(this.devices.values()).filter(
      device => device.status === 'initializing'
    );
    
    console.log(`Found ${stuckDevices.length} stuck devices, cleaning up...`);
    
    for (const device of stuckDevices) {
      try {
        if (device.client) {
          await device.client.destroy();
        }
        device.status = 'disconnected';
        await this.updateDeviceStatus(device.id, 'disconnected');
        console.log(`Cleaned up stuck device: ${device.id}`);
      } catch (error) {
        console.error(`Error cleaning up device ${device.id}:`, error);
      }
    }
  }
}

module.exports = DeviceManager;
