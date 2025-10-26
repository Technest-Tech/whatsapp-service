import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Paper,
  Grid,
  Fade,
  Slide,
  Tooltip,
  Divider,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  Message as MessageIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  WhatsApp as WhatsAppIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
} from '@mui/icons-material';
import { useDevices } from '../contexts/DeviceContext';
import { useMessages } from '../contexts/MessageContext';
import { useSocket } from '../contexts/SocketContext';

const Dashboard: React.FC = () => {
  const { devices, refreshDevices } = useDevices();
  const { chats, getMessageStats } = useMessages();
  const { isConnected } = useSocket();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (devices.length > 0) {
        try {
          const deviceStats = await Promise.all(
            devices.map(device => getMessageStats(device.id))
          );
          const totalStats = deviceStats.reduce((acc, stat) => {
            if (stat) {
              acc.total += stat.total;
              acc.today += stat.today;
              acc.incoming += stat.incoming;
              acc.outgoing += stat.outgoing;
            }
            return acc;
          }, { total: 0, today: 0, incoming: 0, outgoing: 0 });
          setStats(totalStats);
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      }
    };

    fetchStats();
  }, [devices, getMessageStats]);

  const connectedDevices = devices.filter(device => device.status === 'connected').length;
  const totalDevices = devices.length;
  const unreadMessages = chats.reduce((total, chat) => total + chat.unreadCount, 0);

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
      case 'qr_ready': return <WhatsAppIcon />;
      case 'authenticated': return <CheckCircleIcon />;
      case 'disconnected': return <ErrorIcon />;
      case 'auth_failed': return <ErrorIcon />;
      default: return <ErrorIcon />;
    }
  };

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* Header */}
      <Fade in timeout={300}>
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Monitor your WhatsApp devices and message activity
            </Typography>
          </Box>
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={refreshDevices} 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                '&:hover': { 
                  bgcolor: 'primary.dark',
                  transform: 'rotate(180deg)',
                  transition: 'all 0.3s ease'
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Fade>

      {/* Connection Status */}
      <Slide direction="down" in timeout={400}>
        <Card sx={{ 
          mb: 4, 
          background: isConnected 
            ? 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)' 
            : 'linear-gradient(135deg, #f44336 0%, #ef5350 100%)',
          color: 'white',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {isConnected ? <WifiIcon sx={{ fontSize: 32 }} /> : <WifiOffIcon sx={{ fontSize: 32 }} />}
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Server Connection
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {isConnected ? 'All systems operational' : 'Connection lost'}
                  </Typography>
                </Box>
              </Box>
              <Chip 
                icon={isConnected ? <CheckCircleIcon /> : <ErrorIcon />}
                label={isConnected ? 'Online' : 'Offline'} 
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 600
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Slide>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Slide direction="up" in timeout={500}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #25D366 0%, #4AE584 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 48, height: 48 }}>
                    <DevicesIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <TrendingUpIcon sx={{ opacity: 0.7 }} />
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {connectedDevices}/{totalDevices}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  Connected Devices
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(connectedDevices / Math.max(totalDevices, 1)) * 100}
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'white'
                    }
                  }}
                />
              </CardContent>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
              }} />
            </Card>
          </Slide>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Slide direction="up" in timeout={600}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #128C7E 0%, #4AB8A8 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 48, height: 48 }}>
                    <MessageIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <ScheduleIcon sx={{ opacity: 0.7 }} />
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {unreadMessages}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Unread Messages
                </Typography>
              </CardContent>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
              }} />
            </Card>
          </Slide>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Slide direction="up" in timeout={700}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 48, height: 48 }}>
                    <MessageIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <SpeedIcon sx={{ opacity: 0.7 }} />
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats?.total || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Messages
                </Typography>
              </CardContent>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
              }} />
            </Card>
          </Slide>
        </Box>

        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Slide direction="up" in timeout={800}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 48, height: 48 }}>
                    <MessageIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <TrendingUpIcon sx={{ opacity: 0.7 }} />
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {stats?.today || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Messages Today
                </Typography>
              </CardContent>
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                zIndex: 0
              }} />
            </Card>
          </Slide>
        </Box>
      </Box>

      {/* Device Status and Recent Chats */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Fade in timeout={900}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <DevicesIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Device Status
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monitor your connected devices
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {devices.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <WhatsAppIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      No devices added yet. Go to Devices page to add your first device.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {devices.map((device, index) => (
                      <Slide key={device.id} direction="right" in timeout={1000 + index * 100}>
                        <ListItem sx={{ 
                          px: 0, 
                          py: 2,
                          borderRadius: 2,
                          mb: 1,
                          '&:hover': {
                            bgcolor: 'grey.50'
                          }
                        }}>
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              bgcolor: getStatusColor(device.status) === 'success' ? 'success.main' : 
                                      getStatusColor(device.status) === 'error' ? 'error.main' : 'warning.main',
                              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)'
                            }}>
                              {getStatusIcon(device.status)}
                            </Avatar>
                          </ListItemAvatar>
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
                                  color={getStatusColor(device.status) as any}
                                  size="small"
                                  variant="outlined"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  Last seen: {new Date(device.lastSeen).toLocaleString()}
                                </Typography>
                              </Stack>
                            }
                          />
                        </ListItem>
                      </Slide>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Fade>
        </Box>

        <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
          <Fade in timeout={1000}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                    <MessageIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Recent Chats
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Latest conversations
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {chats.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <MessageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      No chats available. Connect a device to see chats.
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {chats.slice(0, 5).map((chat, index) => (
                      <Slide key={chat.id} direction="left" in timeout={1100 + index * 100}>
                        <ListItem sx={{ 
                          px: 0, 
                          py: 2,
                          borderRadius: 2,
                          mb: 1,
                          '&:hover': {
                            bgcolor: 'grey.50'
                          }
                        }}>
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              bgcolor: 'secondary.main',
                              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)'
                            }}>
                              <MessageIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {chat.name}
                              </Typography>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                {chat.unreadCount > 0 && (
                                  <Chip 
                                    label={`${chat.unreadCount} unread`} 
                                    color="error" 
                                    size="small"
                                  />
                                )}
                                {chat.lastMessage && (
                                  <Typography variant="caption" color="text.secondary">
                                    {chat.lastMessage.body.substring(0, 50)}...
                                  </Typography>
                                )}
                              </Stack>
                            }
                          />
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
    </Box>
  );
};

export default Dashboard;