import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hasRefreshToken } from '@/src/services/api';
import { getNotifications } from '@/src/services/contentService';

export type NotificationCategory = 'boosts' | 'cashback' | 'points' | 'lotteries' | 'system';

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  date: string;
  read?: boolean;
};

type AddNotificationPayload = {
  title: string;
  description: string;
  category: NotificationCategory;
  read?: boolean;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  addNotification: (payload: AddNotificationPayload) => void;
  markAllAsRead: () => void;
  refetch: () => Promise<void>;
  loading: boolean;
  error: string | null;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const formatNow = () => {
  const date = new Date();
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRemoteDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [banner, setBanner] = useState<AddNotificationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addNotification = useCallback((payload: AddNotificationPayload) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        ...payload,
        date: formatNow(),
      },
      ...prev,
    ]);
    setBanner(payload);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => (notif.read ? notif : { ...notif, read: true })));
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isAuth = await hasRefreshToken();
      if (!isAuth) {
        setNotifications([]);
        return;
      }
      const data = await getNotifications();
      setNotifications(
        data.map((notif) => ({
          id: notif.id,
          title: notif.title,
          description: notif.description ?? (notif as { body?: string }).body ?? '',
          category: notif.category,
          date: formatRemoteDate(notif.date),
          read: notif.read,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les notifications.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 2500);
    return () => clearTimeout(timer);
  }, [banner]);

  const value = useMemo(
    () => ({ notifications, addNotification, markAllAsRead, refetch: loadNotifications, loading, error }),
    [notifications, addNotification, markAllAsRead, loadNotifications, loading, error],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      {banner && (
        <View pointerEvents="none" style={styles.toastContainer}>
          <View style={styles.toast}>
            <Text style={styles.toastTitle}>{banner.title}</Text>
            <Text style={styles.toastDescription}>{banner.description}</Text>
          </View>
        </View>
      )}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    width: '90%',
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  toastDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});



