import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Badge,
  Switch,
  FormControlLabel,
  Tooltip,
  Avatar,
  Chip,
  Fade,
  Slide,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Devices as DevicesIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  WhatsApp as WhatsAppIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDevices } from '../../contexts/DeviceContext';
import { useMessages } from '../../contexts/MessageContext';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, darkMode, toggleDarkMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { devices } = useDevices();
  const { chats } = useMessages();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/',
      description: 'Overview and analytics'
    },
    { 
      text: 'Devices', 
      icon: <DevicesIcon />, 
      path: '/devices',
      description: 'Manage WhatsApp devices'
    }, 
    { 
      text: 'Messages', 
      icon: <MessageIcon />, 
      path: '/messages',
      description: 'Send and receive messages'
    },
    { 
      text: 'Settings', 
      icon: <SettingsIcon />, 
      path: '/settings',
      description: 'App configuration'
    },
  ];

  const connectedDevices = devices.filter(device => device.status === 'connected').length;
  const unreadMessages = chats.reduce((total, chat) => total + chat.unreadCount, 0);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ 
            bgcolor: 'primary.main', 
            width: 48, 
            height: 48, 
            mr: 2,
            boxShadow: '0px 4px 12px rgba(37, 211, 102, 0.3)'
          }}>
            <WhatsAppIcon sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              WhatsApp Web
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Dashboard
            </Typography>
          </Box>
        </Box>
        
        {/* Dark Mode Toggle */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          borderRadius: 2,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {darkMode ? <DarkModeIcon sx={{ mr: 1 }} /> : <LightModeIcon sx={{ mr: 1 }} />}
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {darkMode ? 'Dark' : 'Light'} Mode
            </Typography>
          </Box>
          <Switch
            checked={darkMode}
            onChange={toggleDarkMode}
            size="small"
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
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, p: 2 }}>
        <Typography variant="subtitle2" sx={{ 
          color: 'text.secondary', 
          mb: 2, 
          px: 2,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Navigation
        </Typography>
        <List sx={{ p: 0 }}>
          {menuItems.map((item, index) => (
            <Slide key={item.text} direction="right" in timeout={200 + index * 100}>
              <ListItem disablePadding sx={{ mb: 1 }}>
                <Tooltip title={item.description} placement="right">
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) {
                        setMobileOpen(false);
                      }
                    }}
                    sx={{
                      borderRadius: 2,
                      mx: 1,
                      py: 1.5,
                      px: 2,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        boxShadow: '0px 4px 12px rgba(37, 211, 102, 0.3)',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'white',
                        transform: 'translateX(4px)',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {item.text === 'Devices' ? (
                        <Badge badgeContent={connectedDevices} color="secondary" max={99}>
                          {item.icon}
                        </Badge>
                      ) : item.text === 'Messages' ? (
                        <Badge badgeContent={unreadMessages} color="error" max={99}>
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: location.pathname === item.path ? 600 : 500,
                        fontSize: '0.875rem'
                      }}
                    />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            </Slide>
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2,
          borderRadius: 2,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200'
        }}>
          <Avatar sx={{ bgcolor: 'secondary.main', mr: 2, width: 32, height: 32 }}>
            <AccountCircleIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Admin User
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              System Administrator
            </Typography>
          </Box>
          <Chip 
            label="Online" 
            size="small" 
            color="success" 
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(20px)',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ px: 3 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              bgcolor: 'grey.100',
              '&:hover': {
                bgcolor: 'grey.200',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {menuItems.find(item => item.path === location.pathname)?.description || 'Overview and analytics'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Notifications">
              <IconButton sx={{ 
                bgcolor: 'grey.100',
                '&:hover': { bgcolor: 'grey.200' }
              }}>
                <Badge badgeContent={unreadMessages} color="error" max={99}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Chip 
              icon={<AccountCircleIcon />}
              label="Admin" 
              variant="outlined"
              size="small"
              sx={{ 
                fontWeight: 500,
                '& .MuiChip-icon': {
                  fontSize: '1rem'
                }
              }}
            />
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          position: 'relative',
        }}
      >
        <Fade in timeout={300}>
          <Box sx={{ p: 3, minHeight: '100%' }}>
            {children}
          </Box>
        </Fade>
      </Box>
    </Box>
  );
};

export default Layout;
