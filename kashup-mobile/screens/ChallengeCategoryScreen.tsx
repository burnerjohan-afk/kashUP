import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, radius, spacing } from '../constants/theme';
import { RewardsStackParamList } from '../navigation/RewardsStack';
import { RewardChallenge } from '../types/rewards';
import { useRewards } from '../src/hooks/useRewards';
import { TabScreenHeader, TAB_HEADER_HEIGHT, TAB_HEADER_TOP_OFFSET } from '../src/components/TabScreenHeader';
import { useNotifications } from '../context/NotificationsContext';
import { useWallet } from '../src/hooks/useWallet';

type Route = RouteProp<RewardsStackParamList, 'ChallengeCategory'>;

const REWARDS_CARD_GRADIENT = ['#034d35', '#047857', '#059669', '#047857', '#065f46'] as const;
const REWARDS_CARD_GRADIENT_LOCATIONS = [0, 0.25, 0.5, 0.75, 1] as const;

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'consentements':
      return 'document-text-outline';
    case 'parrainages':
      return 'people-outline';
    case 'cagnotte':
      return 'wallet-outline';
    case 'connexion':
      return 'link-outline';
    case 'ma_fid':
      return 'heart-outline';
    default:
      return 'flash-outline';
  }
}

export default function ChallengeCategoryScreen({ route }: { route: Route }) {
  const { category, label } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<RewardsStackParamList>>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { data, loading, refetch } = useRewards();
  const { data: walletData } = useWallet();
  const { notifications } = useNotifications();
  const challenges = (data.challenges ?? []).filter(
    (c) => (c.category ?? '').toLowerCase() === category.toLowerCase()
  );

  const cashback = walletData?.wallet?.soldeCashback ?? null;
  const points = data?.summary?.points ?? 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationPress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    (tabNav as any)?.navigate?.('Accueil', { screen: 'Notifications' });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    (tabNav as any)?.navigate?.('Accueil', { screen: 'Profile' });
  }, [navigation]);

  const headerPaddingTop = Math.max(0, insets.top - 36) + TAB_HEADER_TOP_OFFSET + TAB_HEADER_HEIGHT + 15;
  const categoryIcon = getCategoryIcon(category);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <TabScreenHeader
        title={label}
        scrollY={scrollY}
        onBackPress={() => navigation.goBack()}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        unreadCount={unreadCount}
        cashback={cashback}
        points={points}
        showPillsRow
        solidBackground
      />
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingTop: headerPaddingTop }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={categoryIcon} size={32} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{label}</Text>
          <Text style={styles.heroSubtitle}>
            {challenges.length === 0 && !loading
              ? 'Aucun défi dans cette catégorie'
              : `${challenges.length} défi${challenges.length !== 1 ? 's' : ''} à relever`}
          </Text>
        </View>
        {loading && challenges.length === 0 ? (
          <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
        ) : challenges.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={48} color={colors.greyInactive} />
            <Text style={styles.emptyText}>Aucun défi dans cette catégorie pour le moment.</Text>
            <Text style={styles.emptyHint}>Revenez plus tard pour de nouveaux défis.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {challenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onPress={() => navigation.navigate('ChallengeDetail', { challenge })}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function ChallengeCard({
  challenge,
  onPress,
}: {
  challenge: RewardChallenge;
  onPress: () => void;
}) {
  const isDone = challenge.userStatus === 'done';
  const points = challenge.rewardPoints ?? challenge.reward?.rewardValue ?? 0;
  const pct =
    challenge.percentage ??
    (challenge.goalValue > 0 ? Math.min(100, Math.round((challenge.current / challenge.goalValue) * 100)) : 0);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.cardWrapper}>
      <View style={[styles.cardOuter, isDone && styles.cardOuterDone]}>
        <LinearGradient
          colors={isDone ? [...REWARDS_CARD_GRADIENT] : [colors.white, '#F8FAFC']}
          locations={isDone ? [...REWARDS_CARD_GRADIENT_LOCATIONS] : undefined}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, !isDone && styles.cardLocked]}
        >
          <View style={[styles.circle, !isDone && styles.circleLocked]}>
            <Ionicons
              name={isDone ? 'checkmark-circle' : 'lock-closed'}
              size={32}
              color={isDone ? colors.white : colors.primary}
            />
          </View>
          <Text style={[styles.badgeStatus, !isDone && styles.badgeStatusLocked]}>
            {isDone ? 'Débloqué' : 'En cours'}
          </Text>
          <Text style={[styles.cardTitle, !isDone && styles.cardTitleLocked]} numberOfLines={2}>
            {challenge.title}
          </Text>
          <View style={styles.pointsRow}>
            <Text style={[styles.pointsValue, !isDone && styles.pointsValueLocked]}>
              +{points} pts
            </Text>
          </View>
          <View style={[styles.progressBar, !isDone && styles.progressBarLocked]}>
            <View style={[styles.progressFill, { width: `${pct}%` }, !isDone && styles.progressFillLocked]} />
          </View>
          <Text style={[styles.progressLabel, !isDone && styles.progressLabelLocked]}>
            {challenge.current} / {challenge.goalValue}
          </Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(4, 120, 87, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMain,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl * 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '600',
  },
  emptyHint: {
    color: colors.greyInactive,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '47%',
  },
  cardOuter: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardOuterDone: {
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 200,
  },
  cardLocked: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  circleLocked: {
    backgroundColor: 'rgba(4, 120, 87, 0.15)',
  },
  badgeStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  badgeStatusLocked: {
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cardTitleLocked: {
    color: colors.textMain,
  },
  pointsRow: {
    marginBottom: spacing.xs,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  pointsValueLocked: {
    color: colors.primary,
  },
  progressBar: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: '100%',
    overflow: 'hidden',
  },
  progressBarLocked: {
    backgroundColor: 'rgba(4, 120, 87, 0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
  },
  progressFillLocked: {
    backgroundColor: colors.primary,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
  },
  progressLabelLocked: {
    color: colors.textSecondary,
  },
});
