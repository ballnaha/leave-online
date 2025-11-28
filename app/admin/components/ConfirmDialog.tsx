'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';

type DialogType = 'delete' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
  loading?: boolean;
}

// ใช้ function เพื่อให้เข้าถึง theme ได้
const getDialogConfig = (theme: any): Record<DialogType, { icon: React.ReactNode; color: string; bgcolor: string }> => ({
  delete: {
    icon: <Trash2 size={28} />,
    color: theme.palette.error.main, // #F44336
    bgcolor: alpha(theme.palette.error.main, 0.1),
  },
  warning: {
    icon: <AlertTriangle size={28} />,
    color: theme.palette.warning.main, // #FF9800
    bgcolor: alpha(theme.palette.warning.main, 0.1),
  },
  info: {
    icon: <Info size={28} />,
    color: theme.palette.primary.main, // #6C63FF
    bgcolor: alpha(theme.palette.primary.main, 0.1),
  },
  success: {
    icon: <CheckCircle size={28} />,
    color: theme.palette.success.main, // #4CAF50
    bgcolor: alpha(theme.palette.success.main, 0.1),
  },
});

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  type = 'delete',
  loading = false,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const dialogConfig = getDialogConfig(theme);
  const config = dialogConfig[type];

  const getDefaultTitle = () => {
    switch (type) {
      case 'delete':
        return 'ยืนยันการลบ';
      case 'warning':
        return 'คำเตือน';
      case 'info':
        return 'ข้อมูล';
      case 'success':
        return 'สำเร็จ';
      default:
        return 'ยืนยัน';
    }
  };

  const getConfirmButtonColor = (): 'error' | 'warning' | 'primary' | 'success' => {
    switch (type) {
      case 'delete':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary'; // ใช้ primary แทน info เพื่อให้ตรง theme
      case 'success':
        return 'success';
      default:
        return 'error';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: config.bgcolor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config.color,
            }}
          >
            {config.icon}
          </Box>
          <Typography variant="h6" fontWeight={600} textAlign="center">
            {title || getDefaultTitle()}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <DialogContentText textAlign="center" sx={{ color: 'text.secondary' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          color="inherit"
          variant="outlined"
          disabled={loading}
          sx={{ 
            minWidth: 100, 
            borderRadius: 1,
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'text.secondary',
              bgcolor: 'action.hover',
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={getConfirmButtonColor()}
          variant="contained"
          disabled={loading}
          sx={{ 
            minWidth: 100, 
            borderRadius: 1,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          }}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'กำลังดำเนินการ...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Custom hook for easy use
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    title?: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    open: false,
    message: '',
    type: 'delete',
    onConfirm: () => {},
  });
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback(
    ({
      title,
      message,
      type = 'delete',
      confirmText,
    }: {
      title?: string;
      message: string;
      type?: DialogType;
      confirmText?: string;
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          title,
          message,
          type,
          confirmText,
          onConfirm: () => resolve(true),
        });
      });
    },
    []
  );

  const handleClose = React.useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleConfirm = React.useCallback(async () => {
    setLoading(true);
    try {
      await dialogState.onConfirm();
    } finally {
      setLoading(false);
      handleClose();
    }
  }, [dialogState, handleClose]);

  const ConfirmDialogComponent = React.useCallback(
    () => (
      <ConfirmDialog
        open={dialogState.open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        loading={loading}
      />
    ),
    [dialogState, handleClose, handleConfirm, loading]
  );

  return { confirm, ConfirmDialog: ConfirmDialogComponent, loading, setLoading };
}
