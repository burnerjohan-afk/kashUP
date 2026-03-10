import Ionicons from '@expo/vector-icons/Ionicons';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Linking, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Offer } from '@/src/services/offers';
import { AdVideoPlayer } from '@/src/components/AdVideoPlayer';
import { normalizeImageUrl } from '@/src/utils/normalizeUrl';
import { useCurrentOffers } from '@/src/hooks/useCurrentOffers';
import { useHomeBanners } from '@/src/hooks/useHomeBanners';
import { usePartners } from '@/src/hooks/usePartners';
import { useUserProfile } from '@/src/hooks/useUserProfile';
import { useWallet } from '@/src/hooks/useWallet';
import { useWebhookEvents } from '@/src/hooks/useWebhookEvents';
import { adaptPartnerFromApi, PartnerViewModel } from '@/src/utils/partnerAdapter';
import { useLotteriesForHome } from '@/src/hooks/useLotteries';
import { useJackpot } from '@/src/hooks/useJackpot';
import LotteryCountdown from '@/src/components/LotteryCountdown';
import { colors, CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, radius, spacing } from '../constants/theme';
import { useNotifications } from '../context/NotificationsContext';
import { HomeStackParamList } from '../navigation/HomeStack';
import { MainStackParamList } from '../navigation/MainStack';
import { navigateToOffresDuMoment } from '../navigation/navigationRef';

// Mapping des partenaires vers images de fond et logos
const getPartnerImage = (partnerName: string, categoryId?: string): string => {
  const name = partnerName.toLowerCase();
  
  // Partenaires spécifiques
  if (name.includes('hitbox')) {
    return 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80'; // Bar
  }
  if (name.includes('palmistes') || name.includes('hotel')) {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'; // Hotel
  }
  if (name.includes('securidom') || name.includes('sécurité')) {
    return 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80'; // Alarme et vidéosurveillance
  }
  if (name.includes('carrefour')) {
    return 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80'; // Supermarché
  }
  
  // Par catégorie
  if (categoryId?.includes('restaurant') || categoryId?.includes('bar')) {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'; // Restaurant
  }
  if (categoryId?.includes('hotel') || categoryId?.includes('hospitality')) {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'; // Hotel
  }
  if (categoryId?.includes('supermarket') || categoryId?.includes('hypermarché')) {
    return 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80'; // Supermarché
  }
  if (categoryId?.includes('service') || categoryId?.includes('sécurité')) {
    return 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80'; // Alarme et vidéosurveillance
  }
  
  // Par défaut
  return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80'; // Commerce générique
};

// Mapping des logos depuis internet
// Priorité: 1) logoUrl de l'API, 2) getPartnerLogo, 3) null
const getPartnerLogo = (partnerName: string, apiLogoUrl?: string | null): string | null => {
  // Priorité 1: Utiliser le logo de l'API (passer par le proxy pour Blob privé)
  if (apiLogoUrl && apiLogoUrl.trim() !== '') {
    return normalizeImageUrl(apiLogoUrl);
  }
  
  // Priorité 2: Logo depuis mapping
  const name = partnerName.toLowerCase();
  
  if (name.includes('carrefour')) {
    return 'https://logos-world.net/wp-content/uploads/2020/11/Carrefour-Logo.png';
  }
  if (name.includes('hitbox')) {
    // Logo générique pour bar - à remplacer plus tard
    return null;
  }
  if (name.includes('palmistes') || name.includes('hotel')) {
    // Logo générique pour hotel - à remplacer plus tard
    return null;
  }
  if (name.includes('securidom')) {
    // Logo générique pour sécurité - à remplacer plus tard
    return null;
  }
  
  return null;
};

type HomeNavProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeLanding'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const HEADER_CONTENT_HEIGHT = 44;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const insets = useSafeAreaInsets();
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((notif) => !notif.read).length;
  const hasActiveNotifications = unreadCount > 0;

  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile();
  const isAuthenticated = profile !== null;

  const {
    data: walletData,
    loading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useWallet();

  const {
    data: partnersData,
    loading: partnersLoading,
    error: partnersError,
    refetch: refetchPartners,
  } = usePartners();
  const { data: homeBanners, loading: bannersLoading, refetch: refetchBanners } = useHomeBanners();
  const { data: currentOffers, refetch: refetchOffers } = useCurrentOffers();
  const { lotteries: homeLotteries, loading: lotteriesLoading, refetch: refetchLotteries } = useLotteriesForHome();
  const { jackpot, refetch: refetchJackpot } = useJackpot();
  const [adIndex, setAdIndex] = useState(0);
  const [highlightedCardTab, setHighlightedCardTab] = useState<'don' | 'cartes' | 'loteries' | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const adIndexRef = useRef(0);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    adIndexRef.current = adIndex;
  }, [adIndex]);

  const goToNextBanner = useCallback(() => {
    if (homeBanners.length <= 1) return;
    const next = (adIndexRef.current + 1) % homeBanners.length;
    scrollViewRef.current?.scrollTo({ x: next * AD_SNAP_INTERVAL, animated: true });
  }, [homeBanners.length]);

  useEffect(() => {
    if (adTimerRef.current) {
      clearTimeout(adTimerRef.current);
      adTimerRef.current = null;
    }
    if (homeBanners.length === 0) return;
    const current = homeBanners[adIndex];
    if (current?.mediaType === 'image') {
      adTimerRef.current = setTimeout(goToNextBanner, 5000);
    }
    return () => {
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, [adIndex, homeBanners, goToNextBanner]);

  useWebhookEvents({
    onPartnersChanged: refetchPartners,
    onOffersChanged: () => {
      refetchPartners();
      refetchOffers();
    },
  });

  const isFirstFocusPartners = React.useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusPartners.current) {
        isFirstFocusPartners.current = false;
        return;
      }
      refetchPartners();
    }, [refetchPartners])
  );

  const partners = useMemo<PartnerViewModel[]>(
    () => partnersData.partners.map(adaptPartnerFromApi),
    [partnersData.partners]
  );

  // Vérifier si des partenaires ont des coordonnées géographiques
  const hasPartnersWithLocation = useMemo(
    () => partners.some((p) => p.latitude != null && p.longitude != null),
    [partners]
  );

  // Les pépites KashUP - partenaires avec pepites ou isRecommended
  const pepites = useMemo(
    () =>
      partners
        .filter(
          (partner) =>
            partner.marketingPrograms?.includes('pepites') === true || partner.isRecommended === true
        )
        .slice(0, 5),
    [partners]
  );

  // Les partenaires boostés - partenaires avec boosted ou isBoosted (boostable en back office)
  const boosted = useMemo(
    () =>
      partners
        .filter(
          (partner) =>
            partner.marketingPrograms?.includes('boosted') === true || partner.isBoosted === true
        )
        .slice(0, 8),
    [partners]
  );

  // Les plus gros cashback - triés par tauxCashbackBase réel de l'API
  const topCashback = useMemo(
    () =>
      partners
        .filter((partner) => partner.cashbackRate != null && partner.cashbackRate > 0)
        .sort((a, b) => b.cashbackRate - a.cashbackRate)
        .slice(0, 8),
    [partners]
  );

  // Les partenaires populaires - most-searched ou isPopular (même critère que la pastille "Populaire")
  const popularPartners = useMemo(
    () =>
      partners
        .filter(
          (partner) =>
            partner.marketingPrograms?.includes('most-searched') === true || partner.isPopular === true
        )
        .slice(0, 12),
    [partners]
  );

  // Grille 5 encarts par ligne : largeur calculée pour garantir exactement 5 colonnes
  const { width: screenWidth } = useWindowDimensions();
  const SECTION_PADDING = spacing.lg * 2;
  const POPULAR_GRID_GAP = spacing.md;
  const POPULAR_COLS = 5;
  const popularItemSize = (screenWidth - SECTION_PADDING - (POPULAR_COLS - 1) * POPULAR_GRID_GAP) / POPULAR_COLS;

  const refreshing = profileLoading || walletLoading || partnersLoading || bannersLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchProfile(), refetchWallet(), refetchPartners(), refetchBanners(), refetchOffers(), refetchLotteries(), refetchJackpot()]);
  }, [refetchProfile, refetchWallet, refetchPartners, refetchBanners, refetchOffers, refetchLotteries, refetchJackpot]);

  const handlePartnerPress = (partnerId: string) => {
    navigation.navigate('PartnerDetail', { partnerId });
  };

  const handleDiscoverPress = () => {
    const parent = navigation.getParent();
    (parent as any)?.navigate('Partenaires', { openNearby: true, nearbyRadiusKm: 10 });
  };

  const handleSeeAllOffersPress = () => {
    navigateToOffresDuMoment();
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  const handleDonPress = () => {
    setHighlightedCardTab('don');
    navigation.navigate('Donations' as never);
  };

  const handleGiftCardsPress = () => {
    setHighlightedCardTab('cartes');
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('Tabs', { screen: 'Bons d\'achat' });
    }
  };

  const handleLotteryPress = () => {
    setHighlightedCardTab('loteries');
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('Tabs', { screen: 'Rewards', params: { initialTab: 'lotteries' } });
    }
  };

  const handleJackpotPress = () => {
    navigation.navigate('Jackpot' as never);
  };

  // Formatage des montants
  const formatCashback = (amount: number | null | undefined): string => {
    if (amount == null) return '';
    return `${amount.toFixed(2)} €`.replace('.', ',');
  };

  const formatPoints = (points: number | null | undefined): string => {
    if (points == null) return '';
    return points.toLocaleString('fr-FR');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      {/* HEADER FIXE */}
      <View style={[styles.header, { paddingTop: Math.max(0, insets.top - 36) + 38 }]}>
        <View style={styles.headerTitleBlock}>
          <Image
            source={require('../assets/images/logo-kashup-up.png')}
            style={styles.appTitleLogo}
            resizeMode="contain"
          />
          <Text style={styles.appTitle}>KashUP</Text>
        </View>
        <View style={styles.headerIcons}>
          {/* Recherche partenaire */}
          <TouchableOpacity
            style={styles.headerIcon}
            activeOpacity={0.7}
            onPress={() => setSearchModalVisible(true)}>
            <Ionicons name="search-outline" size={24} color={colors.textMain} />
          </TouchableOpacity>
          {/* Notifications - TOUJOURS visible, badge uniquement si actives */}
          <TouchableOpacity
            style={styles.headerIcon}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.textMain} />
            {hasActiveNotifications && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Profil utilisateur - TOUJOURS visible */}
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} onPress={handleProfilePress}>
            <Ionicons name="person-circle-outline" size={24} color={colors.textMain} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(0, insets.top - 36) + 38 + HEADER_CONTENT_HEIGHT + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {/* Carte Mon KashUP — forme carte bancaire + fond type vagues/ malachite */}
        <View style={styles.userSummaryContainer}>
          <View style={styles.userSummaryCardWrap}>
            {/* Vagues concentriques (anneaux) en arrière-plan */}
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
              <Text style={styles.userSummaryAmount}>
                {walletData.wallet?.soldeCashback != null
                  ? formatCashback(walletData.wallet.soldeCashback)
                  : '0,00 €'}
              </Text>
              <Text style={styles.userSummarySubtitle}>C'est le montant disponible grâce à vos achats locaux.</Text>
              <View style={styles.userSummaryPointsRow}>
                <View style={styles.userSummaryPointsDot} />
                <Text style={styles.userSummaryPointsLabel}>Points KashUP</Text>
                <Text style={styles.userSummaryPointsValue}>
                  {walletData.wallet?.soldePoints != null
                    ? formatPoints(walletData.wallet.soldePoints)
                    : '0'}
                </Text>
              </View>
            </View>
            <View style={styles.userSummaryTabs}>
              <TouchableOpacity
                style={[styles.userSummaryTab, highlightedCardTab === 'don' && styles.userSummaryTabActive]}
                onPress={handleDonPress}
                activeOpacity={0.85}>
                <Ionicons name="heart-outline" size={16} color={colors.primaryDark} />
                <Text style={[styles.userSummaryTabText, highlightedCardTab === 'don' && styles.userSummaryTabTextActive]} numberOfLines={1}>Don</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.userSummaryTab, highlightedCardTab === 'cartes' && styles.userSummaryTabActive]}
                onPress={handleGiftCardsPress}
                activeOpacity={0.85}>
                <Ionicons name="gift-outline" size={16} color={colors.primaryDark} />
                <Text style={[styles.userSummaryTabText, highlightedCardTab === 'cartes' && styles.userSummaryTabTextActive]} numberOfLines={1}>Cartes{"\u00A0"}UP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.userSummaryTab, highlightedCardTab === 'loteries' && styles.userSummaryTabActive]}
                onPress={handleLotteryPress}
                activeOpacity={0.85}>
                <Ionicons name="trophy-outline" size={16} color={colors.primaryDark} />
                <Text style={[styles.userSummaryTabText, highlightedCardTab === 'loteries' && styles.userSummaryTabTextActive]} numberOfLines={1}>Loteries</Text>
              </TouchableOpacity>
            </View>
            </LinearGradient>
          </View>
        </View>

        {/* Espace publicité — défilement horizontal images/vidéos, snap une image */}
        {homeBanners.length > 0 && (
          <View style={styles.adsSection}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              snapToInterval={AD_SNAP_INTERVAL}
              snapToAlignment="start"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / AD_SNAP_INTERVAL);
                if (index >= 0 && index < homeBanners.length && index !== adIndex) setAdIndex(index);
              }}
              scrollEventThrottle={16}
              contentContainerStyle={styles.adsScrollContent}>
              {homeBanners.map((banner, index) => {
                const imageUri = banner.imageUrl ? normalizeImageUrl(banner.imageUrl) : null;
                const videoUri = banner.videoUrl ? normalizeImageUrl(banner.videoUrl) : null;
                const onPress = () => {
                  if (banner.linkUrl) Linking.openURL(banner.linkUrl);
                };
                const isVideoActive = index === adIndex && banner.mediaType === 'video' && videoUri;
                return (
                  <TouchableOpacity
                    key={banner.id}
                    style={styles.adCard}
                    onPress={onPress}
                    activeOpacity={0.9}>
                    {banner.mediaType === 'video' && videoUri ? (
                      <View style={styles.adMediaContainer}>
                        {isVideoActive ? (
                          <AdVideoPlayer
                            videoUri={videoUri}
                            bannerId={banner.id}
                            shouldPlay
                            style={styles.adImage}
                            onPlaybackStatusUpdate={(status) => {
                              if (status.isLoaded && status.didJustFinishAndNotLoop) {
                                goToNextBanner();
                              }
                            }}
                          />
                        ) : (
                          <View style={styles.adPlaceholder}>
                            <Ionicons name="videocam-outline" size={40} color={colors.textSecondary} />
                          </View>
                        )}
                      </View>
                    ) : imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.adImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.adPlaceholder}>
                        <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                      </View>
                    )}
                    {banner.title ? (
                      <Text style={styles.adTitle} numberOfLines={1}>{banner.title}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {/* Points de pagination */}
            <View style={styles.adsPagination}>
              {homeBanners.map((_, i) => (
                <View
                  key={i}
                  style={[styles.adsDot, i === adIndex && styles.adsDotActive]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Bloc Jackpot — compact, dégradé doré, texte vert */}
        {jackpot && (
          <TouchableOpacity
            style={styles.jackpotBlock}
            onPress={handleJackpotPress}
            activeOpacity={0.92}>
            <LinearGradient
              colors={['#ffd700', '#ffd700', '#ffd700', '#e6c200']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.jackpotCard}>
              <View style={styles.jackpotRow}>
                <View style={styles.jackpotLeft}>
                  <View style={styles.jackpotTitleRow}>
                    <Ionicons name="trophy" size={18} color={colors.black} />
                    <Text style={styles.jackpotLabel}>JACKPOT KASHUP</Text>
                  </View>
                  <Text style={styles.jackpotAmount}>
                    {jackpot.currentAmount.toFixed(0)} {jackpot.currency}
                  </Text>
                </View>
                <View style={styles.jackpotRight}>
                  <View style={styles.jackpotProgressMini}>
                    <Text style={styles.jackpotProgressLabel}>Achats chez partenaires</Text>
                    <Text style={styles.jackpotProgressValue} numberOfLines={1}>
                      {jackpot.progress.partnerPurchasesAmount.toFixed(0)} € / {jackpot.progress.partnerPurchasesThreshold.toFixed(0)} €
                    </Text>
                    <View style={styles.jackpotProgressBarBg}>
                      <View style={[styles.jackpotProgressBarFill, { width: `${Math.min(100, jackpot.progress.partnerPurchasesThreshold > 0 ? (jackpot.progress.partnerPurchasesAmount / jackpot.progress.partnerPurchasesThreshold) * 100 : 0)}%` }]} />
                    </View>
                  </View>
                  <View style={[styles.jackpotProgressMini, { marginBottom: 8 }]}>
                    <Text style={styles.jackpotProgressLabel}>Participations (loteries, défis)</Text>
                    <Text style={styles.jackpotProgressValue} numberOfLines={1}>
                      {jackpot.progress.actions} / {jackpot.progress.actionsThreshold}
                    </Text>
                    <View style={styles.jackpotProgressBarBg}>
                      <View style={[styles.jackpotProgressBarFill, { width: `${Math.min(100, jackpot.progress.actionsThreshold > 0 ? (jackpot.progress.actions / jackpot.progress.actionsThreshold) * 100 : 0)}%` }]} />
                    </View>
                  </View>
                  <View style={styles.jackpotCtaRow}>
                    <Text style={styles.jackpotCtaText}>Voir</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.black} />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Loteries KashUP — triées de la date de tirage la plus proche à la plus éloignée */}
        {homeLotteries.length > 0 && (
          <View style={styles.offresSection}>
            <View style={styles.offresSectionHeader}>
              <Text style={styles.offresSectionTitle}>Loteries KashUP</Text>
              <TouchableOpacity onPress={handleLotteryPress} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.offresSeeAll}>Voir les loteries</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offresCarousel}
              snapToInterval={OFFER_CARD_WIDTH + spacing.md}
              snapToAlignment="start"
              decelerationRate="fast">
              {homeLotteries.map((lottery) => (
                <TouchableOpacity
                  key={lottery.id}
                  style={[styles.offreCard, styles.lotteryHomeCardWrap]}
                  activeOpacity={0.9}
                  onPress={() => {
                    const tabNav = navigation.getParent()?.getParent?.();
                    (tabNav as any)?.navigate?.('Rewards', {
                      screen: 'LotteryDetail',
                      params: { lotteryId: lottery.id, lottery },
                    });
                  }}>
                  {lottery.imageUrl ? (
                    <Image
                      source={{ uri: normalizeImageUrl(lottery.imageUrl) }}
                      style={styles.lotteryHomeImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.lotteryHomeImagePlaceholder}>
                      <Ionicons name="ticket-outline" size={28} color={colors.greyInactive} />
                    </View>
                  )}
                  <View style={styles.lotteryHomeBody}>
                    <Text style={styles.lotteryHomeTitle} numberOfLines={2}>{lottery.title}</Text>
                    <Text style={styles.lotteryHomePts}>{lottery.pointsPerTicket ?? 100} pts / ticket</Text>
                    {lottery.isTicketStockLimited && lottery.ticketsRemaining != null && (
                      <Text style={styles.lotteryHomeRest}>
                        {lottery.ticketsRemaining <= 0 ? 'Épuisé' : `${lottery.ticketsRemaining} restants`}
                      </Text>
                    )}
                    {lottery.drawDate && (
                      <LotteryCountdown drawDate={lottery.drawDate} showIcon={true} textStyle={styles.lotteryHomeCountdown} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Carousel Offres du moment — juste au-dessus de "Trouvez les partenaires autour de vous" */}
        {currentOffers.length > 0 && (
          <View style={styles.offresSection}>
            <View style={styles.offresSectionHeader}>
              <Text style={styles.offresSectionTitle}>Offres du moment</Text>
              <TouchableOpacity onPress={handleSeeAllOffersPress} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.offresSeeAll}>Voir toutes les offres</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offresCarousel}
              snapToInterval={OFFER_CARD_WIDTH + spacing.md}
              snapToAlignment="start"
              decelerationRate="fast">
              {currentOffers.map((offer) => {
                const imageUri = offer.imageUrl ? normalizeImageUrl(offer.imageUrl) : null;
                const partnerLogoUri = offer.partner?.logoUrl ? normalizeImageUrl(offer.partner.logoUrl) : null;
                const partnerName = offer.partner?.name ?? 'Partenaire';
                const stockTotal = offer.stock ?? 0;
                const stockUsed = offer.stockUsed ?? 0;
                const restantes = Math.max(0, stockTotal - stockUsed);
                const restantesRatio = stockTotal > 0 ? restantes / stockTotal : 1;
                const restantesVariant = restantesRatio > 0.5 ? 'green' : restantesRatio > 0.25 ? 'orange' : 'red';
                const restantesBg = restantesVariant === 'green' ? `${colors.primary}14` : restantesVariant === 'orange' ? 'rgba(234, 88, 12, 0.18)' : 'rgba(185, 28, 28, 0.18)';
                const restantesColor = restantesVariant === 'green' ? colors.primary : restantesVariant === 'orange' ? '#EA580C' : '#B91C1C';
                const price = offer.price != null ? `${Number(offer.price).toFixed(2)} €` : null;
                const cashbackRate = offer.cashbackRate != null ? Number(offer.cashbackRate) : null;
                const hasCashback = cashbackRate != null && cashbackRate >= 0;
                const formatDate = (iso: string) => {
                  try {
                    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                  } catch {
                    return iso;
                  }
                };
                return (
                  <TouchableOpacity
                    key={offer.id}
                    style={styles.offreCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (offer.partnerId) {
                        navigation.navigate('PartnerDetail', { partnerId: offer.partnerId });
                      } else {
                        handleSeeAllOffersPress();
                      }
                    }}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.offreCardImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.offreCardImagePlaceholder}>
                        <Ionicons name="pricetag-outline" size={28} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.offreCardBody}>
                      <Text style={styles.offreCardTitle} numberOfLines={2}>{offer.title}</Text>
                      {offer.subtitle ? (
                        <Text style={styles.offreCardSubtitle} numberOfLines={1}>{offer.subtitle}</Text>
                      ) : null}
                      <Text style={styles.offreCardPartner}>{partnerName}</Text>
                      <View style={styles.offrePriceCashbackRow}>
                        {price ? <Text style={styles.offreCardPrice}>{price}</Text> : null}
                        <View style={styles.offreCashbackItem}>
                          <Ionicons name="pricetag" size={11} color={hasCashback ? '#05A357' : colors.textSecondary} />
                          <Text style={[styles.offreCashbackRate, !hasCashback && styles.offreCashbackRateEmpty]}>
                            {hasCashback ? `${cashbackRate}%` : '—'}
                          </Text>
                          <Text style={styles.offreCashbackLabel}>{hasCashback ? "À l'achat" : 'Non renseigné'}</Text>
                        </View>
                      </View>
                      {stockTotal > 0 && (
                        <View style={[styles.offreRestantesBlock, { backgroundColor: restantesBg }]}>
                          <Text style={[styles.offreRestantesCount, { color: restantesColor }]}>{restantes}</Text>
                          <Text style={styles.offreRestantesLabel}>restante{restantes !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                      {offer.conditions ? (
                        <Text style={styles.offreCardConditions} numberOfLines={1}>{offer.conditions}</Text>
                      ) : null}
                      <View style={styles.offreLogoAndDatesRow}>
                        <Text style={styles.offreCardDates}>
                          Du {formatDate(offer.startsAt)} au {formatDate(offer.endsAt)}
                        </Text>
                        {partnerLogoUri ? (
                          <Image source={{ uri: partnerLogoUri }} style={styles.offrePartnerLogo} resizeMode="contain" />
                        ) : (
                          <View style={styles.offrePartnerLogoPlaceholder}>
                            <Text style={styles.offrePartnerLogoPlaceholderText} numberOfLines={1}>{partnerName.slice(0, 2).toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Encart "Trouvez les partenaires autour de vous" */}
        {hasPartnersWithLocation && partners.length > 0 && (
          <View style={styles.partnersNearbyContainer}>
            <TouchableOpacity style={styles.partnersNearbyCard} activeOpacity={0.85} onPress={handleDiscoverPress}>
              <View style={styles.partnersNearbyContent}>
                <Ionicons name="location" size={24} color={colors.primary} />
                <View style={styles.partnersNearbyText}>
                  <Text style={styles.partnersNearbyTitle}>Trouvez les partenaires autour de vous</Text>
                  <Text style={styles.partnersNearbySubtitle}>Découvrez les bons plans près de chez vous</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Gestion des erreurs */}
        {partnersError && (
          <TouchableOpacity style={styles.errorBanner} onPress={refetchPartners} activeOpacity={0.85}>
            <Text style={styles.errorBannerText}>{partnersError}</Text>
            <Text style={styles.errorBannerCta}>Réessayer</Text>
          </TouchableOpacity>
        )}

        {/* SECTION 1 - LES PÉPITES KASHUP - si données présentes */}
        {pepites.length > 0 && (
          <Section
            title="Les pépites KashUP"
            subtitle="Nos meilleures adresses, sélectionnées avec soin"
            loading={partnersLoading}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.premiumCarousel}
              decelerationRate="fast"
              snapToInterval={PEPITE_CARD_WIDTH + spacing.lg}
              snapToAlignment="start"
              >
              {pepites.map((partner) => (
                <PepiteCard key={partner.id} partner={partner} onPress={() => handlePartnerPress(partner.id)} />
              ))}
            </ScrollView>
          </Section>
        )}

        {/* SECTION 2 - LES PARTENAIRES BOOSTÉS - si données présentes */}
        {boosted.length > 0 && (
          <Section
            title="Les partenaires boostés"
            subtitle="Offres spéciales avec cashback augmenté"
            loading={partnersLoading}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.premiumCarousel}
              decelerationRate="fast"
              snapToInterval={PEPITE_CARD_WIDTH + spacing.lg}
              snapToAlignment="start"
              >
              {boosted.map((partner) => (
                <BoostedCard key={partner.id} partner={partner} onPress={() => handlePartnerPress(partner.id)} />
              ))}
            </ScrollView>
          </Section>
        )}

        {/* SECTION 3 - LES PARTENAIRES POPULAIRES - grille 5 par ligne */}
        {popularPartners.length > 0 && (
          <Section
            title="Les partenaires populaires"
            subtitle="Les plus recherchés par les utilisateurs KashUP"
            loading={partnersLoading}>
            <View style={styles.popularGridContainer}>
              {popularPartners.map((partner) => (
                <View key={partner.id} style={[styles.popularGridItem, { width: popularItemSize }]}>
                  <MostSearchedCard
                    partner={partner}
                    onPress={() => handlePartnerPress(partner.id)}
                    cardStyle={styles.logoOnlyCardInGrid}
                  />
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* SECTION 4 - LES PLUS GROS CASHBACK - UNIQUEMENT si données présentes */}
        {topCashback.length > 0 && (
          <Section
            title="Les plus gros cash back"
            subtitle="Faites le maximum d'économies dès aujourd'hui"
            loading={partnersLoading}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cashbackCarousel}
              decelerationRate="fast">
              {topCashback.map((partner) => (
                <CashbackCard key={partner.id} partner={partner} onPress={() => handlePartnerPress(partner.id)} />
              ))}
            </ScrollView>
          </Section>
        )}

        {/* CTA - Voir tous les partenaires */}
        <View style={styles.ctaPartnersWrap}>
          <TouchableOpacity
            style={styles.ctaPartnersButton}
            activeOpacity={0.85}
            onPress={() => {
              const parent = navigation.getParent();
              (parent as any)?.navigate('Partenaires');
            }}>
            <LinearGradient
              colors={[...CARD_GRADIENT_COLORS]}
              locations={[...CARD_GRADIENT_LOCATIONS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaPartnersGradient}>
              <Text style={styles.ctaPartnersText}>Voir tous les partenaires</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal recherche partenaire */}
      <Modal
        visible={searchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchModalVisible(false)}>
        <TouchableOpacity
          style={styles.searchModalOverlay}
          activeOpacity={1}
          onPress={() => setSearchModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.searchModalContent}>
            <Text style={styles.searchModalTitle}>Rechercher un partenaire</Text>
            <TextInput
              style={styles.searchModalInput}
              placeholder="Nom du partenaire..."
              placeholderTextColor={colors.textSecondary}
              value={homeSearchQuery}
              onChangeText={setHomeSearchQuery}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => {
                setSearchModalVisible(false);
                const parent = navigation.getParent();
                (parent as any)?.navigate('Partenaires', { initialSearch: homeSearchQuery.trim() });
                setHomeSearchQuery('');
              }}
            />
            <View style={styles.searchModalButtons}>
              <TouchableOpacity style={styles.searchModalButtonCancel} onPress={() => setSearchModalVisible(false)}>
                <Text style={styles.searchModalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchModalButtonSearch}
                onPress={() => {
                  setSearchModalVisible(false);
                  const parent = navigation.getParent();
                  (parent as any)?.navigate('Partenaires', { initialSearch: homeSearchQuery.trim() });
                  setHomeSearchQuery('');
                }}>
                <Text style={styles.searchModalButtonSearchText}>Rechercher</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// Bloc d’affichage des taux cashback permanent et de bienvenue (chips esthétiques)
function CashbackRatesBlock({
  permanentRate,
  welcomeRate,
  compact,
}: {
  permanentRate?: number | null;
  welcomeRate?: number | null;
  compact?: boolean;
}) {
  const hasPermanent = permanentRate != null && permanentRate >= 0;
  const hasWelcome = welcomeRate != null && welcomeRate >= 0;
  if (!hasPermanent && !hasWelcome) return null;
  return (
    <View style={[styles.cashbackRatesBlock, compact && styles.cashbackRatesBlockCompact]}>
      {hasPermanent && (
        <View style={styles.cashbackItem}>
          <Ionicons name="pricetag" size={12} color="#05A357" />
          <Text style={styles.cashbackRate}>{permanentRate}%</Text>
          <Text style={styles.cashbackItemLabel}>Permanent</Text>
        </View>
      )}
      {hasPermanent && hasWelcome && <View style={styles.cashbackDivider} />}
      {hasWelcome && (
        <View style={styles.cashbackItem}>
          <Ionicons name="gift" size={12} color="#7C3AED" />
          <Text style={[styles.cashbackRate, styles.cashbackRateWelcome]}>{welcomeRate}%</Text>
          <Text style={styles.cashbackItemLabel}>Bienvenue</Text>
        </View>
      )}
    </View>
  );
}

// Carte Pépite - style Uber Eats : image en haut, logo au centre, bloc blanc en dessous
function PepiteCard({ partner, onPress }: { partner: PartnerViewModel; onPress: () => void }) {
  const [logoError, setLogoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const backgroundImage = getPartnerImage(partner.name, partner.categoryId);
  const partnerLogo = getPartnerLogo(partner.name, partner.logoUrl);

  return (
    <TouchableOpacity style={styles.pepiteCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.pepiteImageWrap}>
        {!imageError && (
          <Image
            source={{ uri: backgroundImage }}
            style={styles.pepiteBackgroundImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
        <View style={styles.pepiteLogoCenter} pointerEvents="none">
          {partnerLogo && !logoError ? (
            <Image
              source={{ uri: partnerLogo }}
              style={styles.pepiteLogoCenterImage}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text style={styles.pepiteLogoCenterInitials}>{partner.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        {(partner.marketingPrograms?.includes('pepites') || partner.isRecommended) && (
          <View style={styles.pepiteBadgeOnImage}>
            <Ionicons name="star" size={10} color={colors.accentYellow} />
            <Text style={styles.pepiteBadgeOnImageText}>Pépite</Text>
          </View>
        )}
      </View>
      {/* Bloc blanc en dessous */}
      <View style={styles.pepiteCardContent}>
        <Text style={styles.pepiteNameBlack} numberOfLines={2}>
          {partner.name}
        </Text>
        {(partner.city || partner.country) && (
          <Text style={styles.pepiteLocationGray} numberOfLines={1}>
            {[partner.city, partner.country].filter(Boolean).join(', ')}
          </Text>
        )}
        <CashbackRatesBlock permanentRate={partner.permanentOffer?.rate} welcomeRate={partner.welcomeOffer?.rate} />
        {typeof partner.pointsPerTransaction === 'number' && partner.pointsPerTransaction > 0 && (
          <View style={styles.pointsBlock}>
            <Ionicons name="star" size={10} color={colors.accentYellow} />
            <Text style={styles.pointsValue}>{partner.pointsPerTransaction} pts</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Carte Partenaire boosté - même style que Pépite, logo au centre, badge "Boosté"
function BoostedCard({ partner, onPress }: { partner: PartnerViewModel; onPress: () => void }) {
  const [logoError, setLogoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const backgroundImage = getPartnerImage(partner.name, partner.categoryId);
  const partnerLogo = getPartnerLogo(partner.name, partner.logoUrl);

  return (
    <TouchableOpacity style={styles.pepiteCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.pepiteImageWrap}>
        {!imageError && (
          <Image
            source={{ uri: backgroundImage }}
            style={styles.pepiteBackgroundImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
        <View style={styles.pepiteLogoCenter} pointerEvents="none">
          {partnerLogo && !logoError ? (
            <Image
              source={{ uri: partnerLogo }}
              style={styles.pepiteLogoCenterImage}
              resizeMode="contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text style={styles.pepiteLogoCenterInitials}>{partner.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        {(partner.marketingPrograms?.includes('boosted') || partner.isBoosted) && (
          <View style={styles.boostedBadgeOnImage}>
            <Ionicons name="flash" size={10} color={colors.white} />
            <Text style={styles.boostedBadgeOnImageText}>Boosté</Text>
          </View>
        )}
      </View>
      <View style={styles.pepiteCardContent}>
        <Text style={styles.pepiteNameBlack} numberOfLines={2}>
          {partner.name}
        </Text>
        {(partner.city || partner.country) && (
          <Text style={styles.pepiteLocationGray} numberOfLines={1}>
            {[partner.city, partner.country].filter(Boolean).join(', ')}
          </Text>
        )}
        <CashbackRatesBlock permanentRate={partner.permanentOffer?.rate} welcomeRate={partner.welcomeOffer?.rate} />
        {typeof partner.pointsPerTransaction === 'number' && partner.pointsPerTransaction > 0 && (
          <View style={styles.pointsBlock}>
            <Ionicons name="star" size={10} color={colors.accentYellow} />
            <Text style={styles.pointsValue}>{partner.pointsPerTransaction} pts</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Carte Cashback - logo uniquement + nom en dessous (sans image de fond)
function CashbackCard({ partner, onPress }: { partner: PartnerViewModel; onPress: () => void }) {
  const [logoError, setLogoError] = useState(false);
  const partnerLogo = getPartnerLogo(partner.name, partner.logoUrl);

  return (
    <TouchableOpacity style={styles.logoOnlyCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.logoEncart}>
        <View style={[styles.logoOnlyLogoWrap, { backgroundColor: colors.white }]}>
          {partnerLogo && !logoError ? (
            <Image
              source={{ uri: partnerLogo }}
              style={styles.logoOnlyLogo}
              resizeMode="cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text style={styles.logoOnlyInitials}>{partner.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Carte Partenaires populaires - logo seul (sans nom en dessous)
function MostSearchedCard({ partner, onPress, cardStyle }: { partner: PartnerViewModel; onPress: () => void; cardStyle?: object }) {
  const [logoError, setLogoError] = useState(false);
  const partnerLogo = getPartnerLogo(partner.name, partner.logoUrl);

  return (
    <TouchableOpacity style={[styles.logoOnlyCard, cardStyle]} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.logoEncart}>
        <View style={[styles.logoOnlyLogoWrap, { backgroundColor: colors.white }]}>
          {partnerLogo && !logoError ? (
            <Image
              source={{ uri: partnerLogo }}
              style={styles.logoOnlyLogo}
              resizeMode="cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Text style={styles.logoOnlyInitials}>{partner.name.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

type SectionProps = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  children: React.ReactNode;
};

function Section({ title, subtitle, loading, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator style={styles.sectionLoader} color={colors.primary} size="large" />
      ) : (
        children
      )}
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PEPITE_CARD_WIDTH = 260;
const OFFER_CARD_WIDTH = 280;
const AD_PEEK = 20;
const AD_CARD_WIDTH = SCREEN_WIDTH - 2 * AD_PEEK;
const AD_CARD_HEIGHT = 280;
const AD_GAP = 10;
const AD_SNAP_INTERVAL = AD_CARD_WIDTH + AD_GAP;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 0,
    paddingRight: spacing.lg,
    paddingBottom: 0,
    backgroundColor: colors.white,
  },
  headerTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textMain,
    letterSpacing: -1,
    marginLeft: -4,
  },
  appTitleLogo: {
    height: 48,
    width: 96,
    marginRight: 0,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  // Section Résumé Utilisateur - Identique à Ma cagnotte
  userSummaryContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  adsSection: {
    marginBottom: spacing.lg,
  },
  adsScrollContent: {
    paddingHorizontal: AD_PEEK,
    paddingVertical: spacing.xs,
    paddingRight: AD_PEEK + AD_GAP,
  },
  adCard: {
    width: AD_CARD_WIDTH,
    height: AD_CARD_HEIGHT,
    marginRight: AD_GAP,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.greyLight,
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adMediaContainer: {
    width: '100%',
    height: '100%',
  },
  adPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  adTitle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  adsPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  adsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(107, 107, 107, 0.4)',
  },
  adsDotActive: {
    backgroundColor: colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
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
  // Onglets intégrés dans le card (style Ma cagnotte)
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
    borderWidth: 2,
    borderColor: colors.primary,
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
  // Offres du moment (carousel)
  offresSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  offresSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  offresSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  offresSeeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  offresCarousel: {
    paddingRight: spacing.lg,
  },
  offreCard: {
    width: OFFER_CARD_WIDTH,
    marginRight: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  lotteryHomeCardWrap: {
    width: OFFER_CARD_WIDTH,
    marginRight: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  lotteryHomeImage: {
    width: '100%',
    height: 88,
    backgroundColor: colors.greyLight,
  },
  lotteryHomeImagePlaceholder: {
    width: '100%',
    height: 88,
    backgroundColor: colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotteryHomeBody: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  lotteryHomeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
  },
  lotteryHomePts: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  lotteryHomeRest: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  lotteryHomeCountdown: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  offreCardImage: {
    width: '100%',
    height: 100,
    backgroundColor: colors.greyLight,
  },
  offreCardImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offreCardBody: {
    padding: spacing.sm,
    paddingBottom: 4,
  },
  offreCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 2,
  },
  offreCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  offreCardPartner: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  offrePriceCashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    marginBottom: 2,
  },
  offreCardPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
  },
  offreCashbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offreCashbackRate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#05A357',
  },
  offreCashbackRateEmpty: {
    color: colors.textSecondary,
  },
  offreCashbackLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  offreRestantesBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 8,
    marginBottom: -8,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  offreRestantesCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  offreRestantesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMain,
  },
  offreLogoAndDatesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 0,
    marginTop: 4,
    gap: spacing.sm,
  },
  offrePartnerLogo: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.greyLight,
  },
  offrePartnerLogoPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.greyBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offrePartnerLogoPlaceholderText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  offreCardDates: {
    fontSize: 10,
    color: colors.textTertiary,
    flex: 1,
    textAlign: 'left',
  },
  offreCardConditions: {
    fontSize: 10,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  // Encart partenaires autour de vous
  partnersNearbyContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  partnersNearbyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md + 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  partnersNearbyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  partnersNearbyText: {
    flex: 1,
  },
  partnersNearbyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.xs / 2,
  },
  partnersNearbySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Sections
  section: {
    marginTop: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  sectionLoader: {
    marginVertical: spacing.xl * 2,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
  },
  errorBannerCta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  // Pépites - style Uber Eats (image en haut, bloc blanc en dessous)
  premiumCarousel: {
    paddingRight: spacing.lg,
  },
  pepiteCard: {
    width: PEPITE_CARD_WIDTH,
    marginRight: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  pepiteImageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: colors.greyLight,
    position: 'relative',
  },
  pepiteBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  pepiteLogoCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pepiteLogoCenterImage: {
    width: 72,
    height: 72,
  },
  pepiteLogoCenterInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  pepiteBadgeOnImage: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  pepiteBadgeOnImageText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMain,
  },
  boostedBadgeOnImage: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#05A357',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  boostedBadgeOnImageText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  pepiteCardContent: {
    padding: spacing.md,
  },
  pepiteNameBlack: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.xs / 2,
  },
  pepiteLocationGray: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  cashbackRatesBlock: {
    marginTop: spacing.sm,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  cashbackRatesBlockCompact: {
    marginTop: spacing.xs,
  },
  cashbackItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashbackRate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#05A357',
  },
  cashbackRateWelcome: {
    color: '#7C3AED',
  },
  cashbackItemLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cashbackDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.greyBorder,
    marginHorizontal: spacing.sm,
  },
  pointsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.xs,
  },
  pointsValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  pointsLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // Cartes logo seul + nom (partenaires populaires et plus gros cash back)
  logoOnlyCard: {
    width: 50,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  logoOnlyCardGrid: {
    width: '18%',
    alignItems: 'center',
    minWidth: 44,
    maxWidth: 70,
  },
  // Grille 5 colonnes pour partenaires populaires
  popularGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
    columnGap: spacing.md,
  },
  popularGridItem: {
    alignItems: 'center',
  },
  logoOnlyCardInGrid: {
    width: '100%',
    marginRight: 0,
    alignItems: 'center',
  },
  logoEncart: {
    backgroundColor: colors.greyLight,
    padding: 6,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  logoOnlyLogoWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOnlyLogo: {
    width: '100%',
    height: '100%',
  },
  logoOnlyInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  logoOnlyName: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMain,
    textAlign: 'center',
  },
  // Cashback carousel
  cashbackCarousel: {
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // Grille partenaires populaires
  mostSearchedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularBadge: {
    marginTop: 2,
    backgroundColor: colors.greyLight,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  popularBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.primary,
  },
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  searchModalContent: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.md,
  },
  searchModalInput: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textMain,
    marginBottom: spacing.lg,
  },
  searchModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  searchModalButtonCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  searchModalButtonCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  searchModalButtonSearch: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  searchModalButtonSearchText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  ctaPartnersWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl * 2,
  },
  ctaPartnersButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  ctaPartnersGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  ctaPartnersText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  // Bloc Jackpot — compact, tape à l'œil, dégradé doré
  jackpotBlock: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  jackpotCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg - 6,
    paddingBottom: spacing.sm - 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  jackpotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  jackpotLeft: {
    flex: 1,
  },
  jackpotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  jackpotLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: 1.2,
  },
  jackpotAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.black,
    letterSpacing: -1,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: -1 },
    textShadowRadius: 1,
  },
  jackpotRight: {
    alignItems: 'flex-start',
    width: 140,
  },
  jackpotProgressMini: {
    marginBottom: 35,
    width: '100%',
  },
  jackpotProgressLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 2,
  },
  jackpotProgressValue: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 2,
  },
  jackpotProgressBarBg: {
    width: '100%',
    minWidth: 120,
    height: 6,
    backgroundColor: 'rgba(4,120,87,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  jackpotProgressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  jackpotCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 10,
  },
  jackpotCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.black,
    letterSpacing: 0.5,
  },
});
