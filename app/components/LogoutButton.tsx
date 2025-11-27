'use client';
import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';

interface LogoutButtonProps {
    variant?: 'text' | 'outlined' | 'contained';
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    showIcon?: boolean;
    label?: string;
}

export default function LogoutButton({
    variant = 'contained',
    size = 'medium',
    fullWidth = false,
    showIcon = true,
    label = 'ออกจากระบบ',
}: LogoutButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const toastr = useToastr();

    const handleLogout = async () => {
        setIsLoading(true);

        try {
            // Clear localStorage
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear all cookies via API
            await fetch('/api/auth/logout', { method: 'POST' });

            // Clear cookies on client side
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name.trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            }

            // Clear cache if supported
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }

            toastr.success('ออกจากระบบสำเร็จ');

            // Sign out from NextAuth and redirect to login
            await signOut({
                callbackUrl: '/login',
                redirect: true,
            });

        } catch (error) {
            console.error('Logout error:', error);
            toastr.error('เกิดข้อผิดพลาดในการออกจากระบบ');
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            fullWidth={fullWidth}
            onClick={handleLogout}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : (showIcon ? <LogOut size={18} /> : null)}
            sx={{
                ...(variant === 'contained' && {
                    bgcolor: '#dc2626',
                    '&:hover': {
                        bgcolor: '#b91c1c',
                    },
                }),
                ...(variant === 'outlined' && {
                    borderColor: '#dc2626',
                    color: '#dc2626',
                    '&:hover': {
                        borderColor: '#b91c1c',
                        bgcolor: 'rgba(220, 38, 38, 0.04)',
                    },
                }),
                ...(variant === 'text' && {
                    color: '#dc2626',
                    '&:hover': {
                        bgcolor: 'rgba(220, 38, 38, 0.04)',
                    },
                }),
            }}
        >
            {isLoading ? 'กำลังออกจากระบบ...' : label}
        </Button>
    );
}
