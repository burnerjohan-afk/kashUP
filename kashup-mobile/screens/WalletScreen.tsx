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
import { TabScreenHeader, TAB_HEADER_HEIGHT, TAB_HEADER_TOP_OFFSET } from '@/src/components/TabScreenHeader';
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
  const monthlyInjected = data.wallet?.monthlyInjected ?? personalImpact.monthlyInjected;

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
          { paddingTop: Math.max(0, insets.top - 36) + TAB_HEADER_TOP_OFFSET + TAB_HEADER_HEIGHT + 12 },
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
          <Text style={styles.impactSectionTitle}>Votre impact</Text>
          <Text style={styles.impactSectionIntro}>
            En achetant chez les partenaires KashUP, vous soutenez l’économie locale. Voici ce que vous avez généré.
          </Text>
          <View style={styles.impactCard}>
            <View style={styles.impactCardRow}>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>{formatCurrency(monthlyInjected)}</Text>
                <Text style={styles.impactStatLabel}>Dépensé chez les partenaires ce mois</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>{personalImpact.merchantsHelped}</Text>
                <Text style={styles.impactStatLabel}>Commerces soutenus</Text>
              </View>
            </View>
            <View style={styles.impactCardRow}>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>{personalImpact.purchasesCount}</Text>
                <Text style={styles.impactStatLabel}>Achats effectués</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>
                  {personalImpact.boostRate > 0 ? `+${personalImpact.boostRate.toFixed(0)} %` : '—'}
                </Text>
                <Text style={styles.impactStatLabel}>Taux de cashback moyen</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.impactSectionTitle, styles.impactSectionTitleSecond]}>
            L’impact de toute la communauté KashUP
          </Text>
          <Text style={styles.impactSectionIntro}>
            Ensemble, les membres redonnent du pouvoir d’achat à l’économie locale. Voici les chiffres.
          </Text>
          <View style={styles.impactCard}>
            <View style={styles.impactCardRow}>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>
                  {communityImpact ? formatCurrency(communityImpact.cashbackDistribue) : '—'}
                </Text>
                <Text style={styles.impactStatLabel}>Cashback redistribué ce mois</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>
                  {communityImpact ? formatCurrency(communityImpact.volumeAchat) : '—'}
                </Text>
                <Text style={styles.impactStatLabel}>Volume d’achats cette année</Text>
              </View>
            </View>
            <View style={styles.impactCardRow}>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>
                  {communityImpact != null ? communityImpact.partenairesActifs : '—'}
                </Text>
                <Text style={styles.impactStatLabel}>Commerces partenaires</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactStatValue}>
                  {communityImpact != null ? communityImpact.totalTransactions : '—'}
                </Text>
                <Text style={styles.impactStatLabel}>Transactions réalisées</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.historiqueEncart}>
          <Text style={styles.historiqueEncartTitle}>Historique de vos gains</Text>
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
    minHeight: 118,
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
  historiqueEncart: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  historiqueEncartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.md,
  },
  impactSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: spacing.xs,
  },
  impactSectionTitleSecond: {
    marginTop: spacing.xl,
  },
  impactSectionIntro: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  impactCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(5,163,87,0.2)',
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  impactCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  impactStat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(5,163,87,0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(5,163,87,0.12)',
  },
  impactStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  impactStatLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  impactPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
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

