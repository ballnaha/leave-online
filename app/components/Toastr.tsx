'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastrMessage {
    id: string;
    message: string;
    type: AlertColor;
    duration?: number;
}

interface ToastrContextType {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastrContext = createContext<ToastrContextType | undefined>(undefined);

function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="down" />;
}

const iconMap = {
    success: <CheckCircle size={22} />,
    error: <XCircle size={22} />,
    warning: <AlertTriangle size={22} />,
    info: <Info size={22} />,
};

const colorMap = {
    success: {
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: '#059669',
    },
    error: {
        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        border: '#dc2626',
    },
    warning: {
        bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: '#d97706',
    },
    info: {
        bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: '#2563eb',
    },
};

export function ToastrProvider({ children }: { children: ReactNode }) {
    const [messages, setMessages] = useState<ToastrMessage[]>([]);

    const addMessage = useCallback((message: string, type: AlertColor, duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setMessages((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const removeMessage = useCallback((id: string) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, []);

    const success = useCallback((message: string, duration?: number) => {
        addMessage(message, 'success', duration);
    }, [addMessage]);

    const error = useCallback((message: string, duration?: number) => {
        addMessage(message, 'error', duration);
    }, [addMessage]);

    const warning = useCallback((message: string, duration?: number) => {
        addMessage(message, 'warning', duration);
    }, [addMessage]);

    const info = useCallback((message: string, duration?: number) => {
        addMessage(message, 'info', duration);
    }, [addMessage]);

    return (
        <ToastrContext.Provider value={{ success, error, warning, info }}>
            {children}
            {messages.map((msg, index) => (
                <Snackbar
                    key={msg.id}
                    open={true}
                    autoHideDuration={msg.duration}
                    onClose={() => removeMessage(msg.id)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    TransitionComponent={SlideTransition}
                    sx={{
                        top: `calc(env(safe-area-inset-top, 0px) + ${24 + index * 60}px) !important`,
                        zIndex: 9999,
                    }}
                >
                    <Alert
                        onClose={() => removeMessage(msg.id)}
                        severity={msg.type}
                        icon={iconMap[msg.type]}
                        sx={{
                            minWidth: 280,
                            background: colorMap[msg.type].bg,
                            color: 'white',
                            fontWeight: 500,
                            borderRadius: 2,
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                            '& .MuiAlert-icon': {
                                color: 'white',
                            },
                            '& .MuiAlert-action': {
                                color: 'white',
                            },
                            '& .MuiIconButton-root': {
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                },
                            },
                        }}
                    >
                        {msg.message}
                    </Alert>
                </Snackbar>
            ))}
        </ToastrContext.Provider>
    );
}

export function useToastr(): ToastrContextType {
    const context = useContext(ToastrContext);
    if (!context) {
        throw new Error('useToastr must be used within a ToastrProvider');
    }
    return context;
}

// Export standalone Toastr component for simple usage
export default function Toastr() {
    return null; // Provider handles rendering
}
