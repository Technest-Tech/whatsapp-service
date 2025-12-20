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

// Add periodic health check for connected devices
setInterval(async () => {
  try {
    const devices = deviceManager.devices;
    for (const [deviceId, device] of devices) {
      if (device.status === 'connected' && device.client) {
        try {
          const state = await device.client.getState();
          if (state !== 'CONNECTED') {
            console.log(`Device ${deviceId} state is ${state}, attempting reconnection...`);
            await deviceManager.reconnectDevice(deviceId);
          }
        } catch (error) {
          if (error.message && (
            error.message.includes('Session closed') || 
            error.message.includes('Protocol error') ||
            error.message.includes('Target closed')
          )) {
            console.log(`Device ${deviceId} session closed, reconnecting...`);
            await deviceManager.reconnectDevice(deviceId);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in health check:', error);
  }
}, 60000); // Check every 60 seconds

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 WhatsApp Web Dashboard Backend Ready`);
});
