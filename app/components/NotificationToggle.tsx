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
  Link,
} from '@mui/material';
import { Bell, BellOff, BellRing, Settings } from 'lucide-react';
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
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe, requestPermission } = useOneSignal();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (err: any) {
      if (err?.message === 'PERMISSION_DENIED') {
        setError('กรุณาเปิดการแจ้งเตือนในการตั้งค่าเบราว์เซอร์');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestPermission();
    } catch (err: any) {
      if (err?.message === 'PERMISSION_DENIED') {
        setError('กรุณาเปิดการแจ้งเตือนในการตั้งค่าเบราว์เซอร์');
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <BellOff size={18} />
          <Typography variant="body2">
            การแจ้งเตือนถูกบล็อก
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          กรุณาเปิดการแจ้งเตือนในการตั้งค่าเบราว์เซอร์:
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          • Chrome: คลิก 🔒 ข้าง URL → Site settings → Notifications → Allow<br/>
          • Safari: Preferences → Websites → Notifications
        </Typography>
      </Box>
    );
  }

  // Show request permission button if permission is 'default' (not asked yet or reset)
  if (permission === 'default' && !isSubscribed) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={
            loading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Bell size={18} />
            )
          }
          onClick={handleRequestPermission}
          disabled={loading}
          sx={{ borderRadius: 1 }}
        >
          เปิดการแจ้งเตือน
        </Button>
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
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
