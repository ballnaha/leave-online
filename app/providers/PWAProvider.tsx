'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface PWAContextType {
    isInstallPromptVisible: boolean;
    showInstallPrompt: () => void;
    hideInstallPrompt: () => void;
    deferredPrompt: any;
    isStandalone: boolean;
    isIOS: boolean;
    installPWA: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
    isInstallPromptVisible: false,
    showInstallPrompt: () => {},
    hideInstallPrompt: () => {},
    deferredPrompt: null,
    isStandalone: false,
    isIOS: false,
    installPWA: async () => {},
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstallPromptVisible, setIsInstallPromptVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered:', registration))
                .catch(error => console.log('SW registration failed:', error));
        }

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
            // แสดง prompt เสมอถ้ายังไม่ได้ติดตั้ง
            if (!isStandaloneMode) {
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
            installPWA 
        }}>
            {children}
        </PWAContext.Provider>
    );
}
