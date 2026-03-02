import { useState, useCallback, useEffect } from 'react';
import { useSubscribePush } from './useSettings';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PushPermissionState;
  isSupported: boolean;
  isSubscribing: boolean;
  subscribeError: Error | null;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  checkPermission: () => PushPermissionState;
}

/**
 * Check if Push API and service workers are supported
 */
function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current push subscription from the service worker
 */
async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Subscribe to push notifications
 */
async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
  });

  return subscription;
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Hook for managing push notification permissions and subscriptions.
 * Handles the full flow: permission request, subscription creation, and API registration.
 *
 * @example
 * ```typescript
 * const push = usePushNotifications({ vapidPublicKey: '...' });
 *
 * // Check if supported
 * if (!push.isSupported) return <div>Push not supported</div>;
 *
 * // Handle toggle
 * const handleToggle = async (enabled: boolean) => {
 *   if (enabled) {
 *     const success = await push.subscribe();
 *     // Show success/error feedback
 *   }
 * };
 * ```
 */
export function usePushNotifications(options?: {
  vapidPublicKey?: string;
}): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const isSupported = isPushSupported();
  const subscribeMutation = useSubscribePush();

  // Initialize permission state
  useEffect(() => {
    if (!isSupported) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setPermission('unsupported');
      return;
    }

    // Check current notification permission
    if ('Notification' in window) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setPermission(Notification.permission as PushPermissionState);
    }
  }, [isSupported]);

  /**
   * Check the current permission state
   */
  const checkPermission = useCallback((): PushPermissionState => {
    if (!isSupported) return 'unsupported';
    if ('Notification' in window) {
      return Notification.permission as PushPermissionState;
    }
    return 'unsupported';
  }, [isSupported]);

  /**
   * Request notification permission from the user
   * Returns true if granted, false otherwise
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);
      return result === 'granted';
    } catch {
      setPermission('denied');
      return false;
    }
  }, [isSupported]);

  /**
   * Subscribe to push notifications and register with the API
   * Returns true if successful, false otherwise
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    // Check/request permission first
    const currentPermission = checkPermission();
    if (currentPermission === 'denied') return false;

    if (currentPermission === 'default') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    // Check if already subscribed
    const existingSubscription = await getExistingSubscription();
    if (existingSubscription) {
      // Already subscribed, just register with API if needed
      const subData = subscriptionToInput(existingSubscription);
      try {
        await subscribeMutation.mutateAsync(subData);
        return true;
      } catch {
        return false;
      }
    }

    // Need VAPID key to subscribe
    const vapidKey = options?.vapidPublicKey;
    if (!vapidKey) {
      console.error('VAPID public key is required for push subscription');
      return false;
    }

    // Create new subscription
    try {
      const subscription = await subscribeToPush(vapidKey);
      if (!subscription) return false;

      // Register with API
      const subData = subscriptionToInput(subscription);
      await subscribeMutation.mutateAsync(subData);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }, [isSupported, checkPermission, requestPermission, options?.vapidPublicKey, subscribeMutation]);

  return {
    permission,
    isSupported,
    isSubscribing: subscribeMutation.isPending,
    subscribeError: subscribeMutation.error as Error | null,
    requestPermission,
    subscribe,
    checkPermission,
  };
}

/**
 * Convert PushSubscription to API input format
 */
function subscriptionToInput(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    p256dhKey: json.keys?.p256dh!,
    authKey: json.keys?.auth!,
  };
}

/**
 * Hook for simple push notification toggle with localStorage persistence
 */
export function usePushNotificationToggle(options?: { vapidPublicKey?: string }): {
  isEnabled: boolean;
  isSupported: boolean;
  permission: PushPermissionState;
  isLoading: boolean;
  error: string | null;
  toggle: () => Promise<void>;
} {
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('pushNotificationsEnabled') === 'true';
  });
  const [error, setError] = useState<string | null>(null);

  const push = usePushNotifications(options);

  // Sync local state with actual permission
  useEffect(() => {
    if (push.permission === 'denied' && isEnabled) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsEnabled(false);
      localStorage.removeItem('pushNotificationsEnabled');
    }
  }, [push.permission, isEnabled]);

  const toggle = useCallback(async () => {
    setError(null);

    const newState = !isEnabled;

    if (newState) {
      // Enabling push
      const success = await push.subscribe();
      if (success) {
        setIsEnabled(true);
        localStorage.setItem('pushNotificationsEnabled', 'true');
      } else {
        setError(
          push.permission === 'denied'
            ? 'Push notifications are blocked. Please enable them in your browser settings.'
            : 'Failed to enable push notifications. Please try again.'
        );
        // Revert to disabled
        setIsEnabled(false);
        localStorage.removeItem('pushNotificationsEnabled');
      }
    } else {
      // Disabling push - just update local state
      // Note: Actual unsubscription would require an API endpoint
      setIsEnabled(false);
      localStorage.removeItem('pushNotificationsEnabled');
    }
  }, [isEnabled, push]);

  return {
    isEnabled,
    isSupported: push.isSupported,
    permission: push.permission,
    isLoading: push.isSubscribing,
    error,
    toggle,
  };
}
