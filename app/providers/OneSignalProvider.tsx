"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

// OneSignal Configuration
const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '';
const ONESIGNAL_SAFARI_WEB_ID = process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID || '';

interface OneSignalContextValue {
  isSupported: boolean;
  isSubscribed: boolean;
  isInitialized: boolean;
  playerId: string | null;
  permission: NotificationPermission | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const OneSignalContext = createContext<OneSignalContextValue | undefined>(undefined);

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize OneSignal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!ONESIGNAL_APP_ID) {
      console.warn('🔔 OneSignal App ID not configured');
      return;
    }

    // Check basic requirements
    const checkSupport = () => {
      // Service Worker is required
      if (!('serviceWorker' in navigator)) {
        console.warn('🔔 Service Worker not supported');
        return false;
      }
      
      // For Chrome on Android, Notification API might not be available until HTTPS
      // But OneSignal handles this, so we check serviceWorker first
      if (!('Notification' in window)) {
        // On some mobile browsers, Notification might not exist but push still works
        console.warn('🔔 Notification API not available, but might still work with OneSignal');
      }
      
      return true;
    };

    if (!checkSupport()) {
      console.warn('🔔 Push notifications not supported on this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load OneSignal SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.onload = initOneSignal;
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const initOneSignal = async () => {
    if (!window.OneSignal) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        await setupOneSignal(OneSignal);
      });
    } else {
      await setupOneSignal(window.OneSignal);
    }
  };

  const setupOneSignal = async (OneSignal: any) => {
    try {
      console.log('🔔 OneSignal: Initializing...');
      
      // Check if already initialized to avoid error
      // Note: OneSignal v16 doesn't have a public initialized property we can rely on easily
      // but we can try-catch the init call
      try {
          // Unregister old sw.js worker if exists
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              if (registration.active?.scriptURL.includes('sw.js')) {
                await registration.unregister();
                console.log('🔔 OneSignal: Unregistered old sw.js worker');
              }
            }
          }

          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            safari_web_id: ONESIGNAL_SAFARI_WEB_ID || undefined,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false, // Disabled - using custom toggle in profile page
            },
          });
          console.log('🔔 OneSignal: Initialized successfully');
      } catch (initError: any) {
          // Ignore "SDK already initialized" error
          if (initError?.message?.includes('SDK already initialized')) {
              console.log('🔔 OneSignal: SDK already initialized, continuing...');
          } else {
              throw initError;
          }
      }

      // setIsInitialized(true); // Moved to finally block

      // Check subscription status
      const subscribed = await OneSignal.User.PushSubscription.optedIn;
      const id = await OneSignal.User.PushSubscription.id;
      
      console.log('🔔 OneSignal: Subscription status:', { subscribed, playerId: id });
      
      // ถ้ามี ID แต่ไม่พบในระบบ (กรณีถูกลบจาก Dashboard) ให้ลอง Login ใหม่
      if (id && subscribed) {
        // Force update subscription to ensure it exists on OneSignal
        try {
            // Login with external ID if available (using user ID)
            if (session?.user?.id) {
                await OneSignal.login(session.user.id);
            }
        } catch (e) {
            console.warn('🔔 OneSignal: Login/Update failed', e);
        }
      }

      setIsSubscribed(subscribed);
      if (id) {
        setPlayerId(id);
        // Auto-register if already subscribed
        if (subscribed) {
          await registerDevice(id);
        }
      }

      // Listen for subscription changes
      OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
        console.log('🔔 OneSignal: Subscription changed:', event.current);
        const subscribed = event.current.optedIn;
        setIsSubscribed(subscribed);
        
        if (subscribed && event.current.id) {
          setPlayerId(event.current.id);
          await registerDevice(event.current.id);
        } else {
          setPlayerId(null);
        }
      });

      // Listen for permission changes
      OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
        console.log('🔔 OneSignal: Permission changed:', granted);
        setPermission(granted ? 'granted' : 'denied');
      });

    } catch (error: any) {
      // Handle specific OneSignal errors gracefully
      const errorMessage = error?.message || String(error);
      
      // Ignore origin mismatch errors (common in development)
      if (errorMessage.includes('Can only be used on') || 
          errorMessage.includes('origin') ||
          errorMessage.includes('not allowed')) {
        console.warn('🔔 OneSignal: Origin not configured in dashboard. Push notifications disabled.');
        return;
      }
      
      console.error('🔔 OneSignal initialization error:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  // Register device to backend
  const registerDevice = useCallback(async (pid: string) => {
    // Don't register if not authenticated
    if (status !== 'authenticated') {
      console.log('🔔 OneSignal: Skipping device registration (not authenticated)');
      return;
    }

    try {
      console.log('🔔 OneSignal: Registering device:', pid);
      const res = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: pid,
          deviceType: 'web',
        }),
      });
      
      // ถ้า unauthorized หรือ error ก็ไม่ต้อง parse response
      if (!res.ok) {
        console.warn('🔔 OneSignal: Failed to register device, status:', res.status);
        return;
      }
      
      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn('🔔 OneSignal: Received non-JSON response:', await res.text());
        return;
      }
      
      const data = await res.json();
      console.log('🔔 OneSignal: Device registered:', data);
    } catch (error) {
      console.error('🔔 OneSignal: Error registering device:', error);
    }
  }, [status]);

  // Auto-register when conditions are met
  useEffect(() => {
    if (status === 'authenticated' && playerId && session?.user) {
      console.log('🔔 OneSignal: Auto-registering device for user:', session.user.id);
      registerDevice(playerId);
    }
  }, [status, playerId, session, registerDevice]);

  const subscribe = useCallback(async () => {
    console.log('🔔 OneSignal: Subscribe called, initialized:', isInitialized);
    
    if (!window.OneSignal) {
      console.error('🔔 OneSignal: SDK not loaded');
      throw new Error('OneSignal SDK not loaded');
    }
    
    if (!isInitialized) {
      console.error('🔔 OneSignal: Not initialized yet');
      throw new Error('OneSignal not initialized');
    }

    try {
      console.log('🔔 OneSignal: Requesting permission...');
      // Request permission and subscribe
      await window.OneSignal.Notifications.requestPermission();
      
      console.log('🔔 OneSignal: Opting in...');
      await window.OneSignal.User.PushSubscription.optIn();
      
      const id = await window.OneSignal.User.PushSubscription.id;
      console.log('🔔 OneSignal: Got player ID:', id);
      
      if (id) {
        setPlayerId(id);
        setIsSubscribed(true);
        await registerDevice(id);
      } else {
        console.warn('🔔 OneSignal: No player ID received after opt-in');
      }
    } catch (error) {
      console.error('🔔 OneSignal: Error subscribing:', error);
      throw error; // Re-throw to let caller handle it
    }
  }, [isInitialized]);

  const unsubscribe = useCallback(async () => {
    console.log('🔔 OneSignal: Unsubscribe called');
    
    if (!window.OneSignal || !isInitialized) {
      console.error('🔔 OneSignal: Not initialized');
      throw new Error('OneSignal not initialized');
    }

    try {
      console.log('🔔 OneSignal: Opting out...');
      await window.OneSignal.User.PushSubscription.optOut();
      setIsSubscribed(false);
      setPlayerId(null);

      // Unregister from backend
      if (playerId) {
        console.log('🔔 OneSignal: Unregistering device from backend...');
        await fetch(`/api/notifications/register?playerId=${playerId}`, {
          method: 'DELETE',
        });
      }
      console.log('🔔 OneSignal: Unsubscribed successfully');
    } catch (error) {
      console.error('🔔 OneSignal: Error unsubscribing:', error);
      throw error;
    }
  }, [isInitialized, playerId]);

  const value = {
    isSupported,
    isSubscribed,
    isInitialized,
    playerId,
    permission,
    subscribe,
    unsubscribe,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
}

export function useOneSignal() {
  const ctx = useContext(OneSignalContext);
  if (!ctx) {
    throw new Error("useOneSignal must be used within OneSignalProvider");
  }
  return ctx;
}
