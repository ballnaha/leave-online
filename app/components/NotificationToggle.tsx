'use client';

import React from 'react';
import {
  Box,
  Button,
  Typography,
  Switch,
  Card,
  CardContent,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { useOneSignal } from '../providers/OneSignalProvider';

interface NotificationToggleProps {
  variant?: 'button' | 'switch' | 'card';
  showStatus?: boolean;
}

export default function NotificationToggle({ 
  variant = 'switch', 
  showStatus = true 
}: NotificationToggleProps) {
  const theme = useTheme();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = useOneSignal();
  const [loading, setLoading] = React.useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <BellOff size={18} />
        <Typography variant="body2">
          เบราว์เซอร์ไม่รองรับการแจ้งเตือน
        </Typography>
      </Box>
    );
  }

  if (permission === 'denied') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
        <BellOff size={18} />
        <Typography variant="body2">
          การแจ้งเตือนถูกบล็อก กรุณาเปิดในการตั้งค่าเบราว์เซอร์
        </Typography>
      </Box>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        variant={isSubscribed ? 'outlined' : 'contained'}
        color={isSubscribed ? 'error' : 'primary'}
        startIcon={
          loading ? (
            <CircularProgress size={18} color="inherit" />
          ) : isSubscribed ? (
            <BellOff size={18} />
          ) : (
            <Bell size={18} />
          )
        }
        onClick={handleToggle}
        disabled={loading}
        sx={{ borderRadius: 1 }}
      >
        {isSubscribed ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน'}
      </Button>
    );
  }

  if (variant === 'card') {
    return (
      <Card
        sx={{
          borderRadius: 1,
          border: '1px solid',
          borderColor: isSubscribed ? 'success.main' : 'divider',
          bgcolor: isSubscribed ? alpha(theme.palette.success.main, 0.05) : 'background.paper',
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isSubscribed 
                  ? alpha(theme.palette.success.main, 0.1) 
                  : alpha(theme.palette.grey[500], 0.1),
                color: isSubscribed ? 'success.main' : 'text.secondary',
              }}
            >
              {isSubscribed ? <BellRing size={24} /> : <BellOff size={24} />}
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                การแจ้งเตือน Push
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isSubscribed 
                  ? 'เปิดใช้งานแล้ว - คุณจะได้รับการแจ้งเตือน' 
                  : 'ปิดอยู่ - เปิดเพื่อรับการแจ้งเตือน'}
              </Typography>
            </Box>
          </Box>
          <Switch
            checked={isSubscribed}
            onChange={handleToggle}
            disabled={loading}
            color="success"
          />
        </CardContent>
      </Card>
    );
  }

  // Default: switch variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {isSubscribed ? (
          <BellRing size={20} color={theme.palette.success.main} />
        ) : (
          <Bell size={20} color={theme.palette.text.secondary} />
        )}
        <Box>
          <Typography variant="body1" fontWeight={500}>
            การแจ้งเตือน
          </Typography>
          {showStatus && (
            <Typography variant="caption" color={isSubscribed ? 'success.main' : 'text.secondary'}>
              {isSubscribed ? 'เปิดใช้งาน' : 'ปิดอยู่'}
            </Typography>
          )}
        </Box>
      </Box>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Switch
          checked={isSubscribed}
          onChange={handleToggle}
          color="success"
        />
      )}
    </Box>
  );
}
