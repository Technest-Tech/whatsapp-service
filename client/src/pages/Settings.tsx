import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Fade,
  Slide,
  Stack,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useDevices } from '../contexts/DeviceContext';
import { useMessages } from '../contexts/MessageContext';

const Settings: React.FC = () => {
  const { devices, deleteDevice } = useDevices();
  const { getMessageStats, searchMessages } = useMessages();
  const [settings, setSettings] = useState({
    autoRefresh: true,
    notifications: true,
    darkMode: false,
    messageHistory: 1000,
    refreshInterval: 30,
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  const handleSettingChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [setting]: event.target.checked,
    });
  };

  const handleNumberChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [setting]: parseInt(event.target.value) || 0,
    });
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage or send to backend
    localStorage.setItem('whatsapp-dashboard-settings', JSON.stringify(settings));
    // You could also send to backend API
    console.log('Settings saved:', settings);
  };

  const handleExportMessages = async () => {
    if (selectedDevice) {
      try {
        const response = await fetch(`/api/devices/${selectedDevice}/messages/export?format=${exportFormat}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messages-${selectedDevice}-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setExportDialogOpen(false);
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  };

  const handleClearHistory = async (deviceId: string) => {
    if (window.confirm('Are you sure you want to clear all message history for this device?')) {
      try {
        await fetch(`/api/devices/${deviceId}/messages`, { method: 'DELETE' });
        console.log('Message history cleared');
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* Header */}
      <Fade in timeout={300}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
            <SettingsIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Settings
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Configure your WhatsApp Web application
            </Typography>
          </Box>
        </Box>
      </Fade>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* General Settings and Device Management */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
            <Fade in timeout={400}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <SettingsIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        General Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure app behavior and preferences
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Auto Refresh
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Automatically refresh data periodically
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.autoRefresh}
                        onChange={handleSettingChange('autoRefresh')}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'primary.main',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'primary.main',
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Desktop Notifications
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Show notifications for new messages
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.notifications}
                        onChange={handleSettingChange('notifications')}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'primary.main',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'primary.main',
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Dark Mode
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Switch between light and dark themes
                        </Typography>
                      </Box>
                      <Switch
                        checked={settings.darkMode}
                        onChange={handleSettingChange('darkMode')}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'primary.main',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'primary.main',
                          },
                        }}
                      />
                    </Box>

                    <TextField
                      label="Message History Limit"
                      type="number"
                      value={settings.messageHistory}
                      onChange={handleNumberChange('messageHistory')}
                      helperText="Maximum number of messages to keep in history"
                      fullWidth
                      sx={{ mt: 2 }}
                    />
                    
                    <TextField
                      label="Refresh Interval (seconds)"
                      type="number"
                      value={settings.refreshInterval}
                      onChange={handleNumberChange('refreshInterval')}
                      helperText="How often to refresh data automatically"
                      fullWidth
                    />
                  </Stack>
                  
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                    sx={{ 
                      mt: 4,
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(135deg, #25D366 0%, #4AE584 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1A9F4A 0%, #25D366 100%)',
                      }
                    }}
                  >
                    Save Settings
                  </Button>
                </CardContent>
              </Card>
            </Fade>
          </Box>

          <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
            <Fade in timeout={500}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                      <SecurityIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Device Management
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Manage your connected devices
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ mb: 3 }} />
                  
                  {devices.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        No devices added yet
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {devices.map((device, index) => (
                        <Slide key={device.id} direction="up" in timeout={600 + index * 100}>
                          <ListItem sx={{ 
                            px: 0, 
                            py: 2,
                            borderRadius: 2,
                            mb: 1,
                            '&:hover': {
                              bgcolor: 'grey.50'
                            }
                          }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {device.name}
                                </Typography>
                              }
                              secondary={
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                  <Chip 
                                    label={device.status.replace('_', ' ').toUpperCase()} 
                                    color={device.status === 'connected' ? 'success' : 'default'}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    Last seen: {new Date(device.lastSeen).toLocaleString()}
                                  </Typography>
                                </Stack>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Delete Device">
                                <IconButton
                                  onClick={() => deleteDevice(device.id)}
                                  color="error"
                                  size="small"
                                  sx={{ 
                                    bgcolor: 'error.light',
                                    '&:hover': {
                                      bgcolor: 'error.main',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </Slide>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Box>
        </Box>

        {/* Data Management */}
        <Fade in timeout={700}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <StorageIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Data Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Export and manage your data
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.light',
                      color: 'white'
                    },
                    transition: 'all 0.3s ease'
                  }}>
                    <DownloadIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Export Messages
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Export message history for backup or analysis
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => setExportDialogOpen(true)}
                      disabled={devices.length === 0}
                      sx={{ borderRadius: 2 }}
                    >
                      Export Messages
                    </Button>
                  </Paper>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    '&:hover': {
                      borderColor: 'error.main',
                      bgcolor: 'error.light',
                      color: 'white'
                    },
                    transition: 'all 0.3s ease'
                  }}>
                    <ClearIcon sx={{ fontSize: 48, mb: 2, color: 'error.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      Clear History
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Clear message history for specific devices
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<ClearIcon />}
                      color="error"
                      disabled={devices.length === 0}
                      sx={{ borderRadius: 2 }}
                    >
                      Clear History
                    </Button>
                  </Paper>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Fade>

        {/* System Information */}
        <Fade in timeout={800}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <InfoIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    System Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Application details and statistics
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label="Version" color="primary" variant="outlined" />
                      <Typography variant="body2">1.0.0</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label="Total Devices" color="secondary" variant="outlined" />
                      <Typography variant="body2">{devices.length}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label="Connected" color="success" variant="outlined" />
                      <Typography variant="body2">{devices.filter(d => d.status === 'connected').length}</Typography>
                    </Box>
                  </Stack>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label="Last Updated" color="info" variant="outlined" />
                      <Typography variant="body2">{new Date().toLocaleDateString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label="Environment" color="warning" variant="outlined" />
                      <Typography variant="body2">{process.env.NODE_ENV || 'development'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip label="API URL" color="default" variant="outlined" />
                      <Typography variant="body2">{process.env.REACT_APP_API_URL || 'http://localhost:5001'}</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Fade>
      </Box>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Messages</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              select
              label="Select Device"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="">Choose a device</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </TextField>
            <TextField
              select
              label="Export Format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              fullWidth
              SelectProps={{
                native: true,
              }}
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleExportMessages}
            variant="contained"
            disabled={!selectedDevice}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;