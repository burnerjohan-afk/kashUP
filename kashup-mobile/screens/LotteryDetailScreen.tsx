import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '../constants/theme';
import { RewardsStackParamList } from '../navigation/RewardsStack';
import { useNotifications } from '../context/NotificationsContext';
import LotteryCountdown from '@/src/components/LotteryCountdown';
import { getLottery, joinLottery, type Lottery } from '@/src/services/lotteryService';
import { normalizeImageUrl } from '@/src/utils/normalizeUrl';
import { TabScreenHeader, TAB_HEADER_HEIGHT, TAB_HEADER_TOP_OFFSET } from '@/src/components/TabScreenHeader';
import { useWallet } from '@/src/hooks/useWallet';
import { useRewards } from '@/src/hooks/useRewards';

/** Marge bas pour que le défilement s'arrête au-dessus du bandeau (tab bar). */
const BOTTOM_TAB_AREA = 90;

type LotteryRoute = RouteProp<RewardsStackParamList, 'LotteryDetail'>;

type Props = {
  route: LotteryRoute;
};

export default function LotteryDetailScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RewardsStackParamList>>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { lottery: initialLottery, lotteryId: paramLotteryId } = route.params;
  const lotteryId = paramLotteryId ?? initialLottery?.id;
  const { data: walletData } = useWallet();
  const { data: rewardsData } = useRewards();
  const cashback = walletData?.wallet?.soldeCashback ?? null;
  const points = rewardsData?.summary?.points ?? 0;
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationPress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    (tabNav as any)?.navigate?.('Accueil', { screen: 'Notifications' });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    (tabNav as any)?.navigate?.('Accueil', { screen: 'Profile' });
  }, [navigation]);

  const adaptRewardLottery = (l: typeof initialLottery): Lottery | null => {
    if (!l) return null;
    return {
      id: l.id,
      title: l.title,
      description: l.description ?? '',
      imageUrl: l.imageUrl ?? undefined,
      pointsPerTicket: l.pointsPerTicket ?? 100,
      isTicketStockLimited: l.isTicketStockLimited,
      ticketsRemaining: l.ticketsRemaining ?? null,
      userTicketCount: l.userTicketCount ?? 0,
      startAt: '',
      endAt: '',
      drawDate: l.drawDate ?? '',
      status: l.status ?? 'active',
      countdown: l.countdown,
    };
  };

  const [lottery, setLottery] = useState<Lottery | null>(() =>
    initialLottery ? adaptRewardLottery(initialLottery) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [ticketsToBuy, setTicketsToBuy] = useState('1');
  const [joining, setJoining] = useState(false);
  const { addNotification } = useNotifications();

  const fetchLottery = useCallback(async () => {
    if (!lotteryId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLottery(lotteryId);
      setLottery(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loterie introuvable');
    } finally {
      setLoading(false);
    }
  }, [lotteryId]);

  useEffect(() => {
    if (lotteryId) fetchLottery();
  }, [lotteryId, fetchLottery]);

  useEffect(() => {
    setImageLoadError(false);
  }, [lottery?.imageUrl]);

  const handleTicketsChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setTicketsToBuy(sanitized.length === 0 ? '0' : sanitized);
  };

  const incrementTickets = (delta: number) => {
    setTicketsToBuy((prev) => {
      const next = Math.max(0, (parseInt(prev, 10) || 0) + delta);
      return String(next);
    });
  };

  const handlePurchase = async () => {
    const quantity = parseInt(ticketsToBuy, 10) || 0;
    if (quantity <= 0 || !lottery) {
      Alert.alert('Erreur', 'Sélectionnez au moins 1 ticket.');
      return;
    }
    const total = quantity * lottery.pointsPerTicket;
    setJoining(true);
    try {
      const updated = await joinLottery(lottery.id, quantity);
      setLottery(updated);
      setTicketsToBuy('1');
      addNotification({
        category: 'lotteries',
        title: `${quantity} ticket(s) achetés`,
        description: `${lottery.title} • −${total} pts`,
      });
      Alert.alert('Participation confirmée', `${quantity} ticket(s) achetés pour −${total} pts.`);
    } catch (err) {
      Alert.alert(
        'Erreur',
        err instanceof Error ? err.message : 'Impossible de participer. Vérifiez vos points.'
      );
    } finally {
      setJoining(false);
    }
  };

  const RULES = [
    'Chaque ticket augmente vos chances de gagner mais ne garantit pas la victoire.',
    'Le tirage est effectué de manière aléatoire et contrôlé par KashUP.',
    'Les gagnants sont contactés par e-mail et via l’application.',
    'Les tickets ne sont pas remboursables une fois achetés.',
  ];

  if (loading || (!lottery && !error)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lottery) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>{error ?? 'Loterie introuvable'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pointsPerTicket = lottery.pointsPerTicket ?? 100;
  const drawDate = lottery.drawDate ?? lottery.endAt;
  const soldOut = lottery.isTicketStockLimited && (lottery.ticketsRemaining ?? 0) <= 0;
  const canParticipate = !soldOut && lottery.status === 'active';

  const headerPaddingTop = Math.max(0, insets.top - 36) + TAB_HEADER_TOP_OFFSET + TAB_HEADER_HEIGHT + spacing.md;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        <TabScreenHeader
          title="Loterie"
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
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerPaddingTop,
              paddingBottom: Math.max(spacing.xl * 2, insets.bottom + BOTTOM_TAB_AREA),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {lottery.imageUrl && !imageLoadError ? (
          <Image
            source={{ uri: normalizeImageUrl(lottery.imageUrl) }}
            style={styles.heroImage}
            resizeMode="cover"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.heroImagePlaceholder}>
            <Ionicons name="ticket-outline" size={56} color={colors.greyInactive} />
          </View>
        )}

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{lottery.title}</Text>
          <Text style={styles.heroPrize}>
            {lottery.prizeTitle ?? lottery.prizeDescription ?? 'Lot à gagner'}
          </Text>
          {drawDate && (
            <View style={styles.heroCountdownWrap}>
              <LotteryCountdown drawDate={drawDate} showIcon={true} textStyle={styles.heroCountdown} />
            </View>
          )}
        </View>

        {lottery.description ? (
          <Text style={styles.description}>{lottery.description}</Text>
        ) : null}

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Coût</Text>
            <Text style={styles.infoValue}>{pointsPerTicket} pts / ticket</Text>
          </View>
          {lottery.isTicketStockLimited && lottery.ticketsRemaining != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tickets restants</Text>
              <Text
                style={[
                  styles.infoValue,
                  lottery.ticketsRemaining <= 0 && styles.infoValueSoldOut,
                ]}>
                {lottery.ticketsRemaining <= 0
                  ? 'Épuisé'
                  : `${lottery.ticketsRemaining}`}
              </Text>
            </View>
          )}
        </View>

        {lottery.userTicketCount != null && lottery.userTicketCount > 0 && (
          <View style={styles.userTicketsCard}>
            <Ionicons name="ticket" size={20} color={colors.primary} />
            <Text style={styles.userTicketsText}>
              Vous avez {lottery.userTicketCount} ticket{lottery.userTicketCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {canParticipate && (
          <View style={styles.purchaseCard}>
            <Text style={styles.purchaseCardTitle}>Participer</Text>
            <Text style={styles.purchaseCardSubtitle}>
              1 ticket = {pointsPerTicket} pts. Choisissez le nombre de tickets.
            </Text>
            <View style={styles.ticketRow}>
              <TouchableOpacity style={styles.stepButton} onPress={() => incrementTickets(-1)}>
                <Text style={styles.stepButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.ticketInput}
                keyboardType="numeric"
                value={ticketsToBuy}
                onChangeText={handleTicketsChange}
              />
              <TouchableOpacity style={styles.stepButton} onPress={() => incrementTickets(1)}>
                <Text style={styles.stepButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.ticketPrimaryButton, joining && styles.ticketPrimaryButtonDisabled]}
              onPress={handlePurchase}
              disabled={joining}>
              {joining ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.ticketPrimaryText}>Obtenir mes tickets</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {soldOut && (
          <View style={styles.soldOutCard}>
            <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            <Text style={styles.soldOutText}>Tickets épuisés</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Règlement de la loterie</Text>
          {RULES.map((rule) => (
            <Text key={rule} style={styles.ruleLine}>
              • {rule}
            </Text>
          ))}
        </View>
      </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.slateBackground },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
  errorText: { color: colors.accentRed, marginBottom: spacing.md, textAlign: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  backButtonText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  toolbarTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.greyLight,
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroTitle: { color: colors.textMain, fontSize: 22, fontWeight: '800' },
  heroPrize: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  heroCountdownWrap: { marginTop: spacing.xs },
  heroCountdown: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textMain },
  infoValueSoldOut: { color: colors.accentRed },
  description: { fontSize: 15, color: colors.textMain, lineHeight: 22 },
  userTicketsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  userTicketsText: { fontSize: 14, fontWeight: '600', color: colors.textMain },
  purchaseCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  purchaseCardTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  purchaseCardSubtitle: { fontSize: 14, color: colors.textSecondary },
  ticketRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { fontSize: 22, fontWeight: '600', color: colors.textMain },
  ticketInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    backgroundColor: colors.white,
  },
  ticketPrimaryButton: {
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ticketPrimaryButtonDisabled: { opacity: 0.7 },
  ticketPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  soldOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.greyLight,
    borderRadius: radius.lg,
  },
  soldOutText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
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
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  ruleLine: { color: colors.textSecondary, fontSize: 14 },
});
