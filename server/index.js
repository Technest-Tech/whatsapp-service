const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const DeviceManager = require('./services/DeviceManager');
const MessageHandler = require('./services/MessageHandler');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://whatsapp.almajd.info",
      "https://whatsapp.almajdmeet.org"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://whatsapp.almajd.info",
    "https://whatsapp.almajdmeet.org"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const messageHandler = new MessageHandler(io, null); // Will be updated after deviceManager is created
const deviceManager = new DeviceManager(io, messageHandler);
// Update messageHandler with database reference
messageHandler.db = deviceManager.db;

// Routes
app.use('/api', routes(deviceManager, messageHandler));

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('join-device-room', (deviceId) => {
    socket.join(`device-${deviceId}`);
  });
  
  socket.on('leave-device-room', (deviceId) => {
    socket.leave(`device-${deviceId}`);
  });
  
  socket.on('request-qr-code', async (deviceId) => {
    try {
      console.log(`QR code refresh requested for device: ${deviceId}`);
      await deviceManager.regenerateQRCode(deviceId);
    } catch (error) {
      console.error('Error refreshing QR code:', error);
      socket.emit('qr-refresh-error', { 
        deviceId, 
        error: error.message 
      });
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Ensure data directory exists
fs.ensureDirSync(path.join(__dirname, '../data'));

// Track consecutive null states to avoid false positives
const deviceNullStateCount = new Map();

// Add periodic health check for connected devices - more frequent and aggressive
setInterval(async () => {
  try {
    const devices = deviceManager.devices;
    for (const [deviceId, device] of devices) {
      // Check ALL devices, not just "connected" ones
      // This ensures we reconnect devices that are stuck in "reconnecting" state
      if (device && device.status !== 'disconnected') {
        try {
          if (device.client) {
            const state = await Promise.race([
              device.client.getState(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('State check timeout')), 5000)
              )
            ]);
            
            // Handle null state - don't immediately reconnect
            // null can mean client is initializing or temporarily unavailable
            if (state === null) {
              const nullCount = (deviceNullStateCount.get(deviceId) || 0) + 1;
              deviceNullStateCount.set(deviceId, nullCount);
              
              // Only reconnect if we've seen null state 3 times in a row (90 seconds)
              // This prevents false positives from temporary issues
              if (nullCount >= 3) {
                console.log(`Device ${deviceId} state is null for ${nullCount} consecutive checks, attempting reconnection...`);
                deviceNullStateCount.delete(deviceId);
                await deviceManager.reconnectDevice(deviceId, 0, true); // Preserve client if possible
              } else {
                console.log(`Device ${deviceId} state is null (count: ${nullCount}), waiting before reconnecting...`);
              }
            } else if (state === 'CONNECTED') {
              // Device is connected - reset null count
              deviceNullStateCount.delete(deviceId);
            } else {
              // Explicit disconnected state (UNPAIRED, UNLAUNCHED, etc.) - reconnect
              console.log(`Device ${deviceId} state is ${state}, attempting reconnection...`);
              deviceNullStateCount.delete(deviceId);
              await deviceManager.reconnectDevice(deviceId);
            }
          } else if (device.status === 'reconnecting' || device.status === 'connected') {
            // Device should be connected but client is missing - reconnect
            console.log(`Device ${deviceId} should be connected but client is missing, reconnecting...`);
            deviceNullStateCount.delete(deviceId);
            await deviceManager.reconnectDevice(deviceId);
          }
        } catch (error) {
          // Only reconnect on actual session errors, not timeouts
          if (error.message && (
            error.message.includes('Session closed') || 
            error.message.includes('Protocol error') ||
            error.message.includes('Target closed')
          )) {
            console.log(`Device ${deviceId} health check failed with session error, reconnecting...`);
            deviceNullStateCount.delete(deviceId);
            await deviceManager.reconnectDevice(deviceId);
          } else if (error.message && error.message.includes('timeout')) {
            // Timeout - increment null count but don't reconnect immediately
            const nullCount = (deviceNullStateCount.get(deviceId) || 0) + 1;
            deviceNullStateCount.set(deviceId, nullCount);
            
            if (nullCount >= 3) {
              console.log(`Device ${deviceId} state check timed out ${nullCount} times, attempting reconnection...`);
              deviceNullStateCount.delete(deviceId);
              await deviceManager.reconnectDevice(deviceId, 0, true);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in health check:', error);
  }
}, 30000); // Check every 30 seconds (more frequent)

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 WhatsApp Web Dashboard Backend Ready`);
});
