import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Paper,
  Grid,
  Fade,
  Slide,
  Tooltip,
  Stack,
  Divider,
  Skeleton,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  QrCode as QrCodeIcon,
  Phone as PhoneIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useDevices } from '../contexts/DeviceContext';
import QRCodeDialog from '../components/Devices/QRCodeDialog';
import DeviceDetailsModal from '../components/Devices/DeviceDetailsModal';

const Devices: React.FC = () => {
  const { devices, loading, error, addDevice, deleteDevice, refreshDevices } = useDevices();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  const handleAddDevice = async () => {
    if (deviceName.trim()) {
      await addDevice(deviceName.trim());
      setDeviceName('');
      setAddDialogOpen(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      await deleteDevice(deviceId);
    }
  };

  const handleShowQR = (device: any) => {
    console.log('Opening QR dialog for device:', device);
    console.log('Device QR code:', device.qrCode ? 'Present' : 'Not present');
    setSelectedDevice(device);
    setQrDialogOpen(true);
  };

  const handleShowDetails = (device: any) => {
    setSelectedDevice(device);
    setDetailsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'qr_ready': return 'warning';
      case 'authenticated': return 'info';
      case 'disconnected': return 'default';
      case 'auth_failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon />;
      case 'qr_ready': return <QrCodeIcon />;
      case 'authenticated': return <PhoneIcon />;
      case 'disconnected': return <ErrorIcon />;
      case 'auth_failed': return <ErrorIcon />;
      default: return <ErrorIcon />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'qr_ready': return 'QR Code Ready';
      case 'authenticated': return 'Authenticated';
      case 'disconnected': return 'Disconnected';
      case 'auth_failed': return 'Authentication Failed';
      case 'initializing': return 'Initializing';
      default: return 'Unknown';
    }
  };

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* Header */}
      <Fade in timeout={300}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Device Management
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Manage your WhatsApp devices and connections
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title="Refresh Devices">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={refreshDevices}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                Refresh
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Add Device
            </Button>
          </Stack>
        </Box>
      </Fade>

      {/* Error Alert */}
      {error && (
        <Slide direction="down" in timeout={400}>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        </Slide>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CircularProgress size={40} />
        </Box>
      )}

      {/* Empty State */}
      {devices.length === 0 && !loading ? (
        <Fade in timeout={500}>
          <Card sx={{ 
            p: 6, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)',
            border: '2px dashed',
            borderColor: 'grey.300'
          }}>
            <Avatar sx={{ 
              bgcolor: 'primary.main', 
              width: 80, 
              height: 80, 
              mx: 'auto', 
              mb: 3,
              boxShadow: '0px 8px 32px rgba(37, 211, 102, 0.3)'
            }}>
              <WhatsAppIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
              No devices added yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              Add your first WhatsApp device to start managing messages and conversations
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              sx={{ borderRadius: 2, px: 4, py: 1.5 }}
            >
              Add Your First Device
            </Button>
          </Card>
        </Fade>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {devices.map((device, index) => (
            <Box key={device.id} sx={{ flex: '1 1 300px', minWidth: 300 }}>
              <Slide direction="up" in timeout={600 + index * 100}>
                <Card sx={{ 
                  height: '100%', 
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.15)',
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    {/* Device Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Avatar sx={{ 
                        bgcolor: getStatusColor(device.status) === 'success' ? 'success.main' : 
                                getStatusColor(device.status) === 'error' ? 'error.main' : 'warning.main',
                        width: 56, 
                        height: 56,
                        mr: 2,
                        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)'
                      }}>
                        {getStatusIcon(device.status)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {device.name}
                        </Typography>
                        <Chip
                          label={getStatusText(device.status)}
                          color={getStatusColor(device.status) as any}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Device Details & API">
                          <IconButton
                            onClick={() => handleShowDetails(device)}
                            color="primary"
                            size="small"
                            sx={{ 
                              bgcolor: 'primary.light',
                              color: 'primary.main',
                              '&:hover': {
                                bgcolor: 'primary.main',
                                color: 'white'
                              }
                            }}
                          >
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Device">
                          <IconButton
                            onClick={() => handleDeleteDevice(device.id)}
                            color="error"
                            size="small"
                            sx={{ 
                              bgcolor: 'error.light',
                              color: 'error.main',
                              '&:hover': {
                                bgcolor: 'error.main',
                                color: 'white'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Device Info */}
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <InfoIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Device ID
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {device.id.substring(0, 8)}...
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Last Seen
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(device.lastSeen).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SpeedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Created
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(device.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>

                    {/* Action Buttons */}
                    {device.status === 'qr_ready' && (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<QrCodeIcon />}
                        onClick={() => handleShowQR(device)}
                        sx={{ 
                          borderRadius: 2,
                          py: 1.5,
                          background: 'linear-gradient(135deg, #25D366 0%, #4AE584 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #1A9F4A 0%, #25D366 100%)',
                          }
                        }}
                      >
                        Show QR Code
                      </Button>
                    )}

                    {device.status === 'connected' && (
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        disabled
                        sx={{ 
                          borderRadius: 2,
                          py: 1.5,
                          background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                        }}
                      >
                        Connected
                      </Button>
                    )}

                    {device.status === 'disconnected' && (
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ErrorIcon />}
                        disabled
                        sx={{ borderRadius: 2, py: 1.5 }}
                      >
                        Disconnected
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Slide>
            </Box>
          ))}
        </Box>
      )}

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="add device"
        onClick={() => setAddDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', sm: 'none' },
          background: 'linear-gradient(135deg, #25D366 0%, #4AE584 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1A9F4A 0%, #25D366 100%)',
          }
        }}
      >
        <AddIcon />
      </Fab>

      {/* Add Device Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <AddIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Add New Device
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create a new WhatsApp device connection
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Device Name"
            fullWidth
            variant="outlined"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Enter a name for this device"
            sx={{ mt: 2 }}
            helperText="Choose a descriptive name to identify this device"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button 
            onClick={() => setAddDialogOpen(false)}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddDevice}
            variant="contained"
            disabled={!deviceName.trim() || loading}
            sx={{ borderRadius: 2 }}
          >
            Add Device
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <QRCodeDialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        device={selectedDevice}
      />

      {/* Device Details Modal */}
      <DeviceDetailsModal
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        device={selectedDevice}
      />
    </Box>
  );
};

export default Devices;