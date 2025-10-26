import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  TextField,
  Button,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Autocomplete,
  Snackbar,
  Grid,
  IconButton,
  Badge,
  Tooltip,
  Fade,
  Slide,
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Message as MessageIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Chat as ChatIcon,
  MoreVert as MoreVertIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useDevices } from '../contexts/DeviceContext';
import { useMessages } from '../contexts/MessageContext';

const Messages: React.FC = () => {
  const { devices } = useDevices();
  const { 
    messages, 
    chats, 
    selectedChat, 
    loading, 
    error, 
    sendMessage, 
    getChats, 
    getMessages, 
    setSelectedChat 
  } = useMessages();
  
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [showAllMessages, setShowAllMessages] = useState(false);
  const lastDeviceRef = useRef<string | null>(null);

  const connectedDevices = devices.filter(device => device.status === 'connected');

  useEffect(() => {
    if (selectedDevice && selectedDevice !== lastDeviceRef.current) {
      console.log('Fetching chats for device:', selectedDevice);
      lastDeviceRef.current = selectedDevice;
      getChats(selectedDevice);
    }
  }, [selectedDevice, getChats]);

  useEffect(() => {
    if (selectedDevice && selectedChat) {
      getMessages(selectedDevice, selectedChat);
    }
  }, [selectedDevice, selectedChat, getMessages]);

  const handleSendMessage = async () => {
    if (messageText.trim() && selectedDevice) {
      try {
        let formattedRecipient: string;
        
        // If we're in a chat conversation, use the chat ID
        if (selectedChat) {
          formattedRecipient = selectedChat;
          console.log('Sending message to chat:', selectedChat);
        } else if (recipient.trim()) {
          // If we're sending a new message, format the recipient
          formattedRecipient = recipient.trim();
          
          // Remove any non-digit characters except + at the beginning
          if (!formattedRecipient.startsWith('+')) {
            // If it doesn't start with +, add country code (assuming +1 for US, you can modify this)
            formattedRecipient = formattedRecipient.replace(/\D/g, '');
            if (formattedRecipient.length === 10) {
              formattedRecipient = '+1' + formattedRecipient;
            } else if (formattedRecipient.length === 11 && formattedRecipient.startsWith('1')) {
              formattedRecipient = '+' + formattedRecipient;
            } else {
              formattedRecipient = '+' + formattedRecipient;
            }
          }
          
          // Ensure it ends with @c.us for individual chats
          if (!formattedRecipient.includes('@')) {
            formattedRecipient += '@c.us';
          }
          
          console.log('Sending new message to:', formattedRecipient);
        } else {
          setSnackbar({ 
            open: true, 
            message: 'Please select a conversation or enter a recipient', 
            severity: 'error' 
          });
          return;
        }
        
        await sendMessage(selectedDevice, formattedRecipient, messageText.trim());
        setMessageText('');
        if (!selectedChat) {
          setRecipient('');
        }
        
        // Refresh messages after sending with a small delay
        if (selectedChat) {
          setTimeout(() => {
            getMessages(selectedDevice, selectedChat);
          }, 1000);
        }
        
        setSnackbar({ 
          open: true, 
          message: 'Message sent successfully!', 
          severity: 'success' 
        });
      } catch (error: any) {
        console.error('Error sending message:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to send message. Please try again.';
        setSnackbar({ 
          open: true, 
          message: errorMessage, 
          severity: 'error' 
        });
      }
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMessages = showAllMessages ? messages : messages.filter(message => {
    // If we have a search query, filter by it
    if (searchQuery.trim()) {
      const matchesSearch = message.body.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
    }
    
    // If we have a selected chat, only show messages from/to that chat
    if (selectedChat) {
      const matchesChat = message.from === selectedChat || message.to === selectedChat || 
                         message.from.includes(selectedChat) || message.to.includes(selectedChat);
      return matchesChat;
    }
    
    // If no chat selected, show all messages
    return true;
  });

  // Debug logging
  console.log('Messages debug:', {
    totalMessages: messages.length,
    selectedChat,
    filteredMessages: filteredMessages.length,
    searchQuery,
    hasMessages: messages.length > 0,
    hasFilteredMessages: filteredMessages.length > 0,
    sampleMessages: messages.slice(0, 3).map(m => ({ 
      id: m.id, 
      from: m.from, 
      to: m.to, 
      body: m.body?.substring(0, 50), 
      type: m.type,
      fromMe: m.fromMe,
      timestamp: m.timestamp
    }))
  });

  // Extract unique phone numbers from chats for autocomplete
  const phoneNumbers = Array.from(new Set(
    chats
      .filter(chat => !chat.isGroup) // Only individual chats
      .map(chat => {
        // Extract phone number from chat name or ID
        const phoneMatch = chat.name.match(/(\+?\d{10,15})/);
        if (phoneMatch) {
          return phoneMatch[1];
        }
        // If no phone number found, use the chat name as is
        return chat.name;
      })
      .filter(phone => phone && (phone.length >= 10 || phone.includes('@'))) // Include email addresses too
  )).sort();

  // Get recent contacts (chats with recent messages)
  const recentContacts = chats
    .filter(chat => !chat.isGroup && chat.lastMessage)
    .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0))
    .slice(0, 5)
    .map(chat => {
      const phoneMatch = chat.name.match(/(\+?\d{10,15})/);
      return phoneMatch ? phoneMatch[1] : chat.name;
    });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper elevation={0} sx={{ 
        p: 3, 
        bgcolor: 'white', 
        borderBottom: '1px solid', 
        borderColor: 'grey.200',
        borderRadius: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <ChatIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Messages
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Send and receive WhatsApp messages
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Device</InputLabel>
              <Select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                label="Select Device"
                sx={{ borderRadius: 2 }}
              >
                {connectedDevices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon sx={{ fontSize: 16 }} />
                      {device.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Tooltip title="Refresh Conversations">
              <IconButton 
                onClick={() => selectedDevice && getChats(selectedDevice)}
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
        </Box>
      </Paper>

      {!selectedDevice ? (
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50',
          p: 4
        }}>
          <PhoneIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Select a Device
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
            Choose a connected WhatsApp device to start managing your messages
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Sidebar - Chats */}
          <Paper 
            elevation={0} 
            sx={{ 
              width: 400, 
              borderRight: '1px solid', 
              borderColor: 'grey.200',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'white'
            }}
          >
            {/* Chat Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Conversations
              </Typography>
              <TextField
                size="small"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 3,
                    bgcolor: 'grey.50'
                  }
                }}
              />
            </Box>

            {/* Chat List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : filteredChats.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <MessageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No conversations found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {filteredChats.map((chat) => (
                    <ListItem
                      key={chat.id}
                      onClick={() => setSelectedChat(chat.id)}
                      sx={{
                        cursor: 'pointer',
                        borderBottom: '1px solid',
                        borderColor: 'grey.100',
                        '&:hover': {
                          bgcolor: 'grey.50',
                        },
                        bgcolor: selectedChat === chat.id ? 'primary.light' : 'transparent',
                        color: selectedChat === chat.id ? 'white' : 'inherit',
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: chat.isGroup ? 'secondary.main' : 'primary.main',
                          width: 48,
                          height: 48
                        }}>
                          {chat.isGroup ? <GroupIcon /> : <PersonIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                fontWeight: 'bold',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {chat.name}
                            </Typography>
                            {chat.unreadCount > 0 && (
                              <Badge 
                                badgeContent={chat.unreadCount} 
                                color="error" 
                                sx={{ ml: 'auto' }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="div">
                            {chat.lastMessage && (
                              <Typography 
                                variant="body2" 
                                component="span"
                                sx={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: selectedChat === chat.id ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                  display: 'block'
                                }}
                              >
                                {chat.lastMessage.fromMe ? 'You: ' : ''}{chat.lastMessage.body}
                              </Typography>
                            )}
                            {chat.lastMessage && (
                              <Typography 
                                variant="caption" 
                                component="span"
                                sx={{ 
                                  color: selectedChat === chat.id ? 'rgba(255,255,255,0.6)' : 'text.secondary',
                                  display: 'block'
                                }}
                              >
                                {formatTime(chat.lastMessage.timestamp)}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>

          {/* Right Side - Messages */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedChat ? (
              <>
                {/* Message Header */}
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    borderBottom: '1px solid', 
                    borderColor: 'grey.200',
                    bgcolor: 'white'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {chats.find(c => c.id === selectedChat)?.isGroup ? <GroupIcon /> : <PersonIcon />}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {chats.find(c => c.id === selectedChat)?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {chats.find(c => c.id === selectedChat)?.isGroup ? 'Group' : 'Individual'}
                        {messages.length > 0 && ` • ${messages.length} messages`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant={showAllMessages ? "contained" : "outlined"}
                        onClick={() => setShowAllMessages(!showAllMessages)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {showAllMessages ? 'Filtered' : 'Show All'}
                      </Button>
                      <IconButton>
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>

                {/* Messages Area */}
                <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50', p: 2 }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : filteredMessages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <MessageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        No messages in this conversation
                      </Typography>
                      {messages.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Total messages: {messages.length} | Filtered: {filteredMessages.length}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {filteredMessages.map((message, index) => {
                        const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
                        const showDate = !prevMessage || 
                          formatDate(message.timestamp) !== formatDate(prevMessage.timestamp);
                        
                        return (
                          <React.Fragment key={message.id}>
                            {showDate && (
                              <Box sx={{ textAlign: 'center', my: 2 }}>
                                <Chip 
                                  label={formatDate(message.timestamp)} 
                                  size="small" 
                                  sx={{ bgcolor: 'white' }}
                                />
                              </Box>
                            )}
                            <Tooltip 
                              title={`ID: ${message.id} | Type: ${message.type} | Body: ${message.body || 'empty'} | FromMe: ${message.fromMe}`}
                              placement={message.fromMe ? 'left' : 'right'}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: message.fromMe ? 'flex-end' : 'flex-start',
                                  mb: 2,
                                  px: 1
                                }}
                              >
                              <Paper
                                elevation={2}
                                sx={{
                                  p: 2.5,
                                  maxWidth: '70%',
                                  minHeight: '40px', // Ensure minimum height
                                  bgcolor: message.fromMe 
                                    ? 'linear-gradient(135deg, #25D366 0%, #4AE584 100%)' 
                                    : 'grey.100',
                                  color: message.fromMe ? 'white' : 'text.primary',
                                  '& .MuiTypography-root': {
                                    color: message.fromMe ? 'white' : 'text.primary',
                                  },
                                  border: message.fromMe ? 'none' : '1px solid',
                                  borderColor: message.fromMe ? 'transparent' : 'divider',
                                  borderRadius: message.fromMe ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                                  boxShadow: message.fromMe 
                                    ? '0px 4px 12px rgba(37, 211, 102, 0.3)' 
                                    : '0px 2px 12px rgba(0, 0, 0, 0.15)',
                                  transition: 'all 0.2s ease',
                                  opacity: (!message.body || !message.body.trim()) ? 0.8 : 1, // Slightly fade empty messages
                                  '&:hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: message.fromMe 
                                      ? '0px 6px 16px rgba(37, 211, 102, 0.4)' 
                                      : '0px 4px 16px rgba(0, 0, 0, 0.2)'
                                  }
                                }}
                              >
                                <Typography variant="body1" sx={{ 
                                  wordBreak: 'break-word',
                                  lineHeight: 1.5,
                                  fontWeight: message.fromMe ? 500 : 400,
                                  color: 'inherit',
                                  minHeight: '20px', // Ensure text has minimum height
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  {(() => {
                                    // Debug log for message content
                                    console.log('Rendering message:', {
                                      id: message.id,
                                      body: message.body,
                                      type: message.type,
                                      fromMe: message.fromMe,
                                      hasBody: !!message.body,
                                      bodyLength: message.body?.length || 0
                                    });
                                    
                                    // If we have a body, show it
                                    if (message.body && message.body.trim()) {
                                      return message.body;
                                    }
                                    
                                    // If no body, show appropriate content based on type
                                    switch (message.type) {
                                      case 'image':
                                        return '📷 Image';
                                      case 'audio':
                                        return '🎵 Audio';
                                      case 'video':
                                        return '🎥 Video';
                                      case 'document':
                                        return '📄 Document';
                                      case 'sticker':
                                        return '😊 Sticker';
                                      case 'location':
                                        return '📍 Location';
                                      case 'contact':
                                        return '👤 Contact';
                                      default:
                                        // If we have no body and no specific type, show a fallback
                                        if (message.fromMe) {
                                          return 'Message sent';
                                        } else {
                                          return 'Message received';
                                        }
                                    }
                                  })()}
                                </Typography>
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mt: 1
                                }}>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      opacity: 0.7,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {formatTime(message.timestamp)}
                                  </Typography>
                                  {message.fromMe && (
                                    <Box sx={{ ml: 1 }}>
                                      <CheckCircleIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                                    </Box>
                                  )}
                                </Box>
                              </Paper>
                              </Box>
                            </Tooltip>
                          </React.Fragment>
                        );
                      })}
                    </Box>
                  )}
                </Box>

                {/* Message Input */}
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 3, 
                    borderTop: '1px solid', 
                    borderColor: 'grey.200',
                    bgcolor: 'white',
                    borderRadius: 0
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                    <Tooltip title="Attach File">
                      <IconButton sx={{ 
                        bgcolor: 'grey.100',
                        '&:hover': { bgcolor: 'grey.200' }
                      }}>
                        <AttachFileIcon />
                      </IconButton>
                    </Tooltip>
                    <TextField
                      multiline
                      maxRows={4}
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      sx={{ 
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          bgcolor: 'grey.50',
                          '&:hover': {
                            bgcolor: 'grey.100'
                          },
                          '&.Mui-focused': {
                            bgcolor: 'white',
                            boxShadow: '0px 0px 0px 2px rgba(37, 211, 102, 0.2)'
                          }
                        }
                      }}
                    />
                    <Tooltip title="Add Emoji">
                      <IconButton sx={{ 
                        bgcolor: 'grey.100',
                        '&:hover': { bgcolor: 'grey.200' }
                      }}>
                        <EmojiIcon />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || loading}
                      sx={{ 
                        borderRadius: 3,
                        px: 3,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #25D366 0%, #4AE584 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1A9F4A 0%, #25D366 100%)',
                          transform: 'translateY(-1px)',
                          boxShadow: '0px 4px 12px rgba(37, 211, 102, 0.3)'
                        },
                        '&:disabled': {
                          background: 'grey.300',
                          color: 'grey.500'
                        }
                      }}
                    >
                      Send
                    </Button>
                  </Box>
                </Paper>
              </>
            ) : (
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.50',
                p: 4
              }}>
                <ChatIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  Select a Conversation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
                  Choose a conversation from the sidebar to start messaging
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Send Message Card - Only show when no chat is selected */}
      {selectedDevice && !selectedChat && (
        <Slide direction="up" in={true}>
          <Paper 
            elevation={3} 
            sx={{ 
              position: 'fixed', 
              bottom: 20, 
              right: 20, 
              width: 400, 
              p: 3,
              borderRadius: 3
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Send New Message
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                freeSolo
                options={[...recentContacts, ...phoneNumbers.filter(p => !recentContacts.includes(p))]}
                value={recipient}
                onChange={(event, newValue) => {
                  setRecipient(newValue || '');
                }}
                onInputChange={(event, newInputValue) => {
                  setRecipient(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Recipient"
                    placeholder="Enter phone number or select from contacts"
                    fullWidth
                    size="small"
                  />
                )}
                renderOption={(props, option) => {
                  const isRecent = recentContacts.includes(option);
                  return (
                    <Box component="li" {...props}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <PersonIcon sx={{ color: isRecent ? 'primary.main' : 'text.secondary', fontSize: 20 }} />
                        <Typography sx={{ fontWeight: isRecent ? 'bold' : 'normal', flex: 1 }}>
                          {option}
                        </Typography>
                        {isRecent && (
                          <Chip 
                            label="Recent" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  );
                }}
                groupBy={(option) => recentContacts.includes(option) ? 'Recent Contacts' : 'All Contacts'}
                size="small"
              />
              
              <TextField
                multiline
                rows={3}
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                size="small"
              />
              
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={handleSendMessage}
                disabled={!messageText.trim() || !recipient.trim()}
                fullWidth
                sx={{ borderRadius: 2 }}
              >
                Send Message
              </Button>
            </Box>
          </Paper>
        </Slide>
      )}

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Messages;