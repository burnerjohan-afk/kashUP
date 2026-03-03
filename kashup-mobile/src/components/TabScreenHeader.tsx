import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../constants/theme';

/** Même hauteur que le bandeau de la page d'accueil (HEADER_CONTENT_HEIGHT) */
export const TAB_HEADER_HEIGHT = 44;

const formatCashback = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPoints = (v: number) => `${v.toLocaleString('fr-FR')} pts`;

export type TabScreenHeaderProps = {
  /** Titre au centre (optionnel) */
  title?: string;
  /** Valeur animée du scroll Y pour l'effet de transparence */
  scrollY: Animated.Value;
  /** Clic sur l'icône notifications */
  onNotificationPress: () => void;
  /** Clic sur l'icône profil */
  onProfilePress: () => void;
  /** Nombre de notifications non lues (badge) */
  unreadCount?: number;
  /** Cashback à afficher (affiche la ligne points + cashback si défini) */
  cashback?: number | null;
  /** Points à afficher (affiche la ligne points + cashback si défini) */
  points?: number | null;
  /** Force l'affichage de la ligne points/cashback même si les valeurs sont null (ex. chargement) */
  showPillsRow?: boolean;
};

export function TabScreenHeader({
  title,
  scrollY,
  onNotificationPress,
  onProfilePress,
  unreadCount = 0,
  cashback,
  points,
  showPillsRow = false,
}: TabScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(0, insets.top - 36);
  const showPills = showPillsRow || cashback != null || points != null;
  const cashbackValue = cashback != null ? cashback : 0;
  const pointsValue = points != null ? points : 0;

  const backgroundColor = scrollY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: [
      'rgba(255,255,255,0.92)',
      'rgba(255,255,255,0.90)',
      'rgba(255,255,255,0.88)',
    ],
    extrapolate: 'clamp',
  });

  const hasActiveNotifications = unreadCount > 0;

  return (
    <Animated.View
      style={[styles.wrapper, { paddingTop, backgroundColor }]}
      pointerEvents="box-none">
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.headerIcon}
          activeOpacity={0.7}
          onPress={onNotificationPress}>
          <Ionicons name="notifications-outline" size={24} color={colors.textMain} />
          {hasActiveNotifications && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {showPills ? (
          <View style={styles.pillsRow}>
            <LinearGradient
              colors={['#0ABF5C', '#05A357', '#048A48']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pillPoints}>
              <Ionicons name="star" size={16} color="#FFF" />
              <Text style={styles.pillPointsText}>{formatPoints(pointsValue)}</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#F5F5F5', '#E0E0E0', '#BDBDBD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pillCashback}>
              <Text style={styles.pillCashbackSymbol}>€</Text>
              <Text style={styles.pillCashbackValue}>{formatCashback(cashbackValue)}</Text>
            </LinearGradient>
          </View>
        ) : title ? (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        <TouchableOpacity
          style={styles.headerIcon}
          activeOpacity={0.7}
          onPress={onProfilePress}>
          <Ionicons name="person-circle-outline" size={24} color={colors.textMain} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: 0,
    paddingHorizontal: spacing.lg,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  pillPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 84,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#05A357',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pillPointsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  pillCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 84,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#616161',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pillCashbackSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: '#424242',
    letterSpacing: 0.2,
  },
  pillCashbackValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#424242',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TAB_HEADER_HEIGHT,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.accentRed,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  headerBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  headerSpacer: {
    flex: 1,
  },
});
