'use client';
import React, { useState, useEffect, Suspense } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    InputAdornment,
    IconButton,
    Checkbox,
    FormControlLabel,
    CircularProgress,
    Alert,
} from '@mui/material';
import { Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn, useSession } from 'next-auth/react';
import { useToastr } from '@/app/components/Toastr';
import { APP_VERSION } from '@/lib/version';
import { useOneSignal } from '@/app/providers/OneSignalProvider';

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toastr = useToastr();
    const { data: session, status } = useSession();
    const { isSupported, isInitialized, permission, requestPermission } = useOneSignal();

    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [accountDisabledMessage, setAccountDisabledMessage] = useState('');

    // Request notification permission on login page (ให้ user เลือกก่อน login)
    useEffect(() => {
        // รอจนกว่า OneSignal จะ init เสร็จ
        if (!isInitialized || !isSupported) return;

        // ถ้า permission ยังเป็น default (ยังไม่เคยถาม) ให้ขอ permission
        if (permission === 'default') {
            // Delay เล็กน้อยเพื่อให้ UI โหลดก่อน
            const timer = setTimeout(() => {
                requestPermission();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isInitialized, isSupported, permission, requestPermission]);

    // Check for reason parameter (account disabled)
    useEffect(() => {
        const reason = searchParams.get('reason');
        if (reason === 'account_disabled') {
            setAccountDisabledMessage('บัญชีของคุณถูกปิดใช้งานหรือถูกลบออกจากระบบ กรุณาติดต่อผู้ดูแลระบบ');
        }
    }, [searchParams]);

    // Redirect to home if already logged in
    useEffect(() => {
        if (status !== 'authenticated') return;

        let cancelled = false;
        (async () => {
            const callbackUrl = searchParams.get('callbackUrl');
            const role = session?.user?.role ?? (await getSession())?.user?.role;
            const destination = role === 'admin' ? '/admin' : (callbackUrl || '/');

            if (cancelled) return;
            router.replace(destination);
            router.refresh();
        })();

        return () => {
            cancelled = true;
        };
    }, [status, router, session?.user?.role, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate empty fields
        if (!username.trim()) {
            toastr.error('กรุณากรอกรหัสพนักงาน');
            return;
        }

        if (!password) {
            toastr.error('กรุณากรอกรหัสผ่าน');
            return;
        }

        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                employeeId: username.trim(),
                password: password,
                redirect: false,
            });

            if (result?.error) {
                toastr.error('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
            } else if (result?.ok) {
                toastr.success('เข้าสู่ระบบสำเร็จ');

                const callbackUrl = searchParams.get('callbackUrl');
                const updatedSession = await getSession();
                const destination = updatedSession?.user?.role === 'admin' ? '/admin' : (callbackUrl || '/');

                setTimeout(() => {
                    router.replace(destination);
                    router.refresh();
                }, 500);
            }
        } catch (error) {
            console.error('Login error:', error);
            toastr.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background Decorations */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(27,25,75,0.06) 0%, rgba(45,42,110,0.06) 100%)',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: -50,
                    left: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(27,25,75,0.04) 0%, rgba(45,42,110,0.04) 100%)',
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    top: '40%',
                    left: -80,
                    width: 160,
                    height: 160,
                    borderRadius: '50%',
                    background: 'rgba(27,25,75,0.03)',
                }}
            />

            {/* Header Section */}
            <Box sx={{ pt: 6, pb: 5, px: 4, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {/* Logo Container - Two logos side by side */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 3,
                        mb: 3,
                    }}
                >
                    <Box
                        component="img"
                        src="/images/PSC1.png"
                        alt="PSC Logo"
                        sx={{
                            width: 100,
                            height: 100,
                            objectFit: 'contain',
                        }}
                    />
                    <Box
                        component="img"
                        src="/images/PS1.png"
                        alt="PS Logo"
                        sx={{
                            width: 100,
                            height: 100,
                            objectFit: 'contain',
                        }}
                    />
                </Box>

                <Typography
                    variant="h2"
                    sx={{
                        fontWeight: 700,
                        color: '#1a1a2e',
                        mb: 0.5,
                        letterSpacing: '-0.5px',
                    }}
                >
                    ระบบใบลา
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        color: '#666',
                        fontWeight: 500,
                    }}
                >
                    เข้าสู่ระบบเพื่อจัดการการลาของคุณ
                </Typography>
            </Box>

            {/* Login Form */}
            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    px: 3,
                    flex: 1,
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    mt: 5
                }}
            >
                {/* Account Disabled Alert */}
                {accountDisabledMessage && (
                    <Alert
                        severity="error"
                        sx={{ mb: 2, borderRadius: 2 }}
                        onClose={() => setAccountDisabledMessage('')}
                    >
                        {accountDisabledMessage}
                    </Alert>
                )}

                {/* Username Field */}
                <TextField
                    id="username"
                    fullWidth
                    label="รหัสพนักงาน"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="กรอกรหัสพนักงาน"
                    sx={{ mb: 2 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <User size={20} color="#1b194b" />
                                </InputAdornment>
                            ),
                        }
                    }}
                />

                {/* Password Field */}
                <TextField
                    id="password"
                    fullWidth
                    label="รหัสผ่าน"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    sx={{ mb: 2 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Lock size={20} color="#1b194b" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }
                    }}
                />

                {/* Remember Me & Forgot Password */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                size="small"
                                sx={{
                                    color: '#ccc',
                                    '&.Mui-checked': { color: '#1b194b' },
                                }}
                            />
                        }
                        label={
                            <Typography variant="body2" sx={{ color: '#666' }}>
                                จดจำฉัน
                            </Typography>
                        }
                    />
                    <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                        <Typography variant="body2" sx={{ color: '#1b194b', fontWeight: 600 }}>
                            ลืมรหัสผ่าน?
                        </Typography>
                    </Link>
                </Box>

                {/* Spacer */}
                <Box sx={{ flex: 1 }} />

                {/* Login Button */}
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <ArrowRight size={20} />}
                    sx={{
                        py: 1.75,
                        borderRadius: 2.5,
                        background: 'linear-gradient(135deg, #1b194b 0%, #2d2a6e 100%)',
                        boxShadow: '0 8px 24px rgba(27, 25, 75, 0.35)',
                        fontWeight: 600,
                        fontSize: '1rem',
                        color: 'white',
                        textTransform: 'none',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #2d2a6e 0%, #3d3a8e 100%)',
                            boxShadow: '0 12px 28px rgba(27, 25, 75, 0.45)',
                            transform: 'translateY(-2px)',
                            color: 'white',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                            color: 'white',
                        },
                        '&:disabled': {
                            background: 'linear-gradient(135deg, #1b194b 0%, #2d2a6e 100%)',
                            opacity: 0.7,
                            color: 'white',
                        },
                    }}
                >
                    {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </Button>
            </Box>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', py: 3, px: 4, position: 'relative', zIndex: 1 }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                    ยังไม่มีบัญชี?{' '}
                    <Link href="/register" style={{ textDecoration: 'none' }}>
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{
                                color: '#1b194b',
                                fontWeight: 700,
                            }}
                        >
                            สมัครสมาชิก
                        </Typography>
                    </Link>
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#aaa' }}>
                    © 2025 PSC Leave System v{APP_VERSION}
                </Typography>
            </Box>
        </Box>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <Box sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#ffffff'
            }}>
                <CircularProgress />
            </Box>
        }>
            <LoginPageContent />
        </Suspense>
    );
}
