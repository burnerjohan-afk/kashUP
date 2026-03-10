import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing } from '../constants/theme';
import { TabScreenHeader, TAB_HEADER_HEIGHT, TAB_HEADER_TOP_OFFSET } from '@/src/components/TabScreenHeader';
import { useJackpot, useJackpotStats } from '@/src/hooks/useJackpot';
import { useNotifications } from '../context/NotificationsContext';
import { useWallet } from '@/src/hooks/useWallet';
import { useRewards } from '@/src/hooks/useRewards';
import { HomeStackParamList } from '../navigation/HomeStack';

/** Marge bas pour que le défilement s'arrête au-dessus du bandeau (tab bar). */
const BOTTOM_TAB_AREA = 90;

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Jackpot'>;

export default function JackpotScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { jackpot, loading, error, refetch } = useJackpot();
  const { stats, loading: statsLoading, participate } = useJackpotStats();
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const { data: walletData } = useWallet();
  const { data: rewardsData } = useRewards();

  const cashback = walletData?.wallet?.soldeCashback ?? null;
  const points = rewardsData?.summary?.points ?? 0;
  const [showJackpotInfoModal, setShowJackpotInfoModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    navigation.navigate('Profile');
  }, [navigation]);

  const handleParticipate = useCallback(async () => {
    await participate();
  }, [participate]);

  const progress = jackpot?.progress;
  const partnerPct =
    progress && progress.partnerPurchasesThreshold > 0
      ? Math.min(100, (progress.partnerPurchasesAmount / progress.partnerPurchasesThreshold) * 100)
      : 0;
  const actionsPct =
    progress && progress.actionsThreshold > 0
      ? Math.min(100, (progress.actions / progress.actionsThreshold) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <TabScreenHeader
        title="Jackpot KashUP"
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        unreadCount={unreadCount}
        cashback={cashback}
        points={points}
        showPillsRow
        solidBackground
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: TAB_HEADER_HEIGHT + TAB_HEADER_TOP_OFFSET + spacing.md + 12,
            paddingBottom: Math.max(spacing.xl * 2, insets.bottom + BOTTOM_TAB_AREA),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading && !jackpot ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : jackpot ? (
          <>
            <TouchableOpacity onPress={() => setShowJackpotInfoModal(true)} style={styles.moduleInfoTrigger}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.moduleInfoTriggerText}>À quoi ça sert et comment ça marche</Text>
            </TouchableOpacity>
            <LinearGradient
              colors={['#ffd700', '#ffd700', '#ffd700', '#e6c200']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="flame" size={32} color={colors.black} />
                <Text style={styles.cardTitleOnGold}>{jackpot.title}</Text>
              </View>
              {jackpot.description ? (
                <Text style={styles.cardDescriptionOnGold}>{jackpot.description}</Text>
              ) : null}
              <View style={styles.amountRow}>
                <Text style={styles.amountLabelOnGold}>Montant actuel</Text>
                <Text style={styles.amountOnGold}>
                  {jackpot.currentAmount.toFixed(2)} {jackpot.currency}
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.encart}>
              <Text style={styles.encartTitle}>Progression</Text>
              <View style={styles.progressBlock}>
                <Text style={styles.progressLabel}>Achats partenaires</Text>
                <Text style={styles.progressValue}>
                  {progress?.partnerPurchasesAmount?.toFixed(0) ?? 0} € /{' '}
                  {progress?.partnerPurchasesThreshold?.toFixed(0) ?? 0} €
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${partnerPct}%` }]} />
                </View>
              </View>
              <View style={styles.progressBlock}>
                <Text style={styles.progressLabel}>Actions</Text>
                <Text style={styles.progressValue}>
                  {progress?.actions ?? 0} / {progress?.actionsThreshold ?? 0}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${actionsPct}%` }]} />
                </View>
              </View>
            </View>

            <View style={styles.encart}>
              <Text style={styles.encartTitle}>Conditions</Text>
              <Text style={styles.bodyText}>
                La participation gratuite est possible. Pour être éligible au gain, il faut au moins{' '}
                {jackpot.config.minActionsPerUser} action(s)
                {jackpot.config.minPartnerPurchasesPerUser != null
                  ? ` et ${jackpot.config.minPartnerPurchasesPerUser} achat(s) partenaire(s)`
                  : ''}
                .
              </Text>
            </View>

            {stats && (
              <View style={styles.encart}>
                <Text style={styles.encartTitle}>Ta progression</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.bodyText}>Tickets : {stats.tickets}</Text>
                  <Text style={styles.bodyText}>Actions : {stats.actionsCount}</Text>
                  <Text style={styles.bodyText}>
                    Éligible : {stats.isEligible ? 'Oui' : 'Non'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.participateButton}
                onPress={handleParticipate}
                disabled={statsLoading}
                activeOpacity={0.85}
              >
                {statsLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="gift-outline" size={20} color={colors.white} />
                    <Text style={styles.participateButtonText}>Participer gratuitement</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.bodyText}>Aucun jackpot actif pour le moment.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showJackpotInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJackpotInfoModal(false)}>
        <TouchableOpacity
          style={styles.moduleInfoModalOverlay}
          activeOpacity={1}
          onPress={() => setShowJackpotInfoModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.moduleInfoModalBox}>
            <View style={styles.moduleInfoModalHeader}>
              <Text style={styles.moduleInfoModalTitle}>Jackpot KashUP</Text>
              <TouchableOpacity onPress={() => setShowJackpotInfoModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={28} color={colors.textMain} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.moduleInfoModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.moduleIntroTitle}>À quoi ça sert</Text>
              <Text style={styles.moduleIntroBody}>
                Le Jackpot KashUP est une cagnotte commune : en participant (achats partenaires, actions), vous cumulez des tickets pour un tirage et pouvez gagner une part du montant.
              </Text>
              <Text style={styles.moduleIntroTitle}>Comment ça marche</Text>
              <Text style={[styles.moduleIntroBody, { marginBottom: 0 }]}>
                Remplissez les conditions (achats chez les partenaires, nombre d'actions). Plus vous participez, plus vous avez de tickets. Participez gratuitement pour valider votre éligibilité ; le tirage désigne les gagnants.
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slateBackgroundLight,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.md,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    color: colors.accentRed,
    textAlign: 'center',
  },
  moduleInfoTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: Math.max(0, spacing.md - 16),
  },
  moduleInfoTriggerText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  moduleIntroTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  moduleIntroBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  moduleInfoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  moduleInfoModalBox: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxWidth: '100%',
    maxHeight: '80%',
    width: 340,
  },
  moduleInfoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  moduleInfoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  moduleInfoModalScroll: {
    maxHeight: 320,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: 30,
    marginBottom: spacing.md,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  cardTitleOnGold: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cardDescriptionOnGold: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.75)',
    marginBottom: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  amountLabelOnGold: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.75)',
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  amountOnGold: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.black,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  encart: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  encartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  progressBlock: {
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 13,
    color: colors.textMain,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.greyBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  participateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  participateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
