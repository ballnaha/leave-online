'use client';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ArrowDownward, Refresh } from '@mui/icons-material';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
    /** Threshold in px to trigger refresh */
    threshold?: number;
    /** Max pull distance in px */
    maxPull?: number;
}

export default function PullToRefresh({
    onRefresh,
    children,
    disabled = false,
    threshold = 80,
    maxPull = 120,
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
        // Check if the page is scrolled to top
        isScrolledToTop.current = window.scrollY <= 0;
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', checkScrollPosition, { passive: true });
        return () => window.removeEventListener('scroll', checkScrollPosition);
    }, [checkScrollPosition]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;
        checkScrollPosition();
        if (!isScrolledToTop.current) return;

        touchStartY.current = e.touches[0].clientY;
        touchStartX.current = e.touches[0].clientX;
        setIsPulling(true);
    }, [disabled, isRefreshing, checkScrollPosition]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (disabled || isRefreshing || !isPulling) return;
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
            // Apply resistance - the further you pull, the harder it gets
            const resistance = Math.min(diffY * 0.5, maxPull);
            setPullDistance(resistance);
        }
    }, [disabled, isRefreshing, isPulling, maxPull, pullDistance]);

    const handleTouchEnd = useCallback(async () => {
        if (disabled || isRefreshing) return;

        if (pullDistance >= threshold) {
            // Trigger refresh
            setIsRefreshing(true);
            setPullDistance(threshold * 0.6); // Show loading spinner at reduced height
            try {
                await onRefresh();
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            // Reset
            setPullDistance(0);
        }
        setIsPulling(false);
    }, [disabled, isRefreshing, pullDistance, threshold, onRefresh]);

    const progress = Math.min((pullDistance / threshold) * 100, 100);
    const isAtThreshold = pullDistance >= threshold;

    return (
        <Box
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{ position: 'relative', touchAction: isPulling && pullDistance > 5 ? 'none' : 'auto' }}
        >
            {/* Pull indicator */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${pullDistance}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: isPulling ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 100,
                    pointerEvents: 'none',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                        opacity: Math.min(pullDistance / (threshold * 0.5), 1),
                        transition: isPulling ? 'none' : 'opacity 0.3s ease',
                    }}
                >
                    {isRefreshing ? (
                        <CircularProgress
                            size={28}
                            thickness={4}
                            sx={{
                                color: '#667eea',
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                bgcolor: isAtThreshold ? '#667eea' : 'rgba(102, 126, 234, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: isPulling ? 'background-color 0.2s ease' : 'all 0.3s ease',
                                transform: `rotate(${isAtThreshold ? 180 : 0}deg)`,
                            }}
                        >
                            <ArrowDownward
                                sx={{
                                    fontSize: 20,
                                    color: isAtThreshold ? 'white' : '#667eea',
                                    transition: 'color 0.2s ease',
                                }}
                            />
                        </Box>
                    )}
                    <Typography
                        variant="caption"
                        sx={{
                            color: isAtThreshold ? '#667eea' : '#94A3B8',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                            transition: 'color 0.2s ease',
                        }}
                    >
                        {isRefreshing
                            ? 'กำลังรีเฟรช...'
                            : isAtThreshold
                                ? 'ปล่อยเพื่อรีเฟรช'
                                : 'ดึงลงเพื่อรีเฟรช'}
                    </Typography>
                </Box>
            </Box>

            {/* Content with translation */}
            <Box
                sx={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
