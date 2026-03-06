import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import type { CagnotteStackParamList } from '../navigation/CagnotteStack';
import { useWallet } from '@/src/hooks/useWallet';
import { TabScreenHeader, TAB_HEADER_HEIGHT } from '@/src/components/TabScreenHeader';
import { useNotifications } from '../context/NotificationsContext';

type WalletTab = 'Coffre-fort' | 'Don' | 'Bons d’achat';

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const formatPoints = (value: number) => `${value.toLocaleString('fr-FR')} pts`;

const formatDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatCashbackAmount = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} €`;
};

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function WalletScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CagnotteStackParamList, 'Wallet'>>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationPress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    tabNav?.navigate('Accueil', { screen: 'Notifications' });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    const tabNav = (navigation as any).getParent?.();
    tabNav?.navigate('Accueil', { screen: 'Profile' });
  }, [navigation]);

  const [walletTab, setWalletTab] = useState<WalletTab>('Coffre-fort');
  const walletSegments: WalletTab[] = ['Coffre-fort', 'Don', 'Bons d’achat'];
  const { data, loading, error, refetch } = useWallet();

  const walletAmount = data.wallet?.soldeCashback ?? 0;
  const walletPoints = data.wallet?.soldePoints ?? 0;
  const transactions = data.history;
  const topTransactions = transactions.slice(0, 4);
  const personalImpact = data.personalImpact;
  const communityImpact = data.communityImpact;
  const monthlyObjective = data.wallet?.monthlyObjective ?? personalImpact.target;
  const monthlyInjected = data.wallet?.monthlyInjected ?? personalImpact.monthlyInjected;
  const personalProgress =
    monthlyObjective > 0 ? Math.min(100, (monthlyInjected / monthlyObjective) * 100) : 0;

  const handleScanQR = useCallback(() => {
    let nav: any = navigation;
    while (nav?.getParent?.()) nav = nav.getParent();
    nav?.navigate('QRScan');
  }, [navigation]);

  const handleWalletTabPress = (tab: WalletTab) => {
    if (tab === 'Coffre-fort') {
      navigation.navigate('CoffreFort');
      return;
    }
    if (tab === 'Don') {
      const parent = navigation.getParent();
      (parent as any)?.navigate('Accueil', { screen: 'Donations' });
      return;
    }
    if (tab === 'Bons d’achat') {
      // Même comportement que l'onglet Bons d'achat sur la page d'accueil : aller à l'onglet Bons d'achat
      let nav: any = navigation;
      while (nav?.getParent?.()) nav = nav.getParent();
      nav?.navigate('Tabs', { screen: "Bons d'achat" });
      return;
    }
    setWalletTab(tab);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <TabScreenHeader
        scrollY={scrollY}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        unreadCount={unreadCount}
      />
      <AnimatedScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(0, insets.top - 36) + TAB_HEADER_HEIGHT + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Ma Cagnotte</Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanQR}
              activeOpacity={0.8}
              accessibilityLabel="Scanner un QR code">
              <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
              <Text style={styles.scanButtonText}>Scan QR</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Votre pouvoir d’achat et votre impact local</Text>
        </View>

        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={refetch} activeOpacity={0.85}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <Text style={styles.errorBannerCta}>Réessayer</Text>
          </TouchableOpacity>
        )}

        <View style={styles.userSummaryContainer}>
          <View style={styles.userSummaryCardWrap}>
            <View style={[styles.cardRing, styles.cardRing1]} />
            <View style={[styles.cardRing, styles.cardRing2]} />
            <View style={[styles.cardRing, styles.cardRing3]} />
            <View style={[styles.cardRing, styles.cardRing4]} />
            <LinearGradient
              colors={['#034d35', '#047857', '#059669', '#047857', '#065f46']}
              locations={[0, 0.25, 0.5, 0.75, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userSummaryCard}>
              <View style={styles.userSummaryTextBlock}>
                <Text style={[styles.userSummaryLabel, styles.userSummaryLabelNowrap]} numberOfLines={1}>Carte{"\u00A0"}UP</Text>
                <Text style={styles.userSummaryAmount}>{formatCurrency(walletAmount)}</Text>
                <Text style={styles.userSummarySubtitle}>C’est le montant disponible grâce à vos achats locaux.</Text>
                <View style={styles.userSummaryPointsRow}>
                  <View style={styles.userSummaryPointsDot} />
                  <Text style={styles.userSummaryPointsLabel}>Points KashUP</Text>
                  <Text style={styles.userSummaryPointsValue}>{formatPoints(walletPoints)}</Text>
                </View>
                {loading && (
                  <View style={styles.userSummaryLoaderRow}>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.userSummaryLoaderText}>Mise à jour des données…</Text>
                  </View>
                )}
              </View>
              <View style={styles.userSummaryTabs}>
                {walletSegments.map((tab) => {
                  const active = tab === walletTab;
                  const isCartesUp = tab === 'Bons d\'achat';
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.userSummaryTab, active && styles.userSummaryTabActive]}
                      onPress={() => handleWalletTabPress(tab)}
                      activeOpacity={0.85}>
                      <Ionicons
                        name={
                          tab === 'Coffre-fort'
                            ? 'lock-closed-outline'
                            : tab === 'Don'
                            ? 'heart-outline'
                            : 'gift-outline'
                        }
                        size={16}
                        color={colors.primaryDark}
                      />
                      <Text style={[styles.userSummaryTabText, active && styles.userSummaryTabTextActive]} numberOfLines={1}>
                        {isCartesUp ? 'Cartes\u00A0UP' : tab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleIconWrap}>
              <Ionicons name="leaf" size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Ton impact local</Text>
          </View>
          <View style={styles.personalImpactCard}>
            <LinearGradient
              colors={['rgba(5,163,87,0.08)', 'rgba(5,163,87,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.personalImpactGradient}
            >
              <View style={styles.personalImpactHeader}>
                <Text style={styles.personalImpactTitle} numberOfLines={2}>
                  Économie locale renforcée
                </Text>
                <View style={styles.personalImpactBadge}>
                  <Ionicons name="trending-up" size={14} color={colors.primary} />
                  <Text style={styles.personalImpactBadgeText}>Actif</Text>
                </View>
              </View>
              <Text style={styles.personalImpactSubtitle} numberOfLines={3}>
                À force d’achats locaux, vous créez un cercle vertueux sur votre territoire.
              </Text>

              <View style={styles.personalHighlightRow}>
                <View style={styles.personalHighlightBlock}>
                  <Ionicons name="wallet-outline" size={18} color={colors.primary} style={styles.kpiIcon} />
                  <Text style={styles.personalHighlightLabel} numberOfLines={1}>Injecté ce mois-ci</Text>
                  <Text style={styles.personalHighlightValue} numberOfLines={1}>{formatCurrency(monthlyInjected)}</Text>
                </View>
                <View style={styles.personalHighlightBlock}>
                  <Ionicons name="flag-outline" size={18} color={colors.primary} style={styles.kpiIcon} />
                  <Text style={styles.personalHighlightLabel} numberOfLines={1}>Objectif KashUP</Text>
                  <Text style={styles.personalHighlightValue} numberOfLines={1}>{formatCurrency(monthlyObjective)}</Text>
                </View>
              </View>

              <View style={styles.personalProgressWrap}>
                <View style={styles.personalProgressTrack}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.personalProgressFill, { width: `${Math.round(personalProgress)}%` }]}
                  />
                </View>
                <Text style={styles.personalProgressLabel}>{Math.round(personalProgress)} %</Text>
              </View>

              <View style={styles.personalKpiRow}>
                <View style={styles.personalKpi}>
                  <View style={styles.personalKpiIconWrap}>
                    <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.personalKpiLabel} numberOfLines={1}>Commerces aidés</Text>
                  <Text style={styles.personalKpiValue} numberOfLines={1}>{personalImpact.merchantsHelped}</Text>
                </View>
                <View style={styles.personalKpi}>
                  <View style={styles.personalKpiIconWrap}>
                    <Ionicons name="cart-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.personalKpiLabel} numberOfLines={1}>Achats locaux</Text>
                  <Text style={styles.personalKpiValue} numberOfLines={1}>{personalImpact.purchasesCount}</Text>
                </View>
                <View style={styles.personalKpi}>
                  <View style={styles.personalKpiIconWrap}>
                    <Ionicons name="flash-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.personalKpiLabel} numberOfLines={1}>Cashback boosté</Text>
                  <Text style={styles.personalKpiValue} numberOfLines={1}>
                    {personalImpact.boostRate > 0 ? `+${personalImpact.boostRate.toFixed(1)} %` : '--'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.kashupImpactCard}>
            <LinearGradient
              colors={['rgba(5,163,87,0.06)', 'rgba(5,163,87,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.kashupImpactGradient}
            >
              <View style={styles.kashupHeaderBlock}>
                <View style={styles.kashupTitleRow}>
                  <View style={styles.kashupTitleIconWrap}>
                    <Ionicons name="people" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.kashupTitle} numberOfLines={2}>L’impact local KashUP</Text>
                </View>
                <View style={styles.kashupPillWrap}>
                  <View style={styles.kashupPill}>
                    <Ionicons name="heart" size={12} color={colors.primary} />
                    <Text style={styles.kashupPillText}>Communauté</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.kashupSubtitle} numberOfLines={3}>
                Ensemble, KashUP et ses membres réinjectent du pouvoir d’achat dans tout l’archipel.
              </Text>
              <View style={styles.kashupHighlightRow}>
                <View style={styles.kashupHighlightBlock}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.kashupBlockIcon} />
                  <Text style={styles.kashupStatLabel} numberOfLines={1}>Ce mois-ci</Text>
                  <Text style={styles.kashupHighlightValue} numberOfLines={1}>
                    {communityImpact ? formatCurrency(communityImpact.cashbackDistribue) : '--'}
                  </Text>
                </View>
                <View style={styles.kashupHighlightBlock}>
                  <Ionicons name="stats-chart-outline" size={20} color={colors.primary} style={styles.kashupBlockIcon} />
                  <Text style={styles.kashupStatLabel} numberOfLines={1}>Cette année</Text>
                  <Text style={styles.kashupHighlightValue} numberOfLines={1}>
                    {communityImpact ? formatCurrency(communityImpact.volumeAchat) : '--'}
                  </Text>
                </View>
              </View>
              <View style={styles.kashupStatGrid}>
                <View style={styles.kashupStatBlock}>
                  <View style={styles.kashupStatTextWrap}>
                    <Text style={styles.kashupStatLabel} numberOfLines={1} ellipsizeMode="tail">Commerces aidés</Text>
                    <Text style={styles.kashupStatValue} numberOfLines={1} ellipsizeMode="tail">
                      {communityImpact ? String(communityImpact.partenairesActifs) : '--'}
                    </Text>
                  </View>
                  <View style={styles.kashupStatIconWrap}>
                    <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                  </View>
                </View>
                <View style={styles.kashupStatBlock}>
                  <View style={styles.kashupStatTextWrap}>
                    <Text style={styles.kashupStatLabel} numberOfLines={1} ellipsizeMode="tail">Transactions</Text>
                    <Text style={styles.kashupStatValue} numberOfLines={1} ellipsizeMode="tail">
                      {communityImpact ? String(communityImpact.totalTransactions) : '--'}
                    </Text>
                  </View>
                  <View style={styles.kashupStatIconWrap}>
                    <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique de vos gains</Text>
          <View style={styles.transactionsWrapper}>
            {topTransactions.length === 0 ? (
              <Text style={styles.placeholderText}>Pas encore de transactions. Lancez un achat local !</Text>
            ) : (
              topTransactions.map((transaction) => {
                const partnerName = transaction.partner?.name ?? 'Partenaire KashUP';
                return (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={styles.transactionLogo}>
                      <Text style={styles.transactionLogoText}>
                        {partnerName.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionPartner}>{partnerName}</Text>
                      <Text style={styles.transactionDate}>{formatDate(transaction.transactionDate)}</Text>
                    </View>
                    <Text style={styles.transactionAmount}>
                      {formatCashbackAmount(transaction.cashbackEarned)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </AnimatedScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  // Aligné sur la page d'accueil : padding bas uniquement, pas de padding horizontal
  scrollContent: {
    paddingBottom: spacing.xl * 3,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textMain,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.greyLight,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  // Carte Carte UP – même design et taille que la page d'accueil
  userSummaryContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  userSummaryCardWrap: {
    aspectRatio: 1.586,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  cardRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
  },
  cardRing1: {
    width: 220,
    height: 220,
    top: '50%',
    left: '50%',
    marginLeft: -110,
    marginTop: -110,
  },
  cardRing2: {
    width: 280,
    height: 280,
    top: '50%',
    left: '50%',
    marginLeft: -140,
    marginTop: -140,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  cardRing3: {
    width: 360,
    height: 360,
    top: '50%',
    left: '50%',
    marginLeft: -180,
    marginTop: -180,
  },
  cardRing4: {
    width: 440,
    height: 440,
    top: '50%',
    left: '50%',
    marginLeft: -220,
    marginTop: -220,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  userSummaryCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  userSummaryTextBlock: {
    gap: spacing.xs,
  },
  userSummaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userSummaryLabelNowrap: {
    flexShrink: 0,
  },
  userSummaryAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.white,
  },
  userSummarySubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  userSummaryPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  userSummaryPointsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentYellow,
  },
  userSummaryPointsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  userSummaryPointsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accentYellow,
  },
  userSummaryLoaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  userSummaryLoaderText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  userSummaryTabs: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: spacing.sm,
    width: '100%',
  },
  userSummaryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  userSummaryTabActive: {
    backgroundColor: colors.white,
  },
  userSummaryTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryDark,
    flexShrink: 0,
  },
  userSummaryTabTextActive: {
    color: colors.primaryDark,
  },
  section: {
    marginTop: spacing.xl * 1.5 - 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  sectionTitleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(5,163,87,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalImpactCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(5,163,87,0.25)',
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  personalImpactGradient: {
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  personalImpactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  personalImpactTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  personalImpactBadge: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5,163,87,0.12)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  personalImpactBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  personalImpactSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  personalHighlightRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  personalHighlightBlock: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(5,163,87,0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(5,163,87,0.15)',
  },
  kpiIcon: {
    marginBottom: spacing.xs,
  },
  personalHighlightLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  personalHighlightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  personalProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  personalProgressTrack: {
    flex: 1,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(5,163,87,0.2)',
    overflow: 'hidden',
  },
  personalProgressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  personalProgressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 44,
    textAlign: 'right',
  },
  personalKpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  personalKpi: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  personalKpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(5,163,87,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  personalKpiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  personalKpiValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textMain,
    marginTop: 2,
  },
  kashupImpactCard: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(5,163,87,0.2)',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  kashupImpactGradient: {
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  kashupHeaderBlock: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  kashupTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kashupTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kashupTitleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(5,163,87,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kashupTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  kashupPillWrap: {
    alignSelf: 'flex-start',
  },
  kashupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(5,163,87,0.12)',
    borderRadius: radius.pill,
  },
  kashupPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kashupSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  kashupHighlightRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  kashupHighlightBlock: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    backgroundColor: 'rgba(5,163,87,0.08)',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(5,163,87,0.12)',
  },
  kashupBlockIcon: {
    marginBottom: spacing.xs,
  },
  kashupHighlightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  kashupStatGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  kashupStatBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    overflow: 'hidden',
  },
  kashupStatTextWrap: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  kashupStatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(5,163,87,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kashupStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  kashupStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
    marginTop: 2,
    textAlign: 'center',
  },
  transactionsWrapper: {
    gap: spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  transactionLogo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryPurple,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionPartner: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  errorBanner: {
    backgroundColor: '#FDECEB',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  errorBannerCta: {
    marginTop: spacing.xs / 2,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  loaderText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  placeholderText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
});

