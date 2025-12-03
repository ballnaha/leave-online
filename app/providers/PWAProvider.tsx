'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface PWAContextType {
    isInstallPromptVisible: boolean;
    showInstallPrompt: () => void;
    hideInstallPrompt: () => void;
    deferredPrompt: any;
    isStandalone: boolean;
    installPWA: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
    isInstallPromptVisible: false,
    showInstallPrompt: () => {},
    hideInstallPrompt: () => {},
    deferredPrompt: null,
    isStandalone: false,
    installPWA: async () => {},
});

export const usePWA = () => useContext(PWAContext);

export default function PWAProvider({ children }: { children: React.ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstallPromptVisible, setIsInstallPromptVisible] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone || 
                               document.referrer.includes('android-app://');
        
        setIsStandalone(isStandaloneMode);

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only show if not already installed
            if (!isStandaloneMode) {
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
    const hideInstallPrompt = () => setIsInstallPromptVisible(false);

    return (
        <PWAContext.Provider value={{ 
            isInstallPromptVisible, 
            showInstallPrompt, 
            hideInstallPrompt, 
            deferredPrompt, 
            isStandalone,
            installPWA 
        }}>
            {children}
        </PWAContext.Provider>
    );
}
