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
  requestPermission: () => Promise<void>;
  resetConnection: () => Promise<void>;
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

  // Initialize OneSignal - รอจนกว่าจะ authenticated ก่อน
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ตรวจสอบ browser support ก่อน (เพื่อให้ isSupported มีค่าถูกต้อง)
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

    const browserSupported = checkSupport();
    setIsSupported(browserSupported);

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // ถ้า browser ไม่รองรับ ไม่ต้อง init เลย
    if (!browserSupported) {
      console.warn('🔔 Push notifications not supported on this browser');
      setIsInitialized(true);
      return;
    }

    // รอจนกว่า session status จะ load เสร็จ
    if (status === 'loading') return;

    // ไม่ init OneSignal ถ้ายังไม่ได้ login (เพื่อไม่ให้แสดง prompt บนหน้า login)
    if (status !== 'authenticated') {
      console.log('🔔 OneSignal: Waiting for authentication...');
      setIsInitialized(true); // Mark as initialized so UI isn't stuck
      return;
    }

    if (!ONESIGNAL_APP_ID) {
      console.warn('🔔 OneSignal App ID not configured');
      setIsInitialized(true); // Mark as initialized so UI isn't stuck
      return;
    }

    // Timeout fallback: if SDK doesn't initialize in 10 seconds, mark as initialized anyway
    const initTimeout = setTimeout(() => {
      if (!isInitialized) {
        console.warn('🔔 OneSignal: Initialization timeout, marking as initialized');
        setIsInitialized(true);
      }
    }, 10000);

    // Load OneSignal SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.onload = () => {
      clearTimeout(initTimeout);
      initOneSignal();
    };
    script.onerror = () => {
      console.error('🔔 OneSignal: Failed to load SDK script');
      clearTimeout(initTimeout);
      setIsInitialized(true); // Mark as initialized so UI isn't stuck
    };
    document.head.appendChild(script);

    return () => {
      clearTimeout(initTimeout);
    };
  }, [status]);

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
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          // safarai_web_id is only required for Legacy Safari (macOS < 13), optional for modern browsers
          safari_web_id: ONESIGNAL_SAFARI_WEB_ID || undefined,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
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

      // Check for auto-subscribe flag (set after reset)
      const shouldAutoSubscribe = localStorage.getItem('onesignal_auto_subscribe');
      if (shouldAutoSubscribe === 'true') {
        localStorage.removeItem('onesignal_auto_subscribe');
        console.log('🔔 OneSignal: Auto-subscribe flag detected, subscribing...');

        if (!subscribed) {
          try {
            await OneSignal.Notifications.requestPermission();
            await OneSignal.User.PushSubscription.optIn();

            const newId = await OneSignal.User.PushSubscription.id;
            const newSubscribed = await OneSignal.User.PushSubscription.optedIn;

            if (newId && newSubscribed) {
              setPlayerId(newId);
              setIsSubscribed(true);
              // Device registration will be handled by the useEffect that watches playerId
              console.log('🔔 OneSignal: Auto-subscribed successfully with new ID:', newId);
            }
          } catch (autoSubError) {
            console.warn('🔔 OneSignal: Auto-subscribe after reset failed', autoSubError);
          }
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
        setIsInitialized(true); // IMPORTANT: Set initialized so UI isn't stuck
        return;
      }

      console.error('🔔 OneSignal initialization error:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  // Get device/browser info
  const getDeviceInfo = useCallback(() => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let browserVersion = '';
    let os = 'Unknown';
    let osVersion = '';
    let platform = 'desktop';

    // Detect browser
    if (ua.includes('Firefox/')) {
      browser = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+\.?\d*)/)?.[1] || '';
    } else if (ua.includes('Edg/')) {
      browser = 'Edge';
      browserVersion = ua.match(/Edg\/(\d+\.?\d*)/)?.[1] || '';
    } else if (ua.includes('Chrome/')) {
      browser = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+\.?\d*)/)?.[1] || '';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      browser = 'Safari';
      browserVersion = ua.match(/Version\/(\d+\.?\d*)/)?.[1] || '';
    } else if (ua.includes('Opera') || ua.includes('OPR/')) {
      browser = 'Opera';
      browserVersion = ua.match(/(?:Opera|OPR)\/(\d+\.?\d*)/)?.[1] || '';
    }

    // Detect OS
    if (ua.includes('Windows NT')) {
      os = 'Windows';
      const match = ua.match(/Windows NT (\d+\.?\d*)/);
      if (match) {
        const ver = match[1];
        if (ver === '10.0') osVersion = '10/11';
        else if (ver === '6.3') osVersion = '8.1';
        else if (ver === '6.2') osVersion = '8';
        else if (ver === '6.1') osVersion = '7';
        else osVersion = ver;
      }
    } else if (ua.includes('Mac OS X')) {
      os = 'macOS';
      osVersion = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
    } else if (ua.includes('Android')) {
      os = 'Android';
      osVersion = ua.match(/Android ([\d.]+)/)?.[1] || '';
      platform = 'mobile';
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      os = ua.includes('iPad') ? 'iPadOS' : 'iOS';
      osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '';
      platform = ua.includes('iPad') ? 'tablet' : 'mobile';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    }

    // Detect platform more accurately
    if (ua.includes('Mobile') || ua.includes('Android')) {
      platform = 'mobile';
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
      platform = 'tablet';
    }

    return { browser, browserVersion, os, osVersion, platform, userAgent: ua };
  }, []);

  // Register device to backend
  const registerDevice = useCallback(async (pid: string) => {
    // Don't register if not authenticated
    if (status !== 'authenticated') {
      console.log('🔔 OneSignal: Skipping device registration (not authenticated)');
      return;
    }

    try {
      const deviceInfo = getDeviceInfo();
      console.log('🔔 OneSignal: Registering device:', pid, deviceInfo);
      const res = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: pid,
          deviceType: 'web',
          ...deviceInfo,
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
  }, [status, getDeviceInfo]);

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

  // Request permission only (without subscribing)
  const requestPermission = useCallback(async () => {
    console.log('🔔 OneSignal: Request permission called');

    if (!window.OneSignal) {
      console.error('🔔 OneSignal: SDK not loaded');
      throw new Error('OneSignal SDK not loaded');
    }

    if (!isInitialized) {
      console.error('🔔 OneSignal: Not initialized yet');
      throw new Error('OneSignal not initialized');
    }

    try {
      // Check current permission
      const currentPermission = Notification.permission;
      console.log('🔔 OneSignal: Current permission:', currentPermission);

      if (currentPermission === 'denied') {
        // Cannot request again if denied, user must change in browser settings
        console.warn('🔔 OneSignal: Permission was denied. User must enable in browser settings.');
        throw new Error('PERMISSION_DENIED');
      }

      // Request permission
      console.log('🔔 OneSignal: Requesting permission...');
      await window.OneSignal.Notifications.requestPermission();

      // Update permission state
      const newPermission = Notification.permission;
      setPermission(newPermission);
      console.log('🔔 OneSignal: New permission status:', newPermission);

      // If granted, auto-subscribe
      if (newPermission === 'granted') {
        console.log('🔔 OneSignal: Permission granted, auto-subscribing...');
        await subscribe();
      }
    } catch (error: any) {
      console.error('🔔 OneSignal: Error requesting permission:', error);
      throw error;
    }
  }, [isInitialized, subscribe]);

  // Reset OneSignal connection completely (with page reload for complete reset)
  const resetConnection = useCallback(async () => {
    console.log('🔔 OneSignal: Resetting connection with full cleanup...');

    // Helper function to delete IndexedDB with timeout
    const deleteIndexedDB = (dbName: string, timeoutMs: number = 3000): Promise<boolean> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`🔔 OneSignal: IndexedDB ${dbName} delete timed out`);
          resolve(false);
        }, timeoutMs);

        try {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => {
            clearTimeout(timeout);
            console.log(`🔔 OneSignal: Deleted IndexedDB ${dbName}`);
            resolve(true);
          };
          request.onerror = () => {
            clearTimeout(timeout);
            console.warn(`🔔 OneSignal: Failed to delete IndexedDB ${dbName}`);
            resolve(false);
          };
          request.onblocked = () => {
            clearTimeout(timeout);
            console.warn(`🔔 OneSignal: IndexedDB ${dbName} delete blocked`);
            resolve(false);
          };
        } catch (e) {
          clearTimeout(timeout);
          console.warn(`🔔 OneSignal: Error deleting IndexedDB ${dbName}`, e);
          resolve(false);
        }
      });
    };

    try {
      // 1. Opt out if currently subscribed (with timeout)
      if (window.OneSignal && isInitialized) {
        try {
          const optOutPromise = window.OneSignal.User.PushSubscription.optOut();
          await Promise.race([
            optOutPromise,
            new Promise((resolve) => setTimeout(resolve, 3000)) // Just continue after 3s
          ]);
        } catch (e) {
          console.warn('🔔 OneSignal: OptOut during reset failed', e);
        }
      }

      // 2. Clear ALL OneSignal related IndexedDB databases
      if ('indexedDB' in window) {
        const dbNames = ['ONE_SIGNAL_SDK_DB', 'onesignal-database', 'OneSignalSDK'];
        await Promise.all(dbNames.map(dbName => deleteIndexedDB(dbName)));
      }

      // 3. Clear ALL localStorage keys related to OneSignal
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.toLowerCase().includes('onesignal') ||
        k.toLowerCase().includes('one_signal') ||
        k.toLowerCase().includes('push')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log(`🔔 OneSignal: Cleared ${keysToRemove.length} localStorage keys`);

      // 4. Clear ALL sessionStorage keys related to OneSignal
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(k =>
        k.toLowerCase().includes('onesignal') ||
        k.toLowerCase().includes('one_signal')
      );
      sessionKeysToRemove.forEach(k => sessionStorage.removeItem(k));
      console.log(`🔔 OneSignal: Cleared ${sessionKeysToRemove.length} sessionStorage keys`);

      // 5. Unregister ALL Service Workers (not just OneSignal)
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log(`🔔 OneSignal: Found ${registrations.length} service workers to unregister`);

          for (const reg of registrations) {
            try {
              const unregistered = await Promise.race([
                reg.unregister(),
                new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000))
              ]);
              console.log(`🔔 OneSignal: Unregistered service worker: ${reg.scope}, success: ${unregistered}`);
            } catch (e) {
              console.warn('🔔 OneSignal: Service worker unregister failed', e);
            }
          }
        } catch (e) {
          console.warn('🔔 OneSignal: Error getting service worker registrations', e);
        }
      }

      // 6. Clear ALL caches
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          console.log(`🔔 OneSignal: Found ${cacheNames.length} caches to clear`);
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          console.log('🔔 OneSignal: All caches cleared');
        } catch (e) {
          console.warn('🔔 OneSignal: Error clearing caches', e);
        }
      }

      // 7. Reset state
      setIsSubscribed(false);
      setPlayerId(null);
      setIsInitialized(false);

      // 8. Set a flag to auto-subscribe after reload
      localStorage.setItem('onesignal_auto_subscribe', 'true');

      // 9. Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🔔 OneSignal: Cleanup complete, reloading page...');

      // 10. Force hard reload the page to get fresh state (bypass cache)
      window.location.href = window.location.href.split('#')[0] + '?reset=' + Date.now();

    } catch (error) {
      console.error('🔔 OneSignal: Reset failed', error);
      setIsInitialized(true); // Ensure UI isn't stuck
      throw error;
    }
  }, [isInitialized]);

  const value = {
    isSupported,
    isSubscribed,
    isInitialized,
    playerId,
    permission,
    subscribe,
    unsubscribe,
    requestPermission,
    resetConnection,
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
