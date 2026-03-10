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

import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../../constants/theme';

/** Hauteur du bandeau (contenu + 30 px d’agrandissement depuis la base 44) */
export const TAB_HEADER_HEIGHT = 64;
/** Décalage vertical du bandeau (le faire descendre de 20 px sur les pages autres qu'accueil) */
export const TAB_HEADER_TOP_OFFSET = 20;

const formatCashback = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPoints = (v: number) => `${v.toLocaleString('fr-FR')} pts`;

export type TabScreenHeaderProps = {
  /** Titre au centre (optionnel) */
  title?: string;
  /** Valeur animée du scroll Y pour l'effet de transparence (optionnel ; si absent, fond opaque) */
  scrollY?: Animated.Value;
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
  /** Bandeau vert dégradé (comme Rewards / Cartes UP) au lieu du fond blanc */
  variant?: 'default' | 'green';
  /** Fond blanc opaque (bandeau toujours bien visible, sans transparence au scroll) */
  solidBackground?: boolean;
  /** Affiche un bouton retour à gauche (au lieu des notifications) */
  onBackPress?: () => void;
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
  variant = 'default',
  solidBackground = false,
  onBackPress,
}: TabScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(0, insets.top - 36) + TAB_HEADER_TOP_OFFSET;
  const showPills = showPillsRow || cashback != null || points != null;
  const cashbackValue = cashback != null ? cashback : 0;
  const pointsValue = points != null ? points : 0;
  const isGreen = variant === 'green';

  const backgroundColor =
    solidBackground || !scrollY
      ? (isGreen ? 'rgba(3,77,53,0.98)' : colors.white)
      : scrollY.interpolate({
          inputRange: [0, 60, 120],
          outputRange: [
            isGreen ? 'rgba(3,77,53,0.98)' : 'rgba(255,255,255,0.92)',
            isGreen ? 'rgba(3,77,53,0.96)' : 'rgba(255,255,255,0.90)',
            isGreen ? 'rgba(3,77,53,0.94)' : 'rgba(255,255,255,0.88)',
          ],
          extrapolate: 'clamp',
        });

  const hasActiveNotifications = unreadCount > 0;
  const iconColor = isGreen ? colors.white : colors.textMain;

  const innerContent = (
    <View style={styles.inner}>
      {onBackPress ? (
        <TouchableOpacity
          style={[styles.headerIcon, isGreen && styles.headerIconOnGreen]}
          activeOpacity={0.7}
          onPress={onBackPress}>
          <Ionicons name="chevron-back" size={24} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.headerIcon, isGreen && styles.headerIconOnGreen]}
          activeOpacity={0.7}
          onPress={onNotificationPress}>
          <Ionicons name="notifications-outline" size={24} color={iconColor} />
          {hasActiveNotifications && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      {showPills ? (
        <View style={styles.pillsRow}>
          <LinearGradient
            colors={['#059669', colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillPoints}>
            <Ionicons name="star" size={16} color="#FFF" />
            <Text style={styles.pillPointsText}>{formatPoints(pointsValue)}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#059669', colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillCashback}>
            <Text style={styles.pillCashbackSymbol}>€</Text>
            <Text style={styles.pillCashbackValue}>{formatCashback(cashbackValue)}</Text>
          </LinearGradient>
        </View>
      ) : title ? (
        <Text style={[styles.headerTitle, isGreen && styles.headerTitleOnGreen]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <TouchableOpacity
        style={[styles.headerIcon, isGreen && styles.headerIconOnGreen]}
        activeOpacity={0.7}
        onPress={onProfilePress}>
        <Ionicons name="person-circle-outline" size={24} color={iconColor} />
      </TouchableOpacity>
    </View>
  );

  if (isGreen) {
    return (
      <Animated.View style={[styles.wrapper, styles.wrapperGreen, { paddingTop }]} pointerEvents="box-none">
        <LinearGradient
          colors={[...CARD_GRADIENT_COLORS]}
          locations={[...CARD_GRADIENT_LOCATIONS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.wrapperInner}>{innerContent}</View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { paddingTop },
        solidBackground ? { backgroundColor: backgroundColor as string } : { backgroundColor },
      ]}
      pointerEvents="box-none">
      {innerContent}
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
    overflow: 'hidden',
  },
  wrapperGreen: {
    paddingHorizontal: 0,
  },
  wrapperInner: {
    paddingHorizontal: spacing.lg,
  },
  headerIconOnGreen: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  headerTitleOnGreen: {
    color: colors.white,
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: colors.primary,
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pillCashbackSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  pillCashbackValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TAB_HEADER_HEIGHT,
    paddingTop: 2,
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
