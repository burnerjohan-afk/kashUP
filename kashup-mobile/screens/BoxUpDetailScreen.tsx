import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { TAB_HEADER_HEIGHT } from '@/src/components/TabScreenHeader';
import { useNotifications } from '../context/NotificationsContext';
import { useRewards } from '@/src/hooks/useRewards';
import { useWallet } from '@/src/hooks/useWallet';
import { getGiftBoxById, GiftBox } from '@/src/services/giftCardService';
import { getPartners } from '@/src/services/partnerService';
import { normalizeImageUrl } from '@/src/utils/normalizeUrl';
import { colors, radius, spacing } from '../constants/theme';
import type { MainStackParamList } from '../navigation/MainStack';

const formatCashback = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPoints = (v: number) => `${v.toLocaleString('fr-FR')} pts`;

type BoxDetailRoute = RouteProp<MainStackParamList, 'BoxUpDetail'>;
const fallbackHeroImage =
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=60';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function BoxUpDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<BoxDetailRoute>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const { data: walletData } = useWallet();
  const { data: rewardsData } = useRewards();
  const cashback = walletData?.wallet?.soldeCashback ?? null;
  const points = rewardsData?.summary?.points ?? null;

  const handleNotificationPress = useCallback(() => {
    (navigation.getParent() as any)?.navigate('Tabs', { screen: 'Accueil', params: { screen: 'Notifications' } });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    (navigation.getParent() as any)?.navigate('Tabs', { screen: 'Accueil', params: { screen: 'Profile' } });
  }, [navigation]);

  const [box, setBox] = useState<GiftBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Map partenaireId -> logoUrl pour afficher les logos (API box ne les renvoie pas toujours) */
  const [partnerLogos, setPartnerLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    const passedBox = route.params?.box;
    const fetchBox = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getGiftBoxById(route.params.boxId);
        if (!mounted) return;
        const hasPartnersFromApi =
          (Array.isArray(data.partners) && data.partners.length > 0) ||
          (Array.isArray(data.partenaires) && data.partenaires.length > 0);
        if (!hasPartnersFromApi && passedBox) {
          const fromList = Array.isArray(passedBox.partners) ? passedBox.partners : Array.isArray(passedBox.partenaires) ? passedBox.partenaires : [];
          setBox({
            ...data,
            partners: Array.isArray(passedBox.partners) ? passedBox.partners : data.partners ?? [],
            partenaires: Array.isArray(passedBox.partenaires) ? passedBox.partenaires : data.partenaires ?? [],
          });
        } else {
          setBox(data);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Impossible de charger cette Box.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchBox();
    return () => {
      mounted = false;
    };
  }, [route.params.boxId]);

  useEffect(() => {
    let mounted = true;
    const loadPartnerLogos = async () => {
      try {
        const list = await getPartners();
        if (!mounted) return;
        const map: Record<string, string> = {};
        list.forEach((p) => {
          if (p.id && p.logoUrl) map[p.id] = p.logoUrl;
        });
        setPartnerLogos(map);
      } catch {
        if (!mounted) return;
      }
    };
    loadPartnerLogos();
    return () => { mounted = false; };
  }, []);

  const bandeauTopPadding = insets.top;
  const bandeauContentHeight = TAB_HEADER_HEIGHT + spacing.sm * 2;
  const headerSpacerHeight = bandeauTopPadding + bandeauContentHeight;
  const renderBandeau = () => (
    <View style={[styles.bandeau, { paddingTop: bandeauTopPadding }]} pointerEvents="box-none">
      <View style={styles.bandeauInner}>
        <TouchableOpacity style={styles.bandeauIcon} onPress={handleNotificationPress} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color={colors.textMain} />
          {unreadCount > 0 && (
            <View style={styles.bandeauBadge}>
              <Text style={styles.bandeauBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.bandeauPillsRow}>
          <LinearGradient
            colors={['#0ABF5C', '#05A357', '#048A48']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bandeauPillPoints}>
            <Ionicons name="star" size={16} color="#FFF" />
            <Text style={styles.bandeauPillPointsText}>{formatPoints(points ?? 0)}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#F5F5F5', '#E0E0E0', '#BDBDBD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bandeauPillCashback}>
            <Text style={styles.bandeauPillCashbackSymbol}>€</Text>
            <Text style={styles.bandeauPillCashbackValue}>{formatCashback(cashback ?? 0)}</Text>
          </LinearGradient>
        </View>
        <TouchableOpacity style={styles.bandeauIcon} onPress={handleProfilePress} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={24} color={colors.textMain} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        {renderBandeau()}
        <View style={[styles.centered, { flex: 1, paddingTop: headerSpacerHeight }]}>
          <ActivityIndicator size="large" color={colors.primaryPurple} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !box) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        {renderBandeau()}
        <View style={[styles.centered, { flex: 1, paddingTop: headerSpacerHeight }]}>
          <Text style={styles.errorText}>{error ?? 'Cette Box est introuvable.'}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const boxFromList = route.params?.box;
  const hasPartnersFromApi =
    (Array.isArray(box.partners) && box.partners.length > 0) ||
    (Array.isArray(box.partenaires) && box.partenaires.length > 0);
  let partnersForDisplay: Array<{ id?: string; name?: string; partenaireId?: string; partenaireName?: string; accentColor?: string; category?: string; offrePartenaire?: string }>;
  if (hasPartnersFromApi) {
    partnersForDisplay = Array.isArray(box.partners) ? box.partners : (Array.isArray(box.partenaires) ? box.partenaires : []);
  } else if (boxFromList && (Array.isArray(boxFromList.partners) || Array.isArray(boxFromList.partenaires))) {
    partnersForDisplay = Array.isArray(boxFromList.partners) ? boxFromList.partners : (boxFromList.partenaires ?? []);
  } else {
    partnersForDisplay = [];
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      {renderBandeau()}
      <AnimatedScrollView
        style={styles.scrollFill}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}>
        <View style={{ height: headerSpacerHeight }} />
        <ImageBackground source={{ uri: box.heroImageUrl ?? fallbackHeroImage }} style={[styles.heroImage, { marginTop: -10 }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Multi-partenaires</Text>
            </View>
          </View>
          <View style={styles.heroTexts}>
            <Text style={styles.heroTitle}>{box.title ?? box.nom ?? 'Box'}</Text>
            <Text style={styles.heroSubtitle}>{box.shortDescription ?? box.description ?? ''}</Text>
            <Text style={styles.heroPrice}>À partir de {(box.priceFrom ?? box.value ?? 0).toFixed(0)} €</Text>
          </View>
        </ImageBackground>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ce que contient la Box</Text>
          <Text style={styles.cardDescription}>{box.description ?? box.shortDescription ?? ''}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Partenaires inclus</Text>
          <View style={styles.partnerList}>
            {partnersForDisplay.map((partner, idx) => {
              const id = 'partenaireId' in partner ? partner.partenaireId : (partner as { id?: string }).id;
              const name = ('partenaireName' in partner ? partner.partenaireName : (partner as { name?: string }).name) ?? id ?? String(idx);
              const initials = (name || '?').slice(0, 2).toUpperCase();
              const accentColor = 'accentColor' in partner && partner.accentColor ? partner.accentColor : 'rgba(18,194,233,0.25)';
              const category = 'category' in partner ? partner.category : null;
              const offre = 'offrePartenaire' in partner ? partner.offrePartenaire : null;
              const logoUrl = ('logoUrl' in partner && partner.logoUrl)
                ? String(partner.logoUrl)
                : (id ? partnerLogos[String(id)] ?? null : null);
              return (
                <View key={id ?? idx} style={styles.partnerChip}>
                  <View style={[
                    styles.partnerAvatar,
                    {
                      backgroundColor: logoUrl ? colors.white : (accentColor ?? 'rgba(18,194,233,0.25)'),
                      ...(logoUrl ? { borderWidth: 1, borderColor: '#E2E8F0' } : {}),
                    },
                  ]}>
                    {logoUrl ? (
                      <Image source={{ uri: normalizeImageUrl(logoUrl) }} style={styles.partnerLogo} resizeMode="contain" />
                    ) : (
                      <Text style={styles.partnerAvatarText}>{initials}</Text>
                    )}
                  </View>
                  <View style={styles.partnerChipContent}>
                    <Text style={styles.partnerName}>{name}</Text>
                    {!!category && <Text style={styles.partnerCategory}>{category}</Text>}
                    {!!offre && <Text style={styles.partnerOffre}>{offre}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
          {partnersForDisplay.length === 0 && (
            <Text style={styles.partnerEmpty}>Aucun partenaire renseigné pour cette Box.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cashback</Text>
          <Text style={styles.cardHighlight}>{box.cashbackInfo ?? 'Informations à venir.'}</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => Alert.alert('Box sélectionnée', 'La Box sera bientôt disponible à l’achat.')}>
          <LinearGradient
            colors={[colors.primaryBlue, colors.primaryPurple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGradient}>
            <Text style={styles.primaryText}>Choisir cette Box</Text>
          </LinearGradient>
        </TouchableOpacity>
      </AnimatedScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  bandeau: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
  },
  bandeauInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TAB_HEADER_HEIGHT,
    paddingVertical: spacing.sm,
  },
  bandeauIcon: {
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
  bandeauBadge: {
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
  bandeauBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  bandeauPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  bandeauPillPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 84,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#05A357',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  bandeauPillPointsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bandeauPillCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 84,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#616161',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  bandeauPillCashbackSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: '#424242',
    letterSpacing: 0.2,
  },
  bandeauPillCashbackValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#424242',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  scrollFill: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroImage: {
    height: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: 'rgba(18,194,233,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs / 1.5,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: colors.white,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroTexts: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  heroPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  partnerList: {
    gap: spacing.md,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerLogo: {
    width: '100%',
    height: '100%',
  },
  partnerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  partnerChipContent: {
    flex: 1,
    minWidth: 0,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  partnerCategory: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  partnerOffre: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  partnerEmpty: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  cardHighlight: {
    fontSize: 15,
    color: colors.primaryPurple,
    fontWeight: '700',
  },
  primaryButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
    textAlign: 'center',
  },
  secondaryButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryPurple,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.primaryPurple,
    fontWeight: '700',
  },
});

