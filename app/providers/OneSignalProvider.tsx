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
          // safarai_web_id is only required for Legacy Safari (macOS < 13), optional for modern browsers
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

  // Reset OneSignal connection completely (without page reload)
  const resetConnection = useCallback(async () => {
    console.log('🔔 OneSignal: Resetting connection...');

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
            new Promise((_, reject) => setTimeout(() => reject(new Error('OptOut timeout')), 5000))
          ]);
        } catch (e) {
          console.warn('🔔 OneSignal: OptOut during reset failed or timed out', e);
        }
      }

      // 2. Clear OneSignal IndexedDB (with proper async handling)
      if ('indexedDB' in window) {
        const dbNames = ['ONE_SIGNAL_SDK_DB', 'onesignal-database'];
        await Promise.all(dbNames.map(dbName => deleteIndexedDB(dbName)));
      }

      // 3. Clear OneSignal localStorage keys
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.toLowerCase().includes('onesignal') || k.toLowerCase().includes('one_signal')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log(`🔔 OneSignal: Cleared ${keysToRemove.length} localStorage keys`);

      // 4. Unregister OneSignal Service Workers (with timeout)
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          const unregisterPromises = registrations
            .filter(reg => reg.active?.scriptURL.includes('OneSignal'))
            .map(async (reg) => {
              try {
                await Promise.race([
                  reg.unregister(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Unregister timeout')), 3000))
                ]);
                console.log('🔔 OneSignal: Unregistered OneSignal service worker');
              } catch (e) {
                console.warn('🔔 OneSignal: Service worker unregister failed or timed out', e);
              }
            });
          await Promise.all(unregisterPromises);
        } catch (e) {
          console.warn('🔔 OneSignal: Error getting service worker registrations', e);
        }
      }

      // 5. Reset state
      setIsSubscribed(false);
      setPlayerId(null);
      setIsInitialized(false);

      // 6. Wait longer for cleanup to complete (especially important on production)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 7. Re-initialize OneSignal (without page reload)
      console.log('🔔 OneSignal: Re-initializing...');

      // Force reinitialize by calling init again (OneSignal SDK handles re-init)
      if (window.OneSignal) {
        try {
          const initPromise = window.OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '',
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
          });
          await Promise.race([
            initPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 10000))
          ]);
        } catch (initError: any) {
          // Ignore "already initialized" error
          if (!initError?.message?.includes('already initialized') && !initError?.message?.includes('Init timeout')) {
            throw initError;
          }
          if (initError?.message?.includes('Init timeout')) {
            console.warn('🔔 OneSignal: Init timed out, but continuing...');
          }
        }

        // Check subscription status with timeout
        try {
          const statusPromise = (async () => {
            const subscribed = await window.OneSignal.User.PushSubscription.optedIn;
            const id = await window.OneSignal.User.PushSubscription.id;
            return { subscribed, id };
          })();

          const status = await Promise.race([
            statusPromise,
            new Promise<{ subscribed: boolean; id: string | null }>((resolve) =>
              setTimeout(() => resolve({ subscribed: false, id: null }), 5000)
            )
          ]);

          setIsSubscribed(status.subscribed);
          setPlayerId(status.id);
          setIsInitialized(true);

          // Auto-subscribe after reset
          if (!status.subscribed) {
            console.log('🔔 OneSignal: Auto-subscribing after reset...');
            try {
              await Promise.race([
                (async () => {
                  await window.OneSignal.Notifications.requestPermission();
                  await window.OneSignal.User.PushSubscription.optIn();
                  const newId = await window.OneSignal.User.PushSubscription.id;
                  if (newId) {
                    setPlayerId(newId);
                    setIsSubscribed(true);
                  }
                })(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Subscribe timeout')), 10000))
              ]);
            } catch (subError: any) {
              console.warn('🔔 OneSignal: Auto-subscribe failed or timed out', subError);
            }
          }

          console.log('🔔 OneSignal: Reset complete, status:', { subscribed: status.subscribed, playerId: status.id });
        } catch (statusError) {
          console.warn('🔔 OneSignal: Failed to get subscription status', statusError);
          setIsInitialized(true);
        }
      } else {
        // No OneSignal object, just mark as initialized
        setIsInitialized(true);
      }

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
