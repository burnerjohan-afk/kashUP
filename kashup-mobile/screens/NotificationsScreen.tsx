import React, { useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import { useNotifications, NotificationCategory, AppNotification } from '../context/NotificationsContext';

const FILTERS: { key: NotificationCategory | 'all'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tout', icon: 'layers-outline' },
  { key: 'boosts', label: 'Boosts', icon: 'flash-outline' },
  { key: 'cashback', label: 'Cashback', icon: 'card-outline' },
  { key: 'points', label: 'Points', icon: 'sparkles-outline' },
  { key: 'lotteries', label: 'Loteries', icon: 'trophy-outline' },
  { key: 'system', label: 'Système', icon: 'notifications-outline' },
];

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { notifications, markAllAsRead, loading, error, refetch } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]['key']>('all');

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        markAllAsRead();
      }
    }, [markAllAsRead, loading]),
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') {
      return notifications;
    }
    return notifications.filter((notif) => notif.category === activeFilter);
  }, [activeFilter, notifications]);

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <View style={[styles.notificationCard, item.read && styles.notificationCardRead]}>
      <View style={styles.notificationIconWrapper}>
        <Ionicons
          name={
            item.category === 'boosts'
              ? 'flash-outline'
              : item.category === 'cashback'
              ? 'card-outline'
              : item.category === 'points'
              ? 'sparkles-outline'
              : item.category === 'lotteries'
              ? 'ticket-outline'
              : 'notifications-outline'
          }
          size={18}
          color={item.read ? colors.textSecondary : colors.primaryBlue}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notificationTitle, item.read && styles.notificationTitleRead]}>{item.title}</Text>
        <Text style={[styles.notificationDescription, item.read && styles.notificationDescriptionRead]}>
          {item.description}
        </Text>
        <Text style={styles.notificationDate}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[...CARD_GRADIENT_COLORS]}
        locations={[...CARD_GRADIENT_LOCATIONS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Notifications KashUP</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.heroSubtitle}>
          Boosts, cashbacks, points, loteries… tout arrive ici en temps réel.
        </Text>
      </LinearGradient>

      <View style={styles.filterRow}>
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={refetch}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorCta}>Actualiser</Text>
          </TouchableOpacity>
        )}
        <FlatList
          data={FILTERS}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = item.key === activeFilter;
            return (
              <TouchableOpacity
                style={[styles.filterChipWrap, active && styles.filterChipWrapActive]}
                onPress={() => setActiveFilter(item.key)}
                activeOpacity={0.85}>
                {active ? (
                  <LinearGradient
                    colors={[...CARD_GRADIENT_COLORS]}
                    locations={[...CARD_GRADIENT_LOCATIONS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.filterChip, styles.filterChipActive]}>
                    <Ionicons name={item.icon} size={16} color={colors.white} />
                    <Text style={[styles.filterChipLabel, styles.filterChipLabelActive]}>{item.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.filterChip}>
                    <Ionicons name={item.icon} size={16} color={colors.textSecondary} />
                    <Text style={styles.filterChipLabel}>{item.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderNotification}
        refreshing={loading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <ActivityIndicator color={colors.primaryPurple} style={{ marginTop: spacing.md }} />
            ) : (
              <>
                <Text style={styles.emptyTitle}>{error ? 'Impossible de charger' : 'Aucune notification'}</Text>
                <Text style={styles.emptySubtitle}>
                  {error ? 'Touchez “Actualiser” pour réessayer.' : 'Vous êtes à jour sur toutes vos récompenses.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  hero: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#F5F5FF',
    fontSize: 14,
    marginTop: spacing.xs,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChipWrap: {
    borderRadius: radius.pill,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  filterChipWrapActive: {
    overflow: 'hidden',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    borderWidth: 0,
  },
  filterChipLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipLabelActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorBanner: {
    backgroundColor: '#FFE4E6',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  errorCta: {
    color: colors.primaryPurple,
    fontWeight: '600',
    marginTop: 2,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  notificationCardRead: {
    backgroundColor: '#F1F5F9',
  },
  notificationIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  notificationTitleRead: {
    color: '#475569',
  },
  notificationDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  notificationDescriptionRead: {
    color: '#94A3B8',
  },
  notificationDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});


