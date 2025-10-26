import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';

interface QRCodeDialogProps {
  open: boolean;
  onClose: () => void;
  device: any;
}

const QRCodeDialog: React.FC<QRCodeDialogProps> = ({ open, onClose, device }) => {
  const { socket } = useSocket();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrGeneratedAt, setQrGeneratedAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // QR Code validity timer (5 minutes)
  useEffect(() => {
    if (qrGeneratedAt) {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - qrGeneratedAt.getTime();
        const remaining = Math.max(0, 300000 - elapsed); // 5 minutes in milliseconds
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          setQrCode(null);
          setQrGeneratedAt(null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [qrGeneratedAt]);

  useEffect(() => {
    if (open && device) {
      setLoading(true);
      setError(null);
      
      // Check if device already has a QR code
      if (device.qrCode) {
        console.log('Device already has QR code:', device.qrCode.substring(0, 50) + '...');
        setQrCode(device.qrCode);
        setQrGeneratedAt(new Date());
        setLoading(false);
      } else {
        console.log('Device does not have QR code yet, waiting for socket event...');
      }
      
      // Join the device room to receive QR code updates
      if (socket) {
        socket.emit('join-device-room', device.id);
        
        const handleQRCode = (data: { deviceId: string; qrCode: string }) => {
          if (data.deviceId === device.id) {
            setQrCode(data.qrCode);
            setQrGeneratedAt(new Date());
            setLoading(false);
          }
        };

        const handleDeviceReady = (data: { deviceId: string }) => {
          if (data.deviceId === device.id) {
            setLoading(false);
            setQrCode(null);
            setQrGeneratedAt(null);
            onClose();
          }
        };

        const handleAuthFailure = (data: { deviceId: string; message: string }) => {
          if (data.deviceId === device.id) {
            setError(data.message || 'Authentication failed');
            setLoading(false);
          }
        };

        socket.on('qr-code', handleQRCode);
        socket.on('device-ready', handleDeviceReady);
        socket.on('auth-failure', handleAuthFailure);

        return () => {
          socket.off('qr-code', handleQRCode);
          socket.off('device-ready', handleDeviceReady);
          socket.off('auth-failure', handleAuthFailure);
          socket.emit('leave-device-room', device.id);
        };
      }
    }
  }, [open, device, socket, onClose]);

  const handleClose = () => {
    if (socket && device) {
      socket.emit('leave-device-room', device.id);
    }
    setQrCode(null);
    setQrGeneratedAt(null);
    setTimeRemaining(0);
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setQrCode(null);
    setQrGeneratedAt(null);
    setTimeRemaining(0);
    
    // Request new QR code from server
    if (socket && device) {
      socket.emit('request-qr-code', device.id);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WhatsAppIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            Scan QR Code
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ textAlign: 'center', py: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={60} />
            <Typography variant="body2" color="text.secondary">
              Generating QR code...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {qrCode && !loading && (
          <Box>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 2, 
                display: 'inline-block', 
                borderRadius: 2,
                backgroundColor: 'white'
              }}
            >
              <img 
                src={qrCode} 
                alt="WhatsApp QR Code" 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto',
                  borderRadius: 8
                }} 
              />
            </Paper>
            
            {/* Validity Timer */}
            {timeRemaining > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                <Typography variant="body2" color="warning.contrastText" sx={{ fontWeight: 'bold' }}>
                  QR Code expires in: {formatTime(timeRemaining)}
                </Typography>
              </Box>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Scan this QR code with your WhatsApp mobile app
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Device: {device?.name}
            </Typography>
            
            {/* Refresh Button */}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              sx={{ mt: 2 }}
            >
              Refresh QR Code
            </Button>
          </Box>
        )}

        {!qrCode && !loading && !error && (
          <Box sx={{ py: 4 }}>
            <WhatsAppIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Waiting for QR code to be generated...
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
        {qrCode && (
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={() => {
              setLoading(true);
              setError(null);
            }}
          >
            Refresh QR Code
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeDialog;
