import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabScreenHeader, TAB_HEADER_HEIGHT } from '@/src/components/TabScreenHeader';
import { useCurrentOffers } from '@/src/hooks/useCurrentOffers';
import { useWallet } from '@/src/hooks/useWallet';
import { useNotifications } from '@/context/NotificationsContext';
import type { Offer } from '@/src/services/offers';
import { normalizeImageUrl } from '@/src/utils/normalizeUrl';
import { colors, radius, spacing } from '@/constants/theme';
import type { PartnersStackParamList } from '@/navigation/PartnersStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavProp = NativeStackNavigationProp<PartnersStackParamList, 'OffresDuMoment'>;

const CARD_IMAGE_HEIGHT = 140;
const SCALE = 1.35;

function formatOfferDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function OffresDuMomentScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { data: offers, loading, refetch, isRefetching } = useCurrentOffers();
  const { cashback, points } = useWallet();
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNotificationPress = useCallback(() => {
    (navigation.getParent() as any)?.getParent()?.navigate('Accueil', { screen: 'Notifications' });
  }, [navigation]);

  const handleProfilePress = useCallback(() => {
    (navigation.getParent() as any)?.getParent()?.navigate('Accueil', { screen: 'Profile' });
  }, [navigation]);

  const handleOfferPress = useCallback(
    (offer: Offer) => {
      if (offer.partnerId) {
        (navigation.getParent() as any)?.navigate('PartnerDetail', { partnerId: offer.partnerId });
      }
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <TabScreenHeader
        title="Voir toutes les offres"
        scrollY={scrollY}
        onBackPress={handleBackPress}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        unreadCount={unreadCount}
        cashback={cashback ?? null}
        points={points ?? null}
        showPillsRow
      />
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(0, insets.top - 36) + TAB_HEADER_HEIGHT + spacing.md },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        refreshControl={
          <RefreshControl refreshing={loading || isRefetching} onRefresh={refetch} />
        }>
        <Text style={styles.pageTitle}>Offres du moment</Text>
        {offers.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucune offre du moment.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {offers.map((offer) => {
              const imageUri = offer.imageUrl ? normalizeImageUrl(offer.imageUrl) : null;
              const partnerLogoUri = offer.partner?.logoUrl ? normalizeImageUrl(offer.partner.logoUrl) : null;
              const partnerName = offer.partner?.name ?? 'Partenaire';
              const stockTotal = offer.stock ?? 0;
              const stockUsed = offer.stockUsed ?? 0;
              const restantes = Math.max(0, stockTotal - stockUsed);
              const restantesRatio = stockTotal > 0 ? restantes / stockTotal : 1;
              const restantesVariant =
                restantesRatio > 0.5 ? 'green' : restantesRatio > 0.25 ? 'orange' : 'red';
              const restantesBg =
                restantesVariant === 'green'
                  ? `${colors.primary}14`
                  : restantesVariant === 'orange'
                    ? 'rgba(234, 88, 12, 0.18)'
                    : 'rgba(185, 28, 28, 0.18)';
              const restantesColor =
                restantesVariant === 'green' ? colors.primary : restantesVariant === 'orange' ? '#EA580C' : '#B91C1C';
              const price = offer.price != null ? `${Number(offer.price).toFixed(2)} €` : null;
              const cashbackRate = offer.cashbackRate != null ? Number(offer.cashbackRate) : null;
              const hasCashback = cashbackRate != null && cashbackRate >= 0;

              return (
                <TouchableOpacity
                  key={offer.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => handleOfferPress(offer)}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Ionicons name="pricetag-outline" size={36} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {offer.title}
                      </Text>
                      {offer.subtitle ? (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {offer.subtitle}
                        </Text>
                      ) : null}
                      <Text style={styles.cardPartner}>{partnerName}</Text>
                      <View style={styles.priceCashbackRow}>
                        {price ? <Text style={styles.cardPrice}>{price}</Text> : null}
                        <View style={styles.cashbackItem}>
                          <Ionicons
                            name="pricetag"
                            size={Math.round(11 * SCALE)}
                            color={hasCashback ? '#05A357' : colors.textSecondary}
                          />
                          <Text
                            style={[styles.cashbackRate, !hasCashback && styles.cashbackRateEmpty]}>
                            {hasCashback ? `${cashbackRate}%` : '—'}
                          </Text>
                          <Text style={styles.cashbackLabel}>
                            {hasCashback ? "À l'achat" : 'Non renseigné'}
                          </Text>
                        </View>
                      </View>
                      {stockTotal > 0 && (
                        <View style={[styles.restantesBlock, { backgroundColor: restantesBg }]}>
                          <Text style={[styles.restantesCount, { color: restantesColor }]}>
                            {restantes}
                          </Text>
                          <Text style={styles.restantesLabel}>
                            restante{restantes !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {offer.conditions ? (
                        <Text style={styles.conditions} numberOfLines={1}>
                          {offer.conditions}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.logoAndDatesRow}>
                      <Text style={styles.dates}>
                        Du {formatOfferDate(offer.startsAt)} au {formatOfferDate(offer.endsAt)}
                      </Text>
                      {partnerLogoUri ? (
                        <Image
                          source={{ uri: partnerLogoUri }}
                          style={styles.partnerLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.partnerLogoPlaceholder}>
                          <Text style={styles.partnerLogoPlaceholderText} numberOfLines={1}>
                            {partnerName.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  cardImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.greyLight,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: spacing.sm * SCALE,
    paddingBottom: 4,
  },
  cardContent: {
    flexGrow: 0,
  },
  cardTitle: {
    fontSize: Math.round(14 * SCALE),
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: Math.round(12 * SCALE),
    color: colors.textSecondary,
    marginBottom: 2,
  },
  cardPartner: {
    fontSize: Math.round(11 * SCALE),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 9,
  },
  priceCashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Math.round((spacing.sm + 4) * SCALE),
    marginBottom: 7,
  },
  cardPrice: {
    fontSize: Math.round(13 * SCALE),
    fontWeight: '700',
    color: colors.textMain,
  },
  cashbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashbackRate: {
    fontSize: Math.round(10 * SCALE),
    fontWeight: '700',
    color: '#05A357',
  },
  cashbackRateEmpty: {
    color: colors.textSecondary,
  },
  cashbackLabel: {
    fontSize: Math.round(9 * SCALE),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  restantesBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 14,
    marginBottom: 0,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  restantesCount: {
    fontSize: Math.round(14 * SCALE),
    fontWeight: '800',
  },
  restantesLabel: {
    fontSize: Math.round(10 * SCALE),
    fontWeight: '600',
    color: colors.textMain,
  },
  conditions: {
    fontSize: Math.round(10 * SCALE),
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  logoAndDatesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: spacing.sm,
  },
  dates: {
    fontSize: Math.round(10 * SCALE),
    color: colors.textTertiary,
    flex: 1,
    textAlign: 'left',
  },
  partnerLogo: {
    width: Math.round(34 * 1.6),
    height: Math.round(34 * 1.6),
    borderRadius: radius.sm,
    backgroundColor: colors.greyLight,
  },
  partnerLogoPlaceholder: {
    width: Math.round(34 * 1.6),
    height: Math.round(34 * 1.6),
    borderRadius: radius.sm,
    backgroundColor: colors.greyBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLogoPlaceholderText: {
    fontSize: Math.round(9 * 1.6),
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
