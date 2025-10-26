import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  TextField,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Tooltip,
  Snackbar,
  Stack,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
  Send as SendIcon,
  Message as MessageIcon,
  Phone as PhoneIcon,
  Code as CodeIcon,
  Api as ApiIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';

interface DeviceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  device: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`device-tabpanel-${index}`}
      aria-labelledby={`device-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({ open, onClose, device }) => {
  const { socket } = useSocket();
  const [tabValue, setTabValue] = useState(0);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [baseUrl] = useState(window.location.origin.replace('3000', '5001'));

  useEffect(() => {
    if (open && device) {
      fetchApiKeys();
    }
  }, [open, device]);

  const fetchApiKeys = async () => {
    if (!device) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/devices/${device.id}/api-keys`);
      const data = await response.json();
      if (data.success) {
        setApiKeys(data.apiKeys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim() || !device) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/devices/${device.id}/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyName: newKeyName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setApiKeys([data.apiKey, ...apiKeys]);
        setNewKeyName('');
        setSnackbar({ open: true, message: 'API key created successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to create API key', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error creating API key', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
        setSnackbar({ open: true, message: 'API key deleted successfully!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.error || 'Failed to delete API key', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Error deleting API key', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard!', severity: 'success' });
  };

  const generateCurlExample = (apiKey: string, endpoint: string, method: string = 'GET', body?: any) => {
    const headers = `-H "X-API-Key: ${apiKey}" -H "Content-Type: application/json"`;
    const url = `${baseUrl}/api${endpoint}`;
    
    if (method === 'POST' && body) {
      return `curl -X ${method} "${url}" ${headers} -d '${JSON.stringify(body)}'`;
    }
    
    return `curl -X ${method} "${url}" ${headers}`;
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

  if (!device) return null;

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: `${getStatusColor(device.status)}.main` }}>
              <PhoneIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {device.name}
              </Typography>
              <Chip
                label={getStatusText(device.status)}
                color={getStatusColor(device.status) as any}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="API Keys" icon={<KeyIcon />} />
              <Tab label="API Examples" icon={<CodeIcon />} />
              <Tab label="Device Info" icon={<PhoneIcon />} />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              {/* Create New API Key */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddIcon />
                  Create New API Key
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                  <TextField
                    label="Key Name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Mobile App Key"
                    fullWidth
                    variant="outlined"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleCreateApiKey}
                    disabled={!newKeyName.trim() || loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                  >
                    Create
                  </Button>
                </Box>
              </Paper>

              {/* API Keys List */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <KeyIcon />
                  API Keys ({apiKeys.length})
                </Typography>
                
                {loading && apiKeys.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : apiKeys.length === 0 ? (
                  <Alert severity="info">
                    No API keys created yet. Create one to start using the API.
                  </Alert>
                ) : (
                  <List>
                    {apiKeys.map((key, index) => (
                      <React.Fragment key={key.id}>
                        <ListItem sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} component="div">
                                <Typography variant="subtitle1" sx={{ fontWeight: 500 }} component="span">
                                  {key.key_name}
                                </Typography>
                                <Chip
                                  label={key.is_active ? 'Active' : 'Inactive'}
                                  color={key.is_active ? 'success' : 'default'}
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }} component="div">
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} component="div">
                                  <strong>API Key:</strong> {key.auth_key}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" component="div">
                                  Created: {new Date(key.created_at).toLocaleString()}
                                  {key.last_used && ` • Last used: ${new Date(key.last_used).toLocaleString()}`}
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="Copy API Key">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(key.auth_key)}
                                >
                                  <CopyIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete API Key">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteApiKey(key.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < apiKeys.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
            </Stack>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              {apiKeys.length === 0 ? (
                <Alert severity="info">
                  Create an API key first to see usage examples.
                </Alert>
              ) : (
                <>
                  {/* Send Message Example */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SendIcon />
                      Send Message
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Send a WhatsApp message to any number or group.
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        cURL Example:
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {generateCurlExample(
                          apiKeys[0].auth_key,
                          '/send-message',
                          'POST',
                          { to: '1234567890@c.us', message: 'Hello from WhatsApp API!' }
                        )}
                      </Paper>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={() => copyToClipboard(
                        generateCurlExample(
                          apiKeys[0].auth_key,
                          '/send-message',
                          'POST',
                          { to: '1234567890@c.us', message: 'Hello from WhatsApp API!' }
                        )
                      )}
                    >
                      Copy cURL
                    </Button>
                  </Paper>

                  {/* Get Messages Example */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MessageIcon />
                      Get Messages
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Retrieve recent messages from the device.
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        cURL Example:
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {generateCurlExample(apiKeys[0].auth_key, '/messages?limit=50')}
                      </Paper>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={() => copyToClipboard(
                        generateCurlExample(apiKeys[0].auth_key, '/messages?limit=50')
                      )}
                    >
                      Copy cURL
                    </Button>
                  </Paper>

                  {/* Search Messages Example */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MessageIcon />
                      Search Messages
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Search for messages containing specific text.
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        cURL Example:
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {generateCurlExample(apiKeys[0].auth_key, '/messages/search?q=hello&limit=20')}
                      </Paper>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={() => copyToClipboard(
                        generateCurlExample(apiKeys[0].auth_key, '/messages/search?q=hello&limit=20')
                      )}
                    >
                      Copy cURL
                    </Button>
                  </Paper>

                  {/* Get Device Status Example */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon />
                      Get Device Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Check the current status of the device.
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        cURL Example:
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {generateCurlExample(apiKeys[0].auth_key, '/device/status')}
                      </Paper>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={() => copyToClipboard(
                        generateCurlExample(apiKeys[0].auth_key, '/device/status')
                      )}
                    >
                      Copy cURL
                    </Button>
                  </Paper>

                  {/* Get Chats Example */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MessageIcon />
                      Get Chats
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Retrieve all chats (conversations) from the device.
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        cURL Example:
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {generateCurlExample(apiKeys[0].auth_key, '/chats')}
                      </Paper>
                    </Box>
                    <Button
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={() => copyToClipboard(
                        generateCurlExample(apiKeys[0].auth_key, '/chats')
                      )}
                    >
                      Copy cURL
                    </Button>
                  </Paper>
                </>
              )}
            </Stack>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Card>
                    <CardHeader title="Device Information" />
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Device ID
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {device.id}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Name
                          </Typography>
                          <Typography variant="body2">
                            {device.name}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={getStatusText(device.status)}
                              color={getStatusColor(device.status) as any}
                              size="small"
                            />
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Last Seen
                          </Typography>
                          <Typography variant="body2">
                            {new Date(device.lastSeen).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Created
                          </Typography>
                          <Typography variant="body2">
                            {new Date(device.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Card>
                    <CardHeader title="API Information" />
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Base URL
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {baseUrl}/api
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Authentication
                          </Typography>
                          <Typography variant="body2">
                            X-API-Key header or Authorization: Bearer
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Content Type
                          </Typography>
                          <Typography variant="body2">
                            application/json
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            API Keys
                          </Typography>
                          <Typography variant="body2">
                            {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''} created
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Note:</strong> All API endpoints require authentication using the X-API-Key header 
                  or Authorization header with Bearer token. Make sure your device is connected before 
                  using the API endpoints.
                </Typography>
              </Alert>
            </Stack>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
          <Button
            onClick={fetchApiKeys}
            variant="contained"
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </>
  );
};

export default DeviceDetailsModal;
