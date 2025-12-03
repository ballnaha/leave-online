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

    useEffect(() => {
        // Check if already in standalone mode
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone || 
                               document.referrer.includes('android-app://');
        
        setIsStandalone(isStandaloneMode);

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        const shouldShowPrompt = () => {
            const dismissedAt = localStorage.getItem('pwa_prompt_dismissed_at');
            if (!dismissedAt) return true;
            
            const daysSinceDismissal = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
            return daysSinceDismissal > 7; // Show again after 7 days
        };

        // For iOS, show prompt if not standalone and not dismissed recently
        if (isIosDevice && !isStandaloneMode && shouldShowPrompt()) {
            setIsInstallPromptVisible(true);
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only show if not already installed and not dismissed recently
            if (!isStandaloneMode && shouldShowPrompt()) {
                setIsInstallPromptVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const installPWA = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsInstallPromptVisible(false);
        }
    };

    const showInstallPrompt = () => setIsInstallPromptVisible(true);
    const hideInstallPrompt = () => {
        setIsInstallPromptVisible(false);
        localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
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
