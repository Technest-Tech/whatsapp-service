import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';
import { api } from '../services/api';

export interface Message {
  id: string;
  body: string;
  timestamp: number;
  from: string;
  to: string;
  fromMe: boolean;
  type: string;
  isForwarded: boolean;
  isGroup: boolean;
  receivedAt?: string;
  formattedTime?: string;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage?: {
    body: string;
    timestamp: number;
    fromMe: boolean;
  };
}

interface MessageContextType {
  messages: Message[];
  chats: Chat[];
  selectedChat: string | null;
  loading: boolean;
  error: string | null;
  sendMessage: (deviceId: string, to: string, message: string) => Promise<void>;
  getChats: (deviceId: string) => Promise<void>;
  getMessages: (deviceId: string, chatId: string) => Promise<void>;
  setSelectedChat: (chatId: string | null) => void;
  searchMessages: (deviceId: string, query: string) => Promise<Message[]>;
  getMessageStats: (deviceId: string) => Promise<any>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};

interface MessageProviderProps {
  children: React.ReactNode;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingChatsRef = useRef(false);
  const { socket } = useSocket();

  const sendMessage = useCallback(async (deviceId: string, to: string, message: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/devices/${deviceId}/send`, { to, message });
      if (!response.data.success) {
        setError(response.data.error || 'Failed to send message');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getChats = useCallback(async (deviceId: string) => {
    if (fetchingChatsRef.current) {
      console.log('Already fetching chats, skipping...');
      return;
    }
    
    try {
      console.log('getChats called for device:', deviceId);
      fetchingChatsRef.current = true;
      setLoading(true);
      setError(null);
      const response = await api.get(`/devices/${deviceId}/chats`);
      if (response.data.success) {
        console.log('Chats fetched successfully:', response.data.chats.length, 'chats');
        setChats(response.data.chats);
      } else {
        setError('Failed to fetch chats');
      }
    } catch (err) {
      setError('Failed to fetch chats');
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
      fetchingChatsRef.current = false;
    }
  }, []);

  const getMessages = useCallback(async (deviceId: string, chatId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/devices/${deviceId}/chats/${chatId}/messages`);
      if (response.data.success) {
        setMessages(response.data.messages);
      } else {
        setError('Failed to fetch messages');
      }
    } catch (err) {
      setError('Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchMessages = useCallback(async (deviceId: string, query: string): Promise<Message[]> => {
    try {
      const response = await api.get(`/devices/${deviceId}/messages/search?q=${encodeURIComponent(query)}`);
      if (response.data.success) {
        return response.data.messages;
      }
      return [];
    } catch (err) {
      console.error('Error searching messages:', err);
      return [];
    }
  }, []);

  const getMessageStats = useCallback(async (deviceId: string) => {
    try {
      const response = await api.get(`/devices/${deviceId}/messages/stats`);
      if (response.data.success) {
        return response.data.stats;
      }
      return null;
    } catch (err) {
      console.error('Error fetching message stats:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (data: { deviceId: string; message: Message }) => {
        console.log('New message received:', data.message);
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === data.message.id);
          if (!exists) {
            return [...prev, data.message].sort((a, b) => a.timestamp - b.timestamp);
          }
          return prev;
        });
      };

      const handleMessageReceived = (data: { deviceId: string; message: Message }) => {
        console.log('Message received:', data.message);
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === data.message.id);
          if (!exists) {
            return [...prev, data.message].sort((a, b) => a.timestamp - b.timestamp);
          }
          return prev;
        });
      };

      const handleMessageSent = (data: { deviceId: string; message: Message }) => {
        console.log('Message sent:', data.message);
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === data.message.id);
          if (!exists) {
            return [...prev, data.message].sort((a, b) => a.timestamp - b.timestamp);
          }
          return prev;
        });
      };

      socket.on('new-message', handleNewMessage);
      socket.on('message-received', handleMessageReceived);
      socket.on('message-sent', handleMessageSent);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('message-received', handleMessageReceived);
        socket.off('message-sent', handleMessageSent);
      };
    }
  }, [socket]);

  const value = {
    messages,
    chats,
    selectedChat,
    loading,
    error,
    sendMessage,
    getChats,
    getMessages,
    setSelectedChat,
    searchMessages,
    getMessageStats,
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};
