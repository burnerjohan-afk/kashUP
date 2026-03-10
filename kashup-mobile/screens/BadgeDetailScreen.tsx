import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '../constants/theme';
import { RewardsStackParamList } from '../navigation/RewardsStack';
import { RewardBadge } from '../types/rewards';
import { TabScreenHeader, TAB_HEADER_HEIGHT, TAB_HEADER_TOP_OFFSET } from '@/src/components/TabScreenHeader';
import { useWallet } from '@/src/hooks/useWallet';
import { useRewards } from '@/src/hooks/useRewards';
import { useNotifications } from '../context/NotificationsContext';

type BadgeRoute = RouteProp<RewardsStackParamList, 'BadgeDetail'>;

type Props = {
  route: BadgeRoute;
};

export default function BadgeDetailScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RewardsStackParamList>>();
  const insets = useSafeAreaInsets();
  const { badge } = route.params;
  const { data: walletData } = useWallet();
  const { data: rewardsData } = useRewards();
  const { notifications } = useNotifications();
  const cashback = walletData?.wallet?.soldeCashback ?? null;
  const points = rewardsData?.summary?.points ?? 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationPress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    (tabNav as any)?.navigate?.('Accueil', { screen: 'Notifications' });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    (tabNav as any)?.navigate?.('Accueil', { screen: 'Profile' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <TabScreenHeader
        title="Badge"
        onBackPress={() => navigation.goBack()}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        unreadCount={unreadCount}
        cashback={cashback}
        points={points}
        showPillsRow
        solidBackground
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(0, insets.top - 36) + TAB_HEADER_TOP_OFFSET + TAB_HEADER_HEIGHT + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.primaryPurple, colors.primaryBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.emojiBubble}>
            <Text style={styles.emoji}>{badge.emoji}</Text>
          </View>
          <Text style={styles.title}>{badge.label}</Text>
          <Text style={styles.status}>{badge.unlocked ? 'Badge débloqué' : 'Badge en cours'}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${badge.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{badge.progress}% complété</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comment l’obtenir ?</Text>
          <Text style={styles.cardText}>{badge.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pourquoi participer ?</Text>
          <Text style={styles.cardText}>
            Chaque badge débloqué renforce votre impact sur l’économie locale et vous offre des surprises
            exclusives (points bonus, accès à des loteries privées, badges collectors…).
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emojiBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  status: {
    color: '#F1F5FF',
    fontSize: 14,
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF33',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
  },
  progressText: {
    color: '#F1F5FF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});


