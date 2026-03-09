'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Box, CircularProgress, Typography, Fade, Backdrop } from '@mui/material';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
    /** Threshold in px to trigger refresh */
    threshold?: number;
}

export default function PullToRefresh({
    onRefresh,
    children,
    disabled = false,
    threshold = 80,
}: PullToRefreshProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartY = useRef(0);
    const touchStartX = useRef(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const isScrolledToTop = useRef(true);

    // Check if the container is scrolled to top
    const checkScrollPosition = useCallback(() => {
        isScrolledToTop.current = window.scrollY <= 0;
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', checkScrollPosition, { passive: true });
        return () => window.removeEventListener('scroll', checkScrollPosition);
    }, [checkScrollPosition]);

    // ตรวจสอบว่ามี overlay/drawer/dialog เปิดอยู่หรือไม่
    const isOverlayOpen = useCallback(() => {
        return !!(
            document.querySelector('[vaul-overlay]') ||
            document.querySelector('[vaul-drawer]') ||
            document.querySelector('.MuiDrawer-root') ||
            document.querySelector('.MuiDialog-root') ||
            document.querySelector('.MuiModal-root')
        );
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;
        if (isOverlayOpen()) return;

        checkScrollPosition();
        if (!isScrolledToTop.current) return;

        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
        setIsPulling(true);
    }, [disabled, isRefreshing, checkScrollPosition, isOverlayOpen]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing || !isPulling) return;
        if (isOverlayOpen()) {
            setPullDistance(0);
            setIsPulling(false);
            return;
        }
        if (!isScrolledToTop.current) {
            setPullDistance(0);
            return;
        }

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = currentY - touchStartY.current;
        const diffX = currentX - touchStartX.current;

        // If horizontal scroll is more than vertical, ignore (allow swipe gestures)
        if (Math.abs(diffX) > Math.abs(diffY) && pullDistance === 0) {
            setIsPulling(false);
            return;
        }

        if (diffY > 0) {
            // Track pull distance (for threshold detection only, no visual pull)
            const resistance = Math.min(diffY * 0.5, threshold * 1.5);
            setPullDistance(resistance);
        }
    }, [disabled, isRefreshing, isPulling, threshold, pullDistance, isOverlayOpen]);

    const handleTouchEnd = useCallback(async () => {
        if (disabled || isRefreshing) return;

        if (pullDistance >= threshold) {
            // Trigger refresh — show overlay spinner
            setIsRefreshing(true);
            setPullDistance(0);
            try {
                await Promise.all([
                    onRefresh(),
                    new Promise(resolve => setTimeout(resolve, 800)),
                ]);
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                setIsRefreshing(false);
            }
        } else {
            setPullDistance(0);
        }
        setIsPulling(false);
    }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{ position: 'relative', touchAction: isPulling && pullDistance > 5 ? 'none' : 'auto' }}
        >
            {/* Loading Overlay */}
            <Fade in={isRefreshing} timeout={{ enter: 300, exit: 400 }}>
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1200,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'transparent',
                        pointerEvents: isRefreshing ? 'auto' : 'none',
                    }}
                >
                    <CircularProgress
                        size={40}
                        thickness={4}
                        sx={{
                            color: '#667eea',
                        }}
                    />
                </Box>
            </Fade>

            {/* Content — no transform, header stays in place */}
            {children}
        </Box>
    );
}
