const moment = require('moment');

class MessageHandler {
  constructor(io) {
    this.io = io;
    this.messageHistory = new Map(); // Store message history by deviceId
  }

  handleIncomingMessage(deviceId, message) {
    // Store message in history
    if (!this.messageHistory.has(deviceId)) {
      this.messageHistory.set(deviceId, []);
    }
    
    const deviceMessages = this.messageHistory.get(deviceId);
    deviceMessages.push({
      ...message,
      receivedAt: new Date(),
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Keep only last 1000 messages per device
    if (deviceMessages.length > 1000) {
      deviceMessages.splice(0, deviceMessages.length - 1000);
    }

    // Emit to connected clients
    this.io.to(`device-${deviceId}`).emit('message-received', {
      deviceId,
      message: {
        ...message,
        receivedAt: new Date()
      }
    });

    // Emit to all clients for real-time updates
    this.io.emit('new-message', {
      deviceId,
      message: {
        ...message,
        receivedAt: new Date()
      }
    });
  }

  getMessageHistory(deviceId, limit = 100) {
    const deviceMessages = this.messageHistory.get(deviceId) || [];
    return deviceMessages
      .slice(-limit)
      .map(msg => ({
        ...msg,
        formattedTime: moment(msg.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
      }));
  }

  getMessagesByChat(deviceId, chatId, limit = 50) {
    const deviceMessages = this.messageHistory.get(deviceId) || [];
    return deviceMessages
      .filter(msg => msg.from === chatId || msg.to === chatId)
      .slice(-limit)
      .map(msg => ({
        ...msg,
        formattedTime: moment(msg.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
      }));
  }

  searchMessages(deviceId, query, limit = 50) {
    const deviceMessages = this.messageHistory.get(deviceId) || [];
    const searchQuery = query.toLowerCase();
    
    return deviceMessages
      .filter(msg => 
        msg.body && msg.body.toLowerCase().includes(searchQuery)
      )
      .slice(-limit)
      .map(msg => ({
        ...msg,
        formattedTime: moment(msg.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
      }));
  }

  getMessageStats(deviceId) {
    const deviceMessages = this.messageHistory.get(deviceId) || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: deviceMessages.length,
      today: deviceMessages.filter(msg => new Date(msg.timestamp * 1000) >= today).length,
      yesterday: deviceMessages.filter(msg => {
        const msgDate = new Date(msg.timestamp * 1000);
        return msgDate >= yesterday && msgDate < today;
      }).length,
      thisWeek: deviceMessages.filter(msg => new Date(msg.timestamp * 1000) >= weekAgo).length,
      incoming: deviceMessages.filter(msg => !msg.fromMe).length,
      outgoing: deviceMessages.filter(msg => msg.fromMe).length,
      groups: deviceMessages.filter(msg => msg.isGroup).length,
      private: deviceMessages.filter(msg => !msg.isGroup).length
    };

    return stats;
  }

  clearMessageHistory(deviceId) {
    this.messageHistory.set(deviceId, []);
    this.io.to(`device-${deviceId}`).emit('message-history-cleared', { deviceId });
  }

  exportMessages(deviceId, format = 'json') {
    const deviceMessages = this.messageHistory.get(deviceId) || [];
    
    if (format === 'json') {
      return JSON.stringify(deviceMessages, null, 2);
    } else if (format === 'csv') {
      const csvHeader = 'ID,From,To,Body,Timestamp,Type,FromMe,IsGroup\n';
      const csvData = deviceMessages.map(msg => 
        `"${msg.id}","${msg.from}","${msg.to}","${msg.body}","${msg.formattedTime || new Date(msg.timestamp * 1000).toISOString()}","${msg.type}","${msg.fromMe}","${msg.isGroup}"`
      ).join('\n');
      return csvHeader + csvData;
    }
    
    return deviceMessages;
  }
}

module.exports = MessageHandler;
