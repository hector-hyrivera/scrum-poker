import React, { useState } from 'react';
import { useSocketEvent } from './use-socket-event';
import { Alert, Box, LinearProgress } from '@mui/material';
import { 
  WifiOff as WifiOffIcon, 
  Wifi as WifiIcon, 
  Sync as SyncIcon,
  Error as ErrorIcon 
} from '@mui/icons-material';

interface ConnectionStatusData {
  status: 'connected' | 'disconnected' | 'reconnecting' | 'failed' | 'offline' | 'error';
  latency?: number;
  error?: any;
}

/**
 * Component that displays the current connection status with visual feedback.
 */
const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatusData>({ status: 'connected' });
  const [showStatus, setShowStatus] = useState(false);

  useSocketEvent<ConnectionStatusData>('connectionStatus', (data) => {
    setStatus(data);
    
    // Show status for disconnected, reconnecting, failed, or error states
    const shouldShow = ['disconnected', 'reconnecting', 'failed', 'offline', 'error'].includes(data.status);
    setShowStatus(shouldShow);
    
    // Auto-hide successful connection status after 3 seconds
    if (data.status === 'connected' && showStatus) {
      setTimeout(() => setShowStatus(false), 3000);
    }
  });

  if (!showStatus) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status.status) {
      case 'connected':
        return {
          severity: 'success' as const,
          icon: <WifiIcon />,
          message: `Connected${status.latency ? ` (${status.latency}ms)` : ''}`,
          color: 'success'
        };
      case 'disconnected':
        return {
          severity: 'warning' as const,
          icon: <WifiOffIcon />,
          message: 'Connection lost. Attempting to reconnect...',
          color: 'warning'
        };
      case 'reconnecting':
        return {
          severity: 'info' as const,
          icon: <SyncIcon className="animate-spin" />,
          message: 'Reconnecting...',
          color: 'info'
        };
      case 'failed':
        return {
          severity: 'error' as const,
          icon: <ErrorIcon />,
          message: 'Connection failed. Please refresh the page.',
          color: 'error'
        };
      case 'offline':
        return {
          severity: 'error' as const,
          icon: <WifiOffIcon />,
          message: 'You are offline. Check your internet connection.',
          color: 'error'
        };
      case 'error':
        return {
          severity: 'error' as const,
          icon: <ErrorIcon />,
          message: 'Connection error occurred.',
          color: 'error'
        };
      default:
        return {
          severity: 'info' as const,
          icon: <WifiIcon />,
          message: 'Connecting...',
          color: 'info'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 400,
        minWidth: 280,
      }}
    >
      <Alert 
        severity={config.severity}
        icon={config.icon}
        sx={{
          backgroundColor: 'background.paper',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {config.message}
          {status.status === 'reconnecting' && (
            <LinearProgress 
              color={config.color as any}
              sx={{ borderRadius: 1 }}
            />
          )}
        </Box>
      </Alert>
    </Box>
  );
};

export default ConnectionStatus; 