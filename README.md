# WhatsApp Web Dashboard

A modern, organized dashboard for managing multiple WhatsApp devices with React.js and Node.js, built on top of the `whatsapp-web.js` package.

## 🚀 Features

- **Multi-Device Management**: Add and manage multiple WhatsApp devices
- **QR Code Authentication**: Easy device connection with QR code scanning
- **Real-time Messaging**: Send and receive messages in real-time
- **Modern UI**: Beautiful, responsive dashboard with Material-UI
- **Component-Based Architecture**: Organized, maintainable code structure
- **WebSocket Communication**: Real-time updates and notifications
- **Message History**: Track and search message history
- **Export Functionality**: Export messages in JSON or CSV format
- **Device Status Monitoring**: Monitor connection status of all devices

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **whatsapp-web.js** for WhatsApp integration
- **Socket.io** for real-time communication
- **QRCode** for QR code generation
- **fs-extra** for file system operations

### Frontend
- **React.js** with TypeScript
- **Material-UI** for modern UI components
- **Socket.io-client** for real-time communication
- **Axios** for API communication
- **React Router** for navigation

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- WhatsApp mobile app for QR code scanning

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whatsapp-web-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development servers**

   **Option 1: Start both backend and frontend**
   ```bash
   # Terminal 1 - Backend
   npm run dev
   
   # Terminal 2 - Frontend
   npm run client
   ```

   **Option 2: Start individually**
   ```bash
   # Backend only
   npm start
   
   # Frontend only (in client directory)
   cd client && npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🎯 Usage

### Adding a Device

1. Go to the **Devices** page
2. Click **Add Device**
3. Enter a name for your device
4. Click **Show QR Code** when the QR code is ready
5. Scan the QR code with your WhatsApp mobile app
6. Wait for the device to connect

### Sending Messages

1. Go to the **Messages** page
2. Select a connected device
3. Enter recipient phone number (with country code)
4. Type your message
5. Click **Send**

### Managing Chats

1. Select a device from the dropdown
2. View all available chats
3. Click on a chat to view messages
4. Use the search functionality to find specific chats or messages

## 🏗️ Project Structure

```
whatsapp-web-dashboard/
├── server/                 # Backend code
│   ├── index.js           # Main server file
│   ├── services/          # Business logic
│   │   ├── DeviceManager.js
│   │   └── MessageHandler.js
│   └── routes/            # API routes
│       └── index.js
├── client/                # Frontend code
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── App.tsx
│   └── public/
├── data/                  # Device data storage
├── package.json
└── README.md
```

## 🔧 API Endpoints

### Devices
- `GET /api/devices` - Get all devices
- `POST /api/devices` - Add new device
- `GET /api/devices/:id` - Get device details
- `DELETE /api/devices/:id` - Delete device

### Messages
- `POST /api/devices/:id/send` - Send message
- `GET /api/devices/:id/chats` - Get device chats
- `GET /api/devices/:id/chats/:chatId/messages` - Get chat messages
- `GET /api/devices/:id/messages` - Get message history
- `GET /api/devices/:id/messages/search` - Search messages
- `GET /api/devices/:id/messages/stats` - Get message statistics
- `DELETE /api/devices/:id/messages` - Clear message history
- `GET /api/devices/:id/messages/export` - Export messages

## 🔌 WebSocket Events

### Client to Server
- `join-device-room` - Join device-specific room
- `leave-device-room` - Leave device-specific room

### Server to Client
- `device-update` - Device status update
- `device-deleted` - Device deleted
- `qr-code` - QR code generated
- `device-ready` - Device connected
- `auth-failure` - Authentication failed
- `new-message` - New message received
- `message-received` - Message received

## ⚠️ Important Notes

1. **WhatsApp Terms of Service**: This application uses unofficial WhatsApp integration. Use at your own risk and ensure compliance with WhatsApp's terms of service.

2. **Account Safety**: Be cautious when using multiple devices as WhatsApp may flag unusual activity.

3. **Data Storage**: Device data is stored locally in the `data/` directory. Ensure proper backup of this directory.

4. **Security**: The application runs in development mode by default. For production, implement proper security measures.

## 🚀 Production Deployment

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   ```bash
   NODE_ENV=production
   PORT=5000
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the GitHub issues
2. Create a new issue with detailed description
3. Include logs and error messages

## 🔄 Updates

- **v1.0.0**: Initial release with basic functionality
- Multi-device support
- Real-time messaging
- Modern UI with Material-UI
- WebSocket integration
- Message history and export
