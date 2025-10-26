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

  useEffect(() => {
    if (open && device) {
      setLoading(true);
      setError(null);
      
      // Check if device already has a QR code
      if (device.qrCode) {
        console.log('Device already has QR code:', device.qrCode.substring(0, 50) + '...');
        setQrCode(device.qrCode);
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
            setLoading(false);
          }
        };

        const handleDeviceReady = (data: { deviceId: string }) => {
          if (data.deviceId === device.id) {
            setLoading(false);
            setQrCode(null);
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
    setError(null);
    setLoading(false);
    onClose();
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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Scan this QR code with your WhatsApp mobile app
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Device: {device?.name}
            </Typography>
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
