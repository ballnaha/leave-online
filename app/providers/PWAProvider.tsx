'use client';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface PWAContextType {
    isInstallPromptVisible: boolean;
    showInstallPrompt: () => void;
    hideInstallPrompt: () => void;
    deferredPrompt: any;
    isStandalone: boolean;
    isIOS: boolean;
    installPWA: () => Promise<void>;
    checkForUpdates: () => Promise<void>;
    clearCache: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
    isInstallPromptVisible: false,
    showInstallPrompt: () => {},
    hideInstallPrompt: () => {},
    deferredPrompt: null,
    isStandalone: false,
    isIOS: false,
    installPWA: async () => {},
    checkForUpdates: async () => {},
    clearCache: async () => {},
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstallPromptVisible, setIsInstallPromptVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [canInstall, setCanInstall] = useState(false);
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
    
    // Refs to prevent multiple reloads
    const isReloading = useRef(false);
    const lastVersionCheck = useRef<number>(0);

    // Function to safely reload (prevent multiple reloads)
    const safeReload = useCallback(() => {
        if (isReloading.current) {
            console.log('[PWA] Reload already in progress, skipping...');
            return;
        }
        isReloading.current = true;
        console.log('[PWA] Reloading page...');
        window.location.reload();
    }, []);

    // Function to clear all caches and reload
    const clearCache = useCallback(async () => {
        if (isReloading.current) return;
        
        try {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('[PWA] All caches cleared');
            }
            
            // Unregister service workers and re-register
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
                console.log('[PWA] Service workers unregistered');
            }
            
            // Reload the page
            safeReload();
        } catch (error) {
            console.error('[PWA] Error clearing cache:', error);
        }
    }, [safeReload]);

    // Function to check for updates
    const checkForUpdates = useCallback(async () => {
        if (swRegistration) {
            try {
                await swRegistration.update();
                console.log('[PWA] Checked for updates');
            } catch (error) {
                console.error('[PWA] Error checking for updates:', error);
            }
        }
    }, [swRegistration]);

    useEffect(() => {
        // Register Service Worker
        // Using OneSignalSDKWorker.js as the main SW (includes both PWA cache + push notifications)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/OneSignalSDKWorker.js')
                .then(registration => {
                    console.log('[PWA] SW registered:', registration);
                    setSwRegistration(registration);
                    
                    // Handle updates - but don't auto-reload aggressively
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('[PWA] New service worker installing...');
                        
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('[PWA] New version available');
                                    // Don't auto-reload - let the user decide or wait for next visit
                                    // The SW will take over on next page load automatically
                                }
                            });
                        }
                    });
                })
                .catch(error => console.log('[PWA] SW registration failed:', error));
        }
    }, []);

    // Separate useEffect for standalone mode and install prompt
    useEffect(() => {
        // Check if already in standalone mode
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone || 
                               document.referrer.includes('android-app://');
        
        setIsStandalone(isStandaloneMode);

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        // iPadOS 13+ requests desktop site by default (Macintosh user agent)
        // We check for Macintosh and touch points to detect iPad
        const isIpad = userAgent.includes('macintosh') && (navigator.maxTouchPoints > 1);
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent) || isIpad;
        
        setIsIOS(isIosDevice);

        // For iOS, show prompt if not standalone
        if (isIosDevice && !isStandaloneMode) {
            // Delay to ensure UI is ready
            setTimeout(() => {
                setIsInstallPromptVisible(true);
            }, 1000);
        }

        const handleBeforeInstallPrompt = (e: any) => {
            console.log('beforeinstallprompt event fired');
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);

            // Check if mobile device
            const ua = window.navigator.userAgent.toLowerCase();
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua) || 
                           (ua.includes('macintosh') && navigator.maxTouchPoints > 1);

            // แสดง prompt เสมอถ้ายังไม่ได้ติดตั้ง และเป็น Mobile เท่านั้น
            if (!isStandaloneMode && isMobile) {
                setIsInstallPromptVisible(true);
            }
        };

        const handleAppInstalled = () => {
            console.log('App was installed');
            setDeferredPrompt(null);
            setCanInstall(false);
            setIsInstallPromptVisible(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installPWA = async () => {
        console.log('installPWA called, deferredPrompt:', !!deferredPrompt);
        if (!deferredPrompt) {
            console.log('No deferred prompt available');
            return;
        }

        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('User choice:', outcome);
            
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setCanInstall(false);
                setIsInstallPromptVisible(false);
            }
        } catch (error) {
            console.error('Install error:', error);
        }
    };

    const showInstallPrompt = () => setIsInstallPromptVisible(true);
    const hideInstallPrompt = () => {
        // แค่ซ่อน prompt ไม่บันทึกลง localStorage
        setIsInstallPromptVisible(false);
    };

    return (
        <PWAContext.Provider value={{ 
            isInstallPromptVisible, 
            showInstallPrompt, 
            hideInstallPrompt, 
            deferredPrompt, 
            isStandalone,
            isIOS,
            installPWA,
            checkForUpdates,
            clearCache
        }}>
            {children}
        </PWAContext.Provider>
    );
}
