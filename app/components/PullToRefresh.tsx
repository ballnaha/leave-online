'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { ArrowDown2 } from 'iconsax-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80; // pixels to pull before triggering refresh
const MAX_PULL = 120; // maximum pull distance

export default function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only enable pull-to-refresh when scrolled to top
    if (container.scrollTop > 0) return;
    
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only allow pulling when at top
    if (container.scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }
    
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    
    if (diff > 0) {
      // Prevent default scroll behavior when pulling down
      e.preventDefault();
      
      // Apply resistance - the further you pull, the harder it gets
      const resistance = 0.4;
      const newDistance = Math.min(diff * resistance, MAX_PULL);
      setPullDistance(newDistance);
    }
  }, [isPulling, disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Animate back to 0
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh, disabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive: false to allow preventDefault on touchmove
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min((pullDistance / PULL_THRESHOLD) * 100, 100);
  const rotation = (progress / 100) * 180;
  const shouldTrigger = pullDistance >= PULL_THRESHOLD;

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: pullDistance,
          overflow: 'hidden',
          transition: isPulling ? 'none' : 'height 0.3s ease-out',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'white',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${Math.min(pullDistance / 60, 1)})`,
            opacity: Math.min(pullDistance / 40, 1),
            transition: isPulling ? 'none' : 'all 0.3s ease-out',
          }}
        >
          {isRefreshing ? (
            <CircularProgress size={24} sx={{ color: '#667eea' }} />
          ) : (
            <Box
              sx={{
                transform: `rotate(${rotation}deg)`,
                transition: isPulling ? 'none' : 'transform 0.2s ease',
                color: shouldTrigger ? '#667eea' : '#999',
              }}
            >
              <ArrowDown2 size={24} variant="Bold" />
            </Box>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
