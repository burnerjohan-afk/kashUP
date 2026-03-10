import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  ImageSourcePropType,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentOffers } from '@/src/hooks/useCurrentOffers';
import { usePartners } from '@/src/hooks/usePartners';
import { useRewards } from '@/src/hooks/useRewards';
import { useWallet } from '@/src/hooks/useWallet';
import type { PartnerFilters } from '@/src/services/partnerService';
import type { Offer } from '@/src/services/offers';
import { normalizeImageUrl } from '@/src/utils/normalizeUrl';
import type { PartnerViewModel } from '@/src/utils/partnerAdapter';
import { adaptPartnerFromApi } from '@/src/utils/partnerAdapter';
import { TabScreenHeader, TAB_HEADER_HEIGHT, TAB_HEADER_TOP_OFFSET } from '@/src/components/TabScreenHeader';
import { useNotifications } from '../context/NotificationsContext';
import { getCategoryAccent } from '../constants/categoryAccents';
import { getCategoryIcon } from '../constants/categoryIcons';
import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import { BottomTabParamList } from '../navigation/BottomTabs';
import { MainStackParamList } from '../navigation/MainStack';

const DEFAULT_CATEGORY_IMAGE = require('../assets/images/adaptive-icon.png');

const CATEGORY_THEME_POOL: Array<{ source: ImageSourcePropType; accent: string }> = [
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-supermarkets'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-restaurants'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-leisure'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1487611459768-bd414656ea10?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-services'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-wellness'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-mobility'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1490111718993-d98654ce6cf7?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-fashion'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-sport'),
  },
  {
    source: require('../assets/images/category-hospitality.jpg'),
    accent: getCategoryAccent('cat-hospitality'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-education'),
  },
  {
    source: {
      uri: 'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=600&q=60',
    },
    accent: getCategoryAccent('cat-health'),
  },
  {
    source: DEFAULT_CATEGORY_IMAGE,
    accent: colors.primary,
  },
];
const DEFAULT_RADIUS_KM = 10;
/** ID utilisé pour "Tous" les partenaires (pas de filtre catégorie) */
const ALL_CATEGORIES_ID = 'all';
const RADIUS_OPTIONS = [1, 5, 10, 25];
const PARTNERS_OFFER_CARD_WIDTH = 280;
const REFERENCE_POINT = { latitude: 14.616, longitude: -61.058 };
/** Hauteur bandeau bas (tab bar) pour positionner le premier partenaire au-dessus */
const BOTTOM_TAB_AREA = 90;
/** Hauteur approximative titre de section (pour scroll ciblé) */
const SECTION_HEADER_APPROX = 32;
/** Hauteur approximative d'une carte partenaire (logo + infos) */
const PARTNER_CARD_APPROX = 140;
/** Marge sous la première carte pour qu'elle reste clairement au-dessus du bandeau */
const FIRST_CARD_BOTTOM_MARGIN = 24;

const toRad = (value: number) => (value * Math.PI) / 180;

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

type HighlightFilter = 'offers' | 'new' | 'recommended' | 'popular' | null;

const HIGHLIGHT_FILTERS: Array<{ key: Exclude<HighlightFilter, null>; label: string }> = [
  { key: 'offers', label: 'Offres du moment' },
  { key: 'new', label: 'Nouveaux' },
  { key: 'recommended', label: 'Recommandés' },
  { key: 'popular', label: 'Populaires' },
];

type CategoryCardModel = {
  id: string;
  label: string;
  accentColor: string;
  imageSource: ImageSourcePropType;
};

type PartnersNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Partenaires'>,
  NativeStackNavigationProp<MainStackParamList>
>;

export default function PartnersScreen() {
  const navigation = useNavigation<PartnersNavProp>();
  const route = useRoute<RouteProp<BottomTabParamList, 'Partenaires'>>();
  const insets = useSafeAreaInsets();
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  const [topInset, setTopInset] = useState(insets.top);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  /** Pour ne scroller qu'une fois par sélection de catégorie (premier partenaire au-dessus du bandeau) */
  const scrollToFirstPartnerRef = useRef(false);
  const { notifications } = useNotifications();

  useEffect(() => {
    if (selectedCategoryId && selectedCategoryId !== ALL_CATEGORIES_ID) {
      scrollToFirstPartnerRef.current = true;
    }
  }, [selectedCategoryId]);

  const handleFirstSectionLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!scrollToFirstPartnerRef.current || selectedCategoryId === ALL_CATEGORIES_ID) return;
      scrollToFirstPartnerRef.current = false;
      const { y: firstSectionY } = e.nativeEvent.layout;
      const windowHeight = Dimensions.get('window').height;
      // Position Y (en haut du viewport) où doit apparaître le début de la première carte :
      // pour que toute la carte + marge soit au-dessus du bandeau (tab bar).
      const visibleTopForFirstCard =
        windowHeight - insets.bottom - BOTTOM_TAB_AREA - PARTNER_CARD_APPROX - FIRST_CARD_BOTTOM_MARGIN;
      const targetScrollY = Math.max(
        0,
        firstSectionY + SECTION_HEADER_APPROX - visibleTopForFirstCard
      );
      setTimeout(() => {
        const ref = scrollRef.current as ScrollView | null;
        if (ref && typeof (ref as any).scrollTo === 'function') {
          (ref as any).scrollTo({ y: targetScrollY, animated: true });
        }
      }, 150);
    },
    [insets.bottom, selectedCategoryId]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationPress = useCallback(() => {
    (navigation as any).navigate('Accueil', { screen: 'Notifications' });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    (navigation as any).navigate('Accueil', { screen: 'Profile' });
  }, [navigation]);

  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const initial = route.params?.initialSearch;
    if (initial != null && initial !== '') setSearchQuery(initial);
  }, [route.params?.initialSearch]);
  useEffect(() => {
    if (route.params?.openNearby) {
      setNearbyMode(true);
      const km = route.params.nearbyRadiusKm;
      if (typeof km === 'number' && km > 0) setNearbyRadius(km);
    }
  }, [route.params?.openNearby, route.params?.nearbyRadiusKm]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(ALL_CATEGORIES_ID);
  const [territoryFilter, setTerritoryFilter] = useState<'Martinique' | 'Guadeloupe' | 'Guyane' | null>(null);
  const [minCashback, setMinCashback] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(DEFAULT_RADIUS_KM);
  const [highlightFilter, setHighlightFilter] = useState<HighlightFilter>(null);
  const [boostedOnly, setBoostedOnly] = useState(false);

  const partnerFilters = useMemo(() => {
    const filters: PartnerFilters = {};
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) filters.search = trimmedQuery;
    if (selectedCategoryId && selectedCategoryId !== ALL_CATEGORIES_ID) filters.categoryId = selectedCategoryId;
    if (territoryFilter) filters.territoire = territoryFilter;
    if (nearbyMode) {
      filters.autourDeMoi = `${REFERENCE_POINT.latitude},${REFERENCE_POINT.longitude},${nearbyRadius}`;
    }
    return filters;
  }, [searchQuery, selectedCategoryId, territoryFilter, nearbyMode, nearbyRadius]);

  const {
    data: partnerData,
    loading: partnersLoading,
    error: partnersError,
    refetch,
  } = usePartners(partnerFilters);
  const { data: currentOffers } = useCurrentOffers();
  const { data: walletData } = useWallet();
  const { data: rewardsData } = useRewards();
  const cashback = walletData?.wallet?.soldeCashback ?? null;
  const points = rewardsData?.summary?.points ?? null;

  const isFirstFocus = React.useRef(true);
  const [layoutKey, setLayoutKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        setTopInset(insetsRef.current.top);
      } else {
        refetch();
      }
      setTopInset(insetsRef.current.top);
      const t1 = setTimeout(() => setTopInset(insetsRef.current.top), 0);
      const t2 = setTimeout(() => setTopInset(insetsRef.current.top), 80);
      const t3 = setTimeout(() => {
        setTopInset(insetsRef.current.top);
        setLayoutKey((k) => k + 1);
        (scrollRef.current as any)?.scrollTo?.({ y: 0, animated: false });
      }, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }, [refetch])
  );

  const partners = useMemo<PartnerViewModel[]>(
    () => partnerData.partners.map(adaptPartnerFromApi),
    [partnerData.partners]
  );

  const categories = useMemo<CategoryCardModel[]>(() => {
    if (partnerData.categories.length === 0) return [];
    return partnerData.categories
      .filter((category) => category.id) // Filtrer les catégories sans id
      .map((category, index) => {
        const theme = CATEGORY_THEME_POOL[index % CATEGORY_THEME_POOL.length];
        return {
          id: category.id || `category-${index}`, // Fallback si id manquant
          label: category.name || 'Catégorie',
          accentColor: theme.accent,
          imageSource: theme.source,
        };
      });
  }, [partnerData.categories]);

  /** Catégories avec l’option "Tous" en premier pour la bande horizontale */
  const categoriesWithAll = useMemo(() => {
    if (categories.length === 0) return [];
    const theme = CATEGORY_THEME_POOL[0];
    return [
      { id: ALL_CATEGORIES_ID, label: 'Tous', accentColor: theme.accent, imageSource: theme.source },
      ...categories,
    ];
  }, [categories]);

  const partnerDistanceMap = useMemo(() => {
    const map = new Map<string, number>();
    partners.forEach((partner) => {
      if (partner.latitude != null && partner.longitude != null) {
        const distance = haversine(
          REFERENCE_POINT.latitude,
          REFERENCE_POINT.longitude,
          partner.latitude,
          partner.longitude
        );
        map.set(partner.id, distance);
      } else {
        map.set(partner.id, Infinity);
      }
    });
    return map;
  }, [partners]);

  const filteredPartners = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return partners.filter((partner) => {
      if (selectedCategoryId && selectedCategoryId !== ALL_CATEGORIES_ID && partner.categoryId !== selectedCategoryId) return false;
      if (territoryFilter) {
        const inTerritory = partner.territories?.length
          ? partner.territories.includes(territoryFilter)
          : partner.country === territoryFilter;
        if (!inTerritory) return false;
      }
      if (nearbyMode) {
        const distance = partnerDistanceMap.get(partner.id) ?? Infinity;
        if (distance > nearbyRadius) return false;
      }
      if (favoritesOnly && !favoriteIds.has(partner.id)) return false;
      if (boostedOnly && !(partner.marketingPrograms?.includes('boosted') || partner.isBoosted)) return false;
      if (partner.permanentOffer.rate < minCashback) return false;
      if (highlightFilter === 'offers' && !(partner.marketingPrograms?.includes('boosted') || partner.isBoosted)) return false;
      if (highlightFilter === 'popular' && !(partner.marketingPrograms?.includes('most-searched') || partner.isPopular)) return false;
      if (highlightFilter === 'new' && !partner.isNew) return false;
      if (highlightFilter === 'recommended' && !(partner.marketingPrograms?.includes('pepites') || partner.isRecommended)) return false;
      if (!normalizedQuery) return true;
      return (
        partner.name.toLowerCase().includes(normalizedQuery) ||
        partner.city.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [
    favoriteIds,
    favoritesOnly,
    minCashback,
    boostedOnly,
    nearbyRadius,
    highlightFilter,
    nearbyMode,
    partnerDistanceMap,
    partners,
    searchQuery,
    selectedCategoryId,
    territoryFilter,
  ]);


  const sections = useMemo(() => {
    const categoriesToRender =
      selectedCategoryId && selectedCategoryId !== ALL_CATEGORIES_ID
        ? categories.filter((category) => category.id === selectedCategoryId)
        : categories;

    return categoriesToRender
      .map((category) => ({
        title: category.label,
        accentColor: category.accentColor,
        data: filteredPartners.filter((partner) => partner.categoryId === category.id),
      }))
      .filter((section) => section.data.length > 0);
  }, [categories, filteredPartners, selectedCategoryId]);

  const categoryAccentMap = useMemo(() => {
    const map = new Map<string, string>();
    categoriesWithAll.forEach((category) => map.set(category.id, category.accentColor));
    return map;
  }, [categoriesWithAll]);

  const handlePartnerPress = (partnerId: string) => {
    navigation.navigate('PartnerDetail', { partnerId });
  };

  const handleSeeAllOffersPress = () => {
    (navigation as any).navigate('OffresDuMoment');
  };

  const handleOfferPress = (partnerId: string, offerType: 'welcome' | 'permanent' | 'voucher') => {
    navigation.navigate('OfferTemplate', { partnerId, offerType });
  };

  const toggleFavorite = (partnerId: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(partnerId)) {
        next.delete(partnerId);
      } else {
        next.add(partnerId);
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={styles.pageGradient}
        />
        <TabScreenHeader
        scrollY={scrollY}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        unreadCount={unreadCount}
        cashback={cashback}
        points={points}
        showPillsRow
      />
      {partnersError && (
        <TouchableOpacity style={styles.errorBanner} onPress={refetch} activeOpacity={0.85}>
          <Text style={styles.errorBannerText}>{partnersError}</Text>
          <Text style={styles.errorBannerCta}>Réessayer</Text>
        </TouchableOpacity>
      )}
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.listFill}
        contentContainerStyle={[styles.listContent, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl refreshing={partnersLoading} onRefresh={refetch} />
        }>
        <View key={`spacer-${layoutKey}`} style={[styles.headerSpacer, { height: Math.max(0, topInset - 36) + TAB_HEADER_TOP_OFFSET + TAB_HEADER_HEIGHT + 13 }]} />
        <View style={styles.headerOuter}>
          <View style={styles.header}>
            <Text style={styles.title}>Partenaires</Text>
            <Text style={styles.subtitle}>Découvrez les commerces qui boostent votre pouvoir d'achat local.</Text>

            {/* Carousel Offres du moment — sous le titre */}
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
                  snapToInterval={PARTNERS_OFFER_CARD_WIDTH + spacing.md}
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
                    const formatOfferDate = (iso: string) => {
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
                              Du {formatOfferDate(offer.startsAt)} au {formatOfferDate(offer.endsAt)}
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

            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher un partenaire..."
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
              />
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButtonWrap} onPress={() => setIsFilterModalVisible(true)}>
                <LinearGradient
                  colors={[...CARD_GRADIENT_COLORS]}
                  locations={[...CARD_GRADIENT_LOCATIONS]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionButton}>
                  <Ionicons name="options-outline" size={18} color={colors.white} />
                  <Text style={styles.actionButtonText}>Filtres</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButtonWrap, styles.locationButtonWrap, nearbyMode && styles.locationButtonWrapActive]}
                onPress={() => setNearbyMode((prev) => !prev)}>
                {nearbyMode ? (
                  <LinearGradient
                    colors={[...CARD_GRADIENT_COLORS]}
                    locations={[...CARD_GRADIENT_LOCATIONS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.actionButton, styles.locationButton]}>
                    <Ionicons name="location-outline" size={18} color={colors.white} />
                    <View style={styles.locationButtonTextBlock}>
                      <Text style={[styles.actionButtonText, styles.locationButtonTextActive]}>Autour de moi</Text>
                      <Text style={[styles.actionButtonText, styles.locationButtonTextActive, styles.locationButtonKm]}>
                        {nearbyRadius} km
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={[styles.actionButton, styles.locationButton]}>
                    <Ionicons name="location-outline" size={18} color={colors.primary} />
                    <Text style={[styles.actionButtonText, styles.locationButtonText]}>Autour de moi</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>Explorez les partenaires près de chez vous.</Text>
            {nearbyMode && (
              <View style={styles.radiusCard}>
                <Text style={styles.radiusLabel}>Sélectionnez un rayon</Text>
                <View style={styles.radiusOptionsRow}>
                  {RADIUS_OPTIONS.map((value) => {
                    const isActive = value === nearbyRadius;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.radiusOptionChip,
                          isActive && styles.radiusOptionChipActive,
                        ]}
                        onPress={() => setNearbyRadius(value)}>
                        <Text
                          style={[
                            styles.radiusOptionText,
                            isActive && styles.radiusOptionTextActive,
                          ]}>
                          {value} km
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.radiusHint}>Simulation sans géolocalisation réelle.</Text>
              </View>
            )}

            {categories.length === 0 ? (
              <Text style={styles.emptyCategoriesHint}>
                {partnersLoading ? 'Chargement des catégories…' : 'Aucune catégorie disponible pour le moment.'}
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {categoriesWithAll.map((category) => (
                  <CategoryCard
                    key={category.id}
                    categoryId={category.id}
                    label={category.label}
                    isActive={selectedCategoryId === category.id}
                    accentColor={category.accentColor}
                    imageSource={category.imageSource}
                    onPress={() => setSelectedCategoryId(category.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
        {partnersLoading && sections.length === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des partenaires…</Text>
          </View>
        ) : sections.length === 0 ? (
          <Text style={styles.emptyState}>Aucun partenaire trouvé pour votre recherche.</Text>
        ) : (
          sections.map((section, sectionIndex) => (
            <View
              key={section.title}
              style={styles.sectionBlock}
              onLayout={
                sectionIndex === 0 &&
                selectedCategoryId !== ALL_CATEGORIES_ID
                  ? handleFirstSectionLayout
                  : undefined
              }>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              {section.data.map((item) => {
                const accentColor = categoryAccentMap.get(item.categoryId) ?? getCategoryAccent(item.categoryId);
                return (
                  <PartnerCard
                    key={item.id}
                    partner={item}
                    isFavorite={favoriteIds.has(item.id)}
                    accentColor={accentColor}
                    onPress={() => handlePartnerPress(item.id)}
                    onToggleFavorite={() => toggleFavorite(item.id)}
                  />
                );
              })}
            </View>
          ))
        )}
      </Animated.ScrollView>

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        territory={territoryFilter}
        onTerritoryChange={setTerritoryFilter}
        minCashback={minCashback}
        onMinCashbackChange={setMinCashback}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        highlightFilter={highlightFilter}
        onHighlightFilterChange={setHighlightFilter}
        boostedOnly={boostedOnly}
        onBoostedOnlyChange={setBoostedOnly}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type PartnerCardProps = {
  partner: PartnerViewModel;
  isFavorite: boolean;
  accentColor: string;
  onPress: () => void;
  onToggleFavorite: () => void;
};

function PartnerCard({
  partner,
  isFavorite,
  accentColor,
  onPress,
  onToggleFavorite,
}: PartnerCardProps) {
  const [logoError, setLogoError] = React.useState(false);
  const accent = accentColor ?? colors.primary;
  const logoUri = partner.logoUrl && partner.logoUrl.trim() !== '' ? normalizeImageUrl(partner.logoUrl) : null;
  const showLogo = !!logoUri && !logoError;

  const badges = useMemo(() => {
    const list: Array<{ key: string; label: string; style: 'pepite' | 'boosted' | 'popular' }> = [];
    if (partner.marketingPrograms?.includes('pepites') || partner.isRecommended) {
      list.push({ key: 'pepite', label: 'Pépite', style: 'pepite' });
    }
    if (partner.marketingPrograms?.includes('boosted') || partner.isBoosted) {
      list.push({ key: 'boosted', label: 'Boosté', style: 'boosted' });
    }
    if (partner.marketingPrograms?.includes('most-searched') || partner.isPopular) {
      list.push({ key: 'popular', label: 'Populaire', style: 'popular' });
    }
    return list;
  }, [partner.marketingPrograms, partner.isRecommended, partner.isBoosted, partner.isPopular]);

  return (
    <TouchableOpacity style={styles.partnerCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.partnerLogo}>
        {showLogo ? (
          <Image
            source={{ uri: logoUri! }}
            style={styles.partnerLogoImage}
            resizeMode="cover"
            onError={() => setLogoError(true)}
          />
        ) : (
          <Text style={styles.partnerLogoText}>{partner.name.slice(0, 2).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.partnerInfo}>
        <View style={styles.partnerInfoHeader}>
          <View style={styles.partnerTitleRow}>
            <Text style={styles.partnerName} numberOfLines={2}>{partner.name}</Text>
          </View>
          <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.favoriteHeartWrap}>
            <View style={styles.favoriteHeartFixed}>
              {isFavorite ? (
                <MaskedView
                  style={styles.favoriteHeartMaskView}
                  maskElement={
                    <View style={styles.favoriteHeartMaskInner}>
                      <Ionicons name="heart" size={18} color="#000000" />
                    </View>
                  }>
                  <LinearGradient
                    colors={[...CARD_GRADIENT_COLORS]}
                    locations={[...CARD_GRADIENT_LOCATIONS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </MaskedView>
              ) : (
                <View style={styles.favoriteHeartMaskInner}>
                  <Ionicons
                    name="heart-outline"
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              )}
            </View>
          </Pressable>
        </View>
        {badges.length > 0 ? (
          <View style={styles.partnerBadgesRow}>
            {badges.map((b) => (
              <View
                key={b.key}
                style={[
                  styles.partnerBadgePill,
                  b.style === 'pepite' && styles.partnerBadgePepite,
                  b.style === 'boosted' && styles.partnerBadgeBoosted,
                  b.style === 'popular' && styles.partnerBadgePopular,
                ]}>
                {b.style === 'pepite' && <Ionicons name="star" size={10} color={colors.accentYellow} />}
                {b.style === 'boosted' && <Ionicons name="flash" size={10} color={colors.white} />}
                {b.style === 'popular' && <Ionicons name="trending-up" size={10} color={colors.white} />}
                <Text
                  style={[
                    styles.partnerBadgePillText,
                    b.style === 'boosted' && styles.partnerBadgePillTextBoosted,
                    b.style === 'popular' && styles.partnerBadgePillTextPopular,
                  ]}
                  numberOfLines={1}>
                  {b.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.cashbackRow}>
          <View style={styles.cashbackItem}>
            <Ionicons name="pricetag" size={12} color="#05A357" />
            <Text style={styles.cashbackRate}>{partner.permanentOffer.rate}%</Text>
            <Text style={styles.cashbackItemLabel}>Permanent</Text>
          </View>
          <View style={styles.cashbackDivider} />
          <View style={styles.cashbackItem}>
            <Ionicons name="gift" size={12} color="#7C3AED" />
            <Text style={[styles.cashbackRate, styles.cashbackRateWelcome]}>{partner.welcomeOffer.rate}%</Text>
            <Text style={styles.cashbackItemLabel}>Bienvenue</Text>
          </View>
        </View>
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

type CategoryCardProps = {
  categoryId: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
  imageSource?: ImageSourcePropType;
  accentColor?: string;
};

/** Proposition 3 : icônes seules, très minimal – cercle + tout petit libellé en dessous */
function CategoryCard({ categoryId, label, isActive, onPress, accentColor }: CategoryCardProps) {
  const iconName = getCategoryIcon(categoryId, label);
  return (
    <Pressable
      style={[styles.categoryCard]}
      onPress={onPress}>
      <View
        style={[
          styles.categoryCircle,
          isActive && styles.categoryCircleActive,
          isActive && accentColor ? { borderColor: accentColor, backgroundColor: `${accentColor}18` } : null,
        ]}>
        <Ionicons
          name={iconName as any}
          size={28}
          color={isActive ? (accentColor ?? colors.primary) : colors.textSecondary}
        />
      </View>
      <Text style={[styles.categoryLabelTiny, isActive && styles.categoryLabelTinyActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  territory: 'Martinique' | 'Guadeloupe' | 'Guyane' | null;
  onTerritoryChange: (territory: 'Martinique' | 'Guadeloupe' | 'Guyane' | null) => void;
  minCashback: number;
  onMinCashbackChange: (value: number) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
  highlightFilter: HighlightFilter;
  onHighlightFilterChange: (value: HighlightFilter) => void;
  boostedOnly: boolean;
  onBoostedOnlyChange: (value: boolean) => void;
};

function FilterModal({
  visible,
  onClose,
  territory,
  onTerritoryChange,
  minCashback,
  onMinCashbackChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  highlightFilter,
  onHighlightFilterChange,
  boostedOnly,
  onBoostedOnlyChange,
}: FilterModalProps) {
  const territoryOptions: Array<'Martinique' | 'Guadeloupe' | 'Guyane'> = ['Martinique', 'Guadeloupe', 'Guyane'];
  const cashbackOptions = [0, 3, 5, 8];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filtres avancés</Text>

          <Text style={styles.modalLabel}>Territoire</Text>
          <View style={styles.optionRow}>
            {(() => {
              const isActive = !territory;
              return (
                <TouchableOpacity
                  style={[styles.optionChip, isActive && styles.optionChipActiveWrap]}
                  onPress={() => onTerritoryChange(null)}>
                  {isActive ? (
                    <LinearGradient
                      colors={[...CARD_GRADIENT_COLORS]}
                      locations={[...CARD_GRADIENT_LOCATIONS]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionChipGradient}>
                      <Text style={[styles.optionChipText, styles.optionChipTextActive]}>Tous</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionChipText}>Tous</Text>
                  )}
                </TouchableOpacity>
              );
            })()}
            {territoryOptions.map((option) => {
              const isActive = territory === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, isActive && styles.optionChipActiveWrap]}
                  onPress={() => onTerritoryChange(option)}>
                  {isActive ? (
                    <LinearGradient
                      colors={[...CARD_GRADIENT_COLORS]}
                      locations={[...CARD_GRADIENT_LOCATIONS]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionChipGradient}>
                      <Text style={[styles.optionChipText, styles.optionChipTextActive]}>{option}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionChipText}>{option}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>Taux de cashback minimum</Text>
          <View style={styles.optionRow}>
            {cashbackOptions.map((value) => {
              const isActive = minCashback === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.optionChip, isActive && styles.optionChipActiveWrap]}
                  onPress={() => onMinCashbackChange(value)}>
                  {isActive ? (
                    <LinearGradient
                      colors={[...CARD_GRADIENT_COLORS]}
                      locations={[...CARD_GRADIENT_LOCATIONS]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionChipGradient}>
                      <Text style={[styles.optionChipText, styles.optionChipTextActive]}>
                        {value === 0 ? 'Tous' : `≥ ${value}%`}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionChipText}>
                      {value === 0 ? 'Tous' : `≥ ${value}%`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>Mises en avant</Text>
          <View style={styles.optionRow}>
            {HIGHLIGHT_FILTERS.map(({ key, label }) => {
              const isActive = highlightFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.optionChip, isActive && styles.optionChipActiveWrap]}
                  onPress={() => onHighlightFilterChange(isActive ? null : key)}>
                  {isActive ? (
                    <LinearGradient
                      colors={[...CARD_GRADIENT_COLORS]}
                      locations={[...CARD_GRADIENT_LOCATIONS]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionChipGradient}>
                      <Text style={[styles.optionChipText, styles.optionChipTextActive]}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionChipText}>{label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.favoriteSwitch, favoritesOnly && styles.favoriteSwitchActive]}
            onPress={() => onFavoritesOnlyChange(!favoritesOnly)}>
            <Ionicons
              name={favoritesOnly ? 'heart' : 'heart-outline'}
              size={18}
              color={favoritesOnly ? colors.white : colors.primary}
            />
            <Text
              style={[
                styles.favoriteSwitchText,
                favoritesOnly ? styles.favoriteSwitchTextActive : undefined,
              ]}>
              Afficher uniquement mes favoris
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.favoriteSwitch, boostedOnly && styles.favoriteSwitchActive]}
            onPress={() => onBoostedOnlyChange(!boostedOnly)}>
            <Ionicons
              name={boostedOnly ? 'flash' : 'flash-outline'}
              size={18}
              color={boostedOnly ? colors.white : colors.primaryGreen}
            />
            <Text
              style={[
                styles.favoriteSwitchText,
                boostedOnly ? styles.favoriteSwitchTextActive : undefined,
              ]}>
              Cashback boosté uniquement
            </Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalSecondary}
              onPress={() => {
                onTerritoryChange(null);
                onMinCashbackChange(0);
                onFavoritesOnlyChange(false);
                onHighlightFilterChange(null);
                onBoostedOnlyChange(false);
              }}>
              <Text style={styles.modalSecondaryText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryWrap} onPress={onClose}>
              <LinearGradient
                colors={[...CARD_GRADIENT_COLORS]}
                locations={[...CARD_GRADIENT_LOCATIONS]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalPrimary}>
                <Text style={styles.modalPrimaryText}>Appliquer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  pageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  listFill: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  pageHeaderWrapper: {
    width: '100%',
  },
  headerSpacer: {
    width: '100%',
  },
  headerOuter: {
    width: '100%',
  },
  header: {
    paddingTop: 0,
    marginTop: 0,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  offresSection: {
    marginBottom: spacing.md,
  },
  offresSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  offresSectionTitle: {
    fontSize: 18,
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
    width: PARTNERS_OFFER_CARD_WIDTH,
    marginRight: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.greyBorder,
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
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lightBlue,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.textMain,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  actionButtonWrap: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  locationButtonWrap: {
    flexShrink: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locationButtonWrapActive: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm / 2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  locationButton: {
    flexShrink: 1,
    borderWidth: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  locationButtonText: {
    color: colors.primary,
    flexShrink: 1,
    textAlign: 'center',
  },
  locationButtonTextActive: {
    color: colors.white,
  },
  locationButtonTextBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonKm: {
    fontSize: 12,
    marginTop: 1,
    opacity: 0.95,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  radiusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.lightBlue,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  radiusOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  radiusOptionChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lightBlue,
    backgroundColor: colors.white,
    minWidth: 70,
    alignItems: 'center',
  },
  radiusOptionChipActive: {
    borderColor: colors.primaryGreen,
    backgroundColor: colors.lightGreen,
  },
  radiusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  radiusOptionTextActive: {
    color: colors.primaryGreen,
  },
  radiusHint: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: spacing.lg,
    minWidth: 64,
  },
  categoryCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCircleActive: {
    borderWidth: 2,
  },
  categoryLabelTiny: {
    marginTop: 6,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 72,
  },
  categoryLabelTinyActive: {
    color: colors.textMain,
    fontWeight: '600',
  },
  sectionBlock: {
    width: '100%',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  partnerCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  partnerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    marginBottom: 2,
    paddingRight: spacing.xs,
  },
  partnerBadgePill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  partnerBadgePepite: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  partnerBadgeBoosted: {
    backgroundColor: '#05A357',
  },
  partnerBadgePopular: {
    backgroundColor: '#EA580C',
  },
  partnerBadgePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMain,
  },
  partnerBadgePillTextBoosted: {
    color: colors.white,
  },
  partnerBadgePillTextPopular: {
    color: colors.white,
  },
  partnerLogo: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  partnerLogoImage: {
    width: '100%',
    height: '100%',
  },
  partnerLogoText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  partnerInfo: {
    flex: 1,
    minWidth: 0,
  },
  partnerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
    minWidth: 0,
  },
  favoriteHeartWrap: {
    width: 34,
    height: 34,
    minWidth: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteHeartFixed: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteHeartMaskView: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteHeartMaskInner: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 0,
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
  emptyState: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionChip: {
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.lightPurple,
    backgroundColor: colors.white,
  },
  optionChipActiveWrap: {
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  optionChipGradient: {
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: colors.white,
  },
  favoriteSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lightPurple,
    backgroundColor: colors.white,
    marginTop: spacing.sm,
  },
  favoriteSwitchActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  favoriteSwitchText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  favoriteSwitchTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  modalSecondary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalPrimaryWrap: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  modalPrimary: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    color: colors.white,
    fontWeight: '700',
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
    color: '#B91C1C',
    fontSize: 13,
  },
  errorBannerCta: {
    marginTop: spacing.xs / 2,
    color: '#B91C1C',
    fontWeight: '600',
    fontSize: 13,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyCategoriesHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
});

