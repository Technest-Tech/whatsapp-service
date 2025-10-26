import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSocket } from './SocketContext';
import { api } from '../services/api';

export interface Device {
  id: string;
  name: string;
  status: 'initializing' | 'qr_ready' | 'authenticated' | 'connected' | 'disconnected' | 'auth_failed' | 'error';
  qrCode?: string;
  lastSeen: string;
  createdAt: string;
}

interface DeviceContextType {
  devices: Device[];
  loading: boolean;
  error: string | null;
  addDevice: (name: string) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  getDevice: (id: string) => Device | undefined;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const useDevices = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevices must be used within a DeviceProvider');
  }
  return context;
};

interface DeviceProviderProps {
  children: React.ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/devices');
      if (response.data.success) {
        setDevices(response.data.devices);
      } else {
        setError('Failed to fetch devices');
      }
    } catch (err) {
      setError('Failed to fetch devices');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async (name: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/devices', { name });
      if (response.data.success) {
        // Don't add to list immediately - wait for real-time update
        // The device will be added via the 'device-update' socket event
        console.log('Device creation initiated, waiting for real-time update...');
      } else {
        setError(response.data.error || 'Failed to add device');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add device');
      console.error('Error adding device:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.delete(`/devices/${id}`);
      if (response.data.success) {
        setDevices(prev => prev.filter(device => device.id !== id));
      } else {
        setError(response.data.error || 'Failed to delete device');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete device');
      console.error('Error deleting device:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDevice = (id: string) => {
    return devices.find(device => device.id === id);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleDeviceUpdate = (device: Device) => {
        setDevices(prev => {
          const existingDevice = prev.find(d => d.id === device.id);
          if (existingDevice) {
            // Update existing device
            return prev.map(d => d.id === device.id ? device : d);
          } else {
            // Add new device
            return [...prev, device];
          }
        });
      };

      const handleDeviceDeleted = (data: { deviceId: string }) => {
        setDevices(prev => prev.filter(device => device.id !== data.deviceId));
      };

      socket.on('device-update', handleDeviceUpdate);
      socket.on('device-deleted', handleDeviceDeleted);

      return () => {
        socket.off('device-update', handleDeviceUpdate);
        socket.off('device-deleted', handleDeviceDeleted);
      };
    }
  }, [socket]);

  const value = {
    devices,
    loading,
    error,
    addDevice,
    deleteDevice,
    refreshDevices: fetchDevices,
    getDevice,
  };

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};
