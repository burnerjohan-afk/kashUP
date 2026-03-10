import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp, NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';

import { FacebookLogo, InstagramLogo } from '@/src/components/SocialLogos';

import { getPartnerById } from '@/src/services/partnerService';
import { adaptPartnerFromApi } from '@/src/utils/partnerAdapter';
import { normalizeImageUrl } from '@/src/utils/normalizeUrl';
import type { PartnerViewModel } from '@/src/utils/partnerAdapter';
import { useUserTerritory } from '@/src/hooks/useUserTerritory';
import { TERRITORY_OPTIONS, type TerritoryKey } from '@/src/utils/territoryFromLocation';
import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import { getCategoryAccent } from '../constants/categoryAccents';
import { getCategoryHeroImage } from '../constants/categoryHeroImages';
import type { MainStackParamList } from '../navigation/MainStack';

type PartnerDetailRouteProp = RouteProp<MainStackParamList, 'PartnerDetail'>;

const PRESENTATIONS: Record<string, string> = {
  'cat-supermarkets':
    '{name} simplifie les courses du quotidien à {city} avec une sélection locale et un service attentionné.',
  'cat-restaurants':
    '{name} fait voyager vos papilles à {city} avec une cuisine conviviale inspirée des saveurs caribéennes.',
  'cat-leisure':
    '{name} crée à {city} des moments ludiques et festifs pour profiter pleinement de chaque sortie.',
  'cat-services':
    '{name} accompagne les habitants de {city} avec des solutions fiables pour faciliter la vie locale.',
  'cat-wellness':
    '{name} offre des instants de détente à {city} à travers des soins pensés pour votre bien-être.',
  'cat-mobility':
    '{name} facilite vos déplacements à {city} avec des solutions de mobilité souples et responsables.',
  'cat-fashion':
    '{name} met à l’honneur les créateurs de {city} en proposant une mode audacieuse et locale.',
  'cat-sport':
    '{name} donne envie de bouger à {city} grâce à des activités sportives dynamiques et accessibles.',
  'cat-hospitality':
    '{name} accueille voyageurs et habitants à {city} dans une atmosphère chaleureuse et moderne.',
  'cat-education':
    '{name} partage son expertise à {city} pour former, inspirer et faire grandir les talents locaux.',
  'cat-health':
    '{name} veille sur le bien-être des familles à {city} avec un accompagnement humain et rassurant.',
};

const getPartnerPresentation = (partner: PartnerViewModel) => {
  const template = PRESENTATIONS[partner.categoryId];
  const base =
    template ??
    `${partner.name} s’engage à dynamiser l’économie locale de ${partner.city} avec une offre adaptée au quotidien.`;
  return base.replace('{name}', partner.name).replace('{city}', partner.city);
};

const DAY_LABELS: Record<string, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mer',
  thursday: 'Jeu',
  friday: 'Ven',
  saturday: 'Sam',
  sunday: 'Dim',
};
function formatOpeningDays(days: string[]): string {
  if (!days || days.length === 0) return '';
  const ordered = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sorted = [...days].filter(Boolean).map((d) => String(d).toLowerCase());
  const seen = new Set(sorted);
  const list = ordered.filter((d) => seen.has(d)).map((d) => DAY_LABELS[d] ?? d);
  return list.length > 0 ? list.join(', ') : days.join(', ');
}

type PartnerDetailNav = NavigationProp<MainStackParamList>;

function HeroLogo({ partner }: { partner: PartnerViewModel }) {
  const [logoError, setLogoError] = useState(false);
  const logoUri = partner.logoUrl && partner.logoUrl.trim() !== '' ? normalizeImageUrl(partner.logoUrl) : null;
  const showLogo = !!logoUri && !logoError;
  return (
    <View style={styles.heroLogoContainer}>
      {showLogo ? (
        <Image
          source={{ uri: logoUri }}
          style={styles.heroLogoImage}
          resizeMode="cover"
          onError={() => setLogoError(true)}
        />
      ) : (
        <Text style={styles.heroLogoText}>{partner.name.slice(0, 2).toUpperCase()}</Text>
      )}
    </View>
  );
}

export default function PartnerDetailScreen() {
  const navigation = useNavigation<PartnerDetailNav>();
  const route = useRoute<PartnerDetailRouteProp>();
  const partnerId = route.params.partnerId;

  const [partner, setPartner] = useState<PartnerViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [welcomeUsed, setWelcomeUsed] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [activeOfferTab, setActiveOfferTab] = useState<'cashback' | 'vouchers'>('cashback');
  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryKey | null>(null);

  const { territory: userTerritory } = useUserTerritory();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPartnerById(partnerId)
      .then((apiPartner) => {
        if (!cancelled) {
          const adapted = adaptPartnerFromApi(apiPartner);
          setPartner(adapted);
          const territories = adapted.territories && adapted.territories.length > 0
            ? adapted.territories
            : ['Martinique'];
          const normalized = territories.map((t) => String(t).charAt(0).toUpperCase() + String(t).slice(1).toLowerCase()) as TerritoryKey[];
          const preferred = (userTerritory && normalized.includes(userTerritory)) ? userTerritory : (normalized[0] ?? 'Martinique');
          setSelectedTerritory(preferred);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Partenaire introuvable');
          setPartner(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  // Synchroniser le département affiché avec la localisation utilisateur quand elle est disponible
  useEffect(() => {
    if (!partner || !userTerritory) return;
    const list = partner.territories && partner.territories.length > 0
      ? partner.territories.map((t) => String(t).charAt(0).toUpperCase() + String(t).slice(1).toLowerCase())
      : ['Martinique'];
    if (list.includes(userTerritory)) {
      setSelectedTerritory(userTerritory);
    }
  }, [partner?.id, userTerritory, partner?.territories]);

  const openLink = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert("Lien indisponible", "Impossible d'ouvrir ce lien pour le moment.");
    });
  };

  // Adresse et réseaux selon le département sélectionné (territoryDetails) ou valeurs globales du partenaire
  const displayContact = useMemo(() => {
    if (!partner) return { address: '', websiteUrl: '', facebookUrl: '', instagramUrl: '' };
    const dept = selectedTerritory ?? (partner.territories?.[0] ? String(partner.territories[0]).charAt(0).toUpperCase() + String(partner.territories[0]).slice(1).toLowerCase() : 'Martinique') as TerritoryKey;
    const details = partner.territoryDetails?.[dept];
    return {
      address: (details?.address && details.address.trim()) ? details.address : (partner.address ?? ''),
      websiteUrl: (details?.websiteUrl && details.websiteUrl.trim()) ? details.websiteUrl : (partner.websiteUrl ?? ''),
      facebookUrl: (details?.facebookUrl && details.facebookUrl.trim()) ? details.facebookUrl : (partner.facebookUrl ?? ''),
      instagramUrl: (details?.instagramUrl && details.instagramUrl.trim()) ? details.instagramUrl : (partner.instagramUrl ?? ''),
    };
  }, [partner, selectedTerritory]);

  const availableTerritoriesForPartner = useMemo(() => {
    if (!partner?.territories?.length) return [];
    return TERRITORY_OPTIONS.filter((t) =>
      partner.territories!.some((pt) => String(pt).toLowerCase() === t.toLowerCase())
    );
  }, [partner?.territories]);

  const heroBadges = useMemo(() => {
    const list: Array<{ key: string; label: string; style: 'pepite' | 'boosted' | 'popular' }> = [];
    if (!partner) return list;
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
  }, [partner?.marketingPrograms, partner?.isRecommended, partner?.isBoosted, partner?.isPopular]);

  const openDirections = useCallback(async () => {
    if (!partner) return;
    const { latitude, longitude, name, city } = partner;
    const addressForDir = displayContact.address?.trim() || `${name} ${city}`;
    const addressQuery = addressForDir;
    const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
    const destination = hasCoords ? `${latitude},${longitude}` : encodeURIComponent(addressQuery || `${name} ${city}`);
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    const appleUrl = hasCoords
      ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
      : `http://maps.apple.com/?daddr=${encodeURIComponent(addressQuery)}`;
    const wazeUrl = hasCoords
      ? `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(addressQuery)}&navigate=yes`;

    const showPlan = Platform.OS === 'ios';
    const hasWaze = await Linking.canOpenURL('waze://');

    const buttons: Array<{ text: string; onPress: () => void }> = [];
    if (showPlan) {
      buttons.push({ text: 'Plan', onPress: () => Linking.openURL(appleUrl) });
    }
    buttons.push({ text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) });
    if (hasWaze) {
      buttons.push({ text: 'Waze', onPress: () => Linking.openURL(wazeUrl) });
    }

    if (buttons.length === 0) {
      Alert.alert(
        'Carte indisponible',
        "Aucune application de navigation n'est installée. Installez Google Maps ou Waze pour calculer un itinéraire.",
      );
      return;
    }

    Alert.alert("Ouvrir l'itinéraire avec", '', [
      ...buttons,
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }, [partner, displayContact]);

  // Tous les hooks doivent être appelés avant tout return conditionnel (règles des Hooks React)
  const presentation = useMemo(
    () => (partner ? getPartnerPresentation(partner) : ''),
    [partner]
  );
  const sectorImage = useMemo(
    () =>
      partner
        ? (partner.heroImageUrl && partner.heroImageUrl.trim() !== ''
            ? partner.heroImageUrl
            : getCategoryHeroImage(partner.categoryId, partner.categoryName))
        : '',
    [partner?.heroImageUrl, partner?.categoryId, partner?.categoryName]
  );
  const accentColor = partner ? getCategoryAccent(partner.categoryId) : colors.primary;
  const isLongPresentation = presentation.length > 200;
  const presentationText =
    showFullDescription || !isLongPresentation
      ? presentation
      : `${presentation.slice(0, 200).trim()}…`;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.missingText, { marginTop: 12 }]}>Chargement du partenaire…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !partner) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missingContainer}>
          <Text style={styles.missingText}>{error ?? 'Partenaire introuvable.'}</Text>
          <TouchableOpacity style={styles.backFallback} onPress={() => navigation.goBack()}>
            <Text style={styles.backFallbackText}>Revenir à la liste</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ImageBackground
            source={{ uri: sectorImage }}
            style={styles.heroBackground}
            resizeMode="cover">
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.6)']}
              style={styles.heroOverlay}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <FontAwesome name="chevron-left" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.favoriteButtonWrapper} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.favoriteButtonTouchable}
                  onPress={() => setIsFavorite((prev) => !prev)}
                  activeOpacity={1}
                  accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                  <View style={styles.favoriteButtonInner} collapsable={false}>
                    <View style={[styles.favoriteHeartLayer, !isFavorite && styles.favoriteHeartLayerHidden]}>
                      <MaskedView
                        style={styles.favoriteButton}
                        maskElement={
                          <View style={styles.favoriteHeartMask}>
                            <FontAwesome name="heart" size={20} color="#000000" />
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
                    </View>
                    <View style={[styles.favoriteHeartLayer, isFavorite && styles.favoriteHeartLayerHidden]}>
                      <View style={styles.favoriteButton}>
                        <FontAwesome name="heart-o" size={20} color="#FFFFFF" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
              <HeroLogo partner={partner} />
              <Text style={styles.heroName}>{partner.name}</Text>
              <Text style={styles.heroLocation}>{partner.city}</Text>
              {heroBadges.length > 0 ? (
                <View style={styles.heroBadgesRow}>
                  {heroBadges.map((b) => (
                    <View
                      key={b.key}
                      style={[
                        styles.heroBadgePill,
                        b.style === 'pepite' && styles.heroBadgePepite,
                        b.style === 'boosted' && styles.heroBadgeBoosted,
                        b.style === 'popular' && styles.heroBadgePopular,
                      ]}>
                      {b.style === 'pepite' && <Ionicons name="star" size={10} color={colors.accentYellow} />}
                      {b.style === 'boosted' && <Ionicons name="flash" size={10} color={colors.white} />}
                      {b.style === 'popular' && <Ionicons name="trending-up" size={10} color={colors.white} />}
                      <Text
                        style={[
                          styles.heroBadgePillText,
                          b.style === 'boosted' && styles.heroBadgePillTextBoosted,
                          b.style === 'popular' && styles.heroBadgePillTextPopular,
                        ]}
                        numberOfLines={1}>
                        {b.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </LinearGradient>
          </ImageBackground>
        </View>

        {availableTerritoriesForPartner.length >= 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Département</Text>
            <Text style={styles.cardHint}>
              {availableTerritoriesForPartner.length > 1
                ? 'Choisissez le département pour afficher l\'adresse et les réseaux correspondants.'
                : 'Département du partenaire.'}
            </Text>
            <View style={styles.territorySelector}>
              {availableTerritoriesForPartner.map((dept) => {
                const isActive = selectedTerritory === dept;
                return (
                  <TouchableOpacity
                    key={dept}
                    style={[styles.territoryChipWrap, isActive && styles.territoryChipWrapActive]}
                    onPress={() => setSelectedTerritory(dept)}
                    accessibilityLabel={`Voir les infos pour ${dept}`}>
                    {isActive ? (
                      <LinearGradient
                        colors={[...CARD_GRADIENT_COLORS]}
                        locations={[...CARD_GRADIENT_LOCATIONS]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.territoryChip}>
                        <Text style={styles.territoryChipTextActive}>{dept}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.territoryChip}>
                        <Text style={styles.territoryChipText}>{dept}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {(displayContact.address || partner.phone || partner.openingHours || (partner.openingDays && partner.openingDays.length > 0)) ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Contact & Horaires</Text>
            {displayContact.address ? (
              <View style={styles.contactRow}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <Text style={styles.contactValue}>{displayContact.address}</Text>
              </View>
            ) : null}
            {partner.phone ? (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(`tel:${partner.phone!.replace(/\s/g, '')}`)}
                accessibilityLabel="Appeler le partenaire">
                <Ionicons name="call-outline" size={20} color={colors.primary} />
                <Text style={styles.contactValue}>{partner.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {partner.openingHours ? (
              <View style={styles.contactRow}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={styles.contactValue}>{partner.openingHours}</Text>
              </View>
            ) : null}
            {partner.openingDays && partner.openingDays.length > 0 ? (
              <View style={styles.contactRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.contactValue}>
                  {formatOpeningDays(partner.openingDays)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Offres KashUP</Text>
          <View style={styles.offerTabs}>
            <OfferTabButton
              label="Cashback"
              isActive={activeOfferTab === 'cashback'}
              onPress={() => setActiveOfferTab('cashback')}
            />
            <OfferTabButton
              label="Bon d'achat"
              isActive={activeOfferTab === 'vouchers'}
              onPress={() => setActiveOfferTab('vouchers')}
            />
          </View>
          {activeOfferTab === 'cashback' ? (
            <>
              <View style={styles.detailOfferRow}>
            <DetailOfferChip
                  label="Offre de bienvenue"
                  rate={partner.welcomeOffer.rate}
                  icon="gift-outline"
                  muted={welcomeUsed}
                  accentColor="#7C3AED"
                  exclusive
              onPress={() => navigation.navigate('OfferTemplate', { partnerId: partner.id, offerType: 'welcome' })}
                  hint={welcomeUsed ? 'Déjà utilisée' : 'Utilisable une fois'}
                />
                <DetailOfferChip
                  label="Offre permanente"
                  rate={partner.permanentOffer.rate}
                  icon="pricetag-outline"
                  accentColor={colors.primary}
              onPress={() => navigation.navigate('OfferTemplate', { partnerId: partner.id, offerType: 'permanent' })}
                  hint="Toujours active"
                />
              </View>
              {typeof partner.pointsPerTransaction === 'number' && partner.pointsPerTransaction > 0 ? (
                <View style={styles.pointsRow}>
                  <Ionicons name="star" size={18} color={colors.accentYellow} />
                  <Text style={styles.pointsText}>
                    {partner.pointsPerTransaction} point{partner.pointsPerTransaction > 1 ? 's' : ''} par transaction
                  </Text>
                </View>
              ) : null}
              <View style={styles.presentationBlock}>
                <Text style={styles.presentationText}>{presentationText}</Text>
                {isLongPresentation && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => setShowFullDescription((prev) => !prev)}>
                    <Text style={styles.seeMoreText}>{showFullDescription ? 'Voir moins' : 'Voir plus'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <VoucherPanel
              accentColor={accentColor}
              partnerName={partner.name}
              logoUrl={partner.logoUrl}
              cashbackRate={partner.permanentOffer.rate}
              onSeeDetails={() => navigation.navigate('OfferTemplate', { partnerId: partner.id, offerType: 'voucher' })}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Localisation</Text>
          <Text style={styles.cardHint}>Planifiez votre trajet en un geste.</Text>
          <TouchableOpacity style={styles.mapButtonWrap} onPress={openDirections} activeOpacity={0.85}>
            <LinearGradient
              colors={[...CARD_GRADIENT_COLORS]}
              locations={[...CARD_GRADIENT_LOCATIONS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mapButton}>
              <Ionicons name="navigate-outline" size={18} color={colors.white} />
            <Text style={styles.mapButtonText}>Ouvrir l’itinéraire</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {displayContact.websiteUrl ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Site internet</Text>
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={() => openLink(displayContact.websiteUrl)}
              accessibilityLabel="Voir le site internet">
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <Text style={styles.websiteButtonText}>Voir le site internet</Text>
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.actionsCard}>
          <Text style={styles.cardLabel}>Actions rapides</Text>
          <View style={styles.actionsRow}>
            <SocialButton
              label="Instagram"
              logo="instagram"
              disabled={!displayContact.instagramUrl}
              onPress={() => openLink(displayContact.instagramUrl)}
            />
            <SocialButton
              label="Facebook"
              logo="facebook"
              disabled={!displayContact.facebookUrl}
              onPress={() => openLink(displayContact.facebookUrl)}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pourquoi on l'adore</Text>
          <Text style={styles.description}>
            {(partner.marketingPrograms?.includes('boosted') || partner.isBoosted)
              ? "Ce partenaire est boosté en ce moment, profitez d'un cashback augmenté."
              : "Profitez de vos achats locaux pour cumuler du pouvoir d'achat KashUP."}
          </Text>
          <Text style={styles.favoriteHint}>
            {isFavorite ? 'Partenaire ajouté à vos favoris.' : 'Ajouter ce partenaire à mes favoris'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SocialButtonProps = {
  label: string;
  logo: 'instagram' | 'facebook';
  onPress: () => void;
  disabled?: boolean;
};

const INSTAGRAM_COLOR = '#E1306C';
const FACEBOOK_COLOR = '#1877F2';

function SocialButton({ label, logo, onPress, disabled }: SocialButtonProps) {
  const brandColor = logo === 'instagram' ? INSTAGRAM_COLOR : FACEBOOK_COLOR;
  const iconColor = disabled ? '#94A3B8' : brandColor;
  const textColor = disabled ? undefined : brandColor;
  const LogoComponent = logo === 'instagram' ? InstagramLogo : FacebookLogo;
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        disabled && styles.actionButtonDisabled,
        !disabled && { backgroundColor: `${brandColor}14` },
      ]}
      onPress={onPress}
      disabled={disabled}>
      <LogoComponent size={20} color={iconColor} />
      <Text
        style={[
          styles.actionButtonText,
          disabled && styles.actionButtonTextDisabled,
          !disabled && textColor && { color: textColor },
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function heroGradientForCountry(country: string): [string, string] {
  switch (country) {
    case 'Martinique':
      return [colors.primaryBlue, colors.primaryPurple];
    case 'Guadeloupe':
      return [colors.primaryPurple, colors.primaryGreen];
    case 'Guyane':
      return [colors.primaryGreen, colors.primaryBlue];
    default:
      return [colors.primaryGreen, colors.primaryBlue];
  }
}

type DetailOfferChipProps = {
  label: string;
  rate: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  muted?: boolean;
  hint?: string;
  onPress?: () => void;
  accentColor?: string;
  exclusive?: boolean;
};

function DetailOfferChip({
  label,
  rate,
  icon,
  muted,
  hint,
  onPress,
  accentColor,
  exclusive,
}: DetailOfferChipProps) {
  const accent = accentColor ?? colors.primaryPurple;
  const chipStyle = [
    styles.detailOfferChip,
    { borderColor: accent },
    muted && styles.detailOfferChipMuted,
  ];
  const content = (
    <>
      <View style={styles.detailOfferHeader}>
        <Ionicons
          name={icon}
          size={16}
          color={muted ? '#94A3B8' : accent}
        />
        <Text
          style={[
            styles.detailOfferLabel,
            muted && styles.detailOfferLabelMuted,
            styles.detailOfferLabelShrink,
          ]}>
          {label}
        </Text>
      </View>
      <View style={styles.detailOfferRateRow}>
        <Text style={[styles.detailOfferRate, { color: accent }, muted && styles.detailOfferRateMuted]}>
          {rate}%
        </Text>
        {exclusive && (
          <View style={styles.detailExclusiveInline}>
            <Ionicons name="star" size={13} color="#F5C043" />
            <Text style={styles.detailExclusiveInlineText}>Exclu</Text>
          </View>
        )}
      </View>
      {!!hint && <Text style={[styles.detailOfferHint, muted && styles.detailOfferHintMuted]}>{hint}</Text>}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={chipStyle} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={chipStyle}>{content}</View>;
}

type OfferTabButtonProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function OfferTabButton({ label, isActive, onPress }: OfferTabButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.offerTabButtonWrap, isActive && styles.offerTabButtonWrapActive]}
      onPress={onPress}
      activeOpacity={0.85}>
      {isActive ? (
        <LinearGradient
          colors={[...CARD_GRADIENT_COLORS]}
          locations={[...CARD_GRADIENT_LOCATIONS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.offerTabButton}>
          <Text style={styles.offerTabButtonTextActive}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.offerTabButton}>
          <Text style={styles.offerTabButtonText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

type VoucherPanelProps = {
  accentColor: string;
  partnerName: string;
  logoUrl?: string | null;
  cashbackRate: number;
  onSeeDetails: () => void;
};

function VoucherPanel({ accentColor, partnerName, logoUrl, cashbackRate, onSeeDetails }: VoucherPanelProps) {
  const [logoError, setLogoError] = useState(false);
  const logoUri = logoUrl && logoUrl.trim() !== '' ? normalizeImageUrl(logoUrl) : null;
  const showLogo = !!logoUri && !logoError;
  const presetAmounts = [5, 20, 50, 100, 150];
  const [quantities, setQuantities] = useState<Record<number, number>>(
    presetAmounts.reduce((acc, value) => ({ ...acc, [value]: 0 }), {})
  );
  const [customAmount, setCustomAmount] = useState('');
  const [customQuantity, setCustomQuantity] = useState(0);

  const handleQuantityChange = (amount: number, delta: number) => {
    setQuantities((prev) => {
      const next = { ...prev };
      next[amount] = Math.max(0, (next[amount] ?? 0) + delta);
      return next;
    });
  };

  const parsedCustomAmount = Number(customAmount);
  const validCustomAmount = !isNaN(parsedCustomAmount) ? parsedCustomAmount : 0;
  const subtotal = presetAmounts.reduce((sum, value) => sum + value * (quantities[value] ?? 0), 0);
  const customSubtotal = validCustomAmount * customQuantity;
  const total = subtotal + customSubtotal;
  const canPurchase = total > 0;

  return (
    <View style={styles.voucherPanel}>
      <LinearGradient
        colors={[...CARD_GRADIENT_COLORS]}
        locations={[...CARD_GRADIENT_LOCATIONS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.giftCard}>
        <View style={styles.giftCardHeader}>
          <View style={styles.giftCardLogoRow}>
            <View style={styles.giftCardLogoWrap}>
              {showLogo ? (
                <Image
                  source={{ uri: logoUri! }}
                  style={styles.giftCardLogo}
                  resizeMode="cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Text style={styles.giftCardLogoFallback} numberOfLines={1}>
                  {partnerName.slice(0, 2).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.giftCardPartner} numberOfLines={2}>{partnerName}</Text>
          </View>
          <View style={styles.giftCardIcon}>
            <Ionicons name="card-outline" size={16} color="#FFFFFF" />
            <Text style={styles.giftCardIconText}>
              {Object.values(quantities).reduce((a, b) => a + b, 0) + customQuantity}
            </Text>
          </View>
        </View>
        <Text style={styles.giftCardAmount}>{total > 0 ? `${total} €` : '0 €'}</Text>
        <View style={styles.giftCardCashback}>
          <Ionicons name="gift-outline" size={14} color="#FFFFFF" />
          <Text style={styles.giftCardCashbackText}>{cashbackRate}% de cashback immédiat</Text>
        </View>
        <TouchableOpacity style={styles.conditionsButton} onPress={onSeeDetails}>
          <Text style={styles.conditionsButtonText}>Voir toutes les conditions</Text>
        </TouchableOpacity>
      </LinearGradient>

      {presetAmounts.map((value) => (
        <View key={value} style={styles.amountRow}>
          <Text style={styles.amountRowLabel}>Bon de {value} €</Text>
          <View style={styles.amountRowControls}>
            <TouchableOpacity onPress={() => handleQuantityChange(value, -1)} style={styles.quantityButton}>
              <Ionicons name="remove" size={14} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.amountRowValue}>{quantities[value]}</Text>
            <TouchableOpacity onPress={() => handleQuantityChange(value, 1)} style={styles.quantityButton}>
              <Ionicons name="add" size={14} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.customAmountRow}>
        <Text style={styles.customLabel}>Montant personnalisé</Text>
        <View style={styles.customInputRow}>
          <View style={styles.customInputWrapper}>
            <Text style={styles.currencyPrefix}>€</Text>
            <TextInput
              value={customAmount}
              onChangeText={(value) => setCustomAmount(value.replace(/[^0-9]/g, ''))}
              placeholder="Ex: 75"
              keyboardType="numeric"
              style={styles.customInput}
            />
          </View>
          <View style={styles.amountRowControls}>
            <TouchableOpacity onPress={() => setCustomQuantity((prev) => Math.max(0, prev - 1))} style={styles.quantityButton}>
              <Ionicons name="remove" size={14} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.amountRowValue}>{customQuantity}</Text>
            <TouchableOpacity onPress={() => setCustomQuantity((prev) => prev + 1)} style={styles.quantityButton}>
              <Ionicons name="add" size={14} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
        </View>
        <Text style={styles.cashbackHint}>Cashback crédité instantanément</Text>
      </View>

      <TouchableOpacity
        style={[styles.purchaseButtonWrap, !canPurchase && styles.purchaseButtonWrapDisabled]}
        disabled={!canPurchase}
        onPress={() =>
          Alert.alert(
            'Bientôt disponible',
            'L’achat de bons d’achat sera bientôt disponible directement dans l’application.'
          )
        }
        activeOpacity={0.85}>
        {canPurchase ? (
          <LinearGradient
            colors={[...CARD_GRADIENT_COLORS]}
            locations={[...CARD_GRADIENT_LOCATIONS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.purchaseButton}>
            <Text style={styles.purchaseButtonText}>Continuer</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.purchaseButton, styles.purchaseButtonDisabled]}>
            <Text style={[styles.purchaseButtonText, styles.purchaseButtonTextDisabled]}>Continuer</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.howItWorksButton} onPress={onSeeDetails}>
        <Text style={styles.howItWorksText}>Comment ça marche</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    minHeight: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroBackground: {
    width: '100%',
    minHeight: 280,
  },
  heroOverlay: {
    flex: 1,
    minHeight: 280,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonWrapper: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 42,
    height: 42,
    minWidth: 42,
    minHeight: 42,
    maxWidth: 42,
    maxHeight: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  favoriteButtonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 42,
    height: 42,
    minWidth: 42,
    minHeight: 42,
  },
  favoriteHeartLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 42,
    height: 42,
    minWidth: 42,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteHeartLayerHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  favoriteButton: {
    width: 42,
    height: 42,
    minWidth: 42,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteHeartMask: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoContainer: {
    marginTop: 36,
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoImage: {
    width: '100%',
    height: '100%',
  },
  heroLogoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
  },
  heroName: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroLocation: {
    marginTop: 6,
    fontSize: 16,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  heroBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 18,
  },
  heroBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  heroBadgePepite: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  heroBadgeBoosted: {
    backgroundColor: '#05A357',
  },
  heroBadgePopular: {
    backgroundColor: '#EA580C',
  },
  heroBadgePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMain,
  },
  heroBadgePillTextBoosted: {
    color: colors.white,
  },
  heroBadgePillTextPopular: {
    color: colors.white,
  },
  heroDistance: {
    marginTop: 4,
    fontSize: 13,
    color: '#E2E8F0',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    shadowColor: '#1E1E1E',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  detailOfferRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
  },
  detailOfferChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    position: 'relative',
  },
  detailOfferChipMuted: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  detailOfferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailOfferLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    flexShrink: 1,
  },
  detailOfferLabelShrink: {
    flexShrink: 1,
  },
  detailOfferLabelMuted: {
    color: '#94A3B8',
  },
  detailOfferRate: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailOfferRateMuted: {
    color: '#94A3B8',
  },
  detailOfferRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailOfferHint: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  detailOfferHintMuted: {
    color: '#94A3B8',
  },
  detailExclusiveInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailExclusiveInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F5C043',
    textTransform: 'uppercase',
  },
  presentationBlock: {
    marginTop: 12,
  },
  presentationText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1F2937',
  },
  seeMoreButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  seeMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryPurple,
  },
  offerTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 999,
    marginBottom: 16,
  },
  offerTabButtonWrap: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  offerTabButtonWrapActive: {
    overflow: 'hidden',
  },
  offerTabButton: {
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  offerTabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  offerTabButtonTextActive: {
    color: '#FFFFFF',
  },
  voucherPanel: {
    gap: 12,
  },
  voucherDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  giftCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  giftCardChip: {
    width: 36,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  giftCardLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  giftCardPartner: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  giftCardAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  giftCardHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  giftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  giftCardLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  giftCardLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  giftCardLogo: {
    width: '100%',
    height: '100%',
  },
  giftCardLogoFallback: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  giftCardIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  giftCardIconText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  giftCardCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  giftCardCashbackText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  conditionsButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  conditionsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  amountSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  amountRowLabel: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  amountRowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  amountRowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  amountChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  amountChipText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  customAmountRow: {
    marginTop: 12,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 4,
  },
  customInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#0F172A',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  cashbackHint: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  purchaseButtonWrap: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  purchaseButtonWrapDisabled: {
    overflow: 'hidden',
  },
  purchaseButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  purchaseButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  purchaseButtonTextDisabled: {
    color: '#94A3B8',
  },
  howItWorksButton: {
    alignSelf: 'center',
    marginTop: 12,
  },
  howItWorksText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
  voucherInfo: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardValueSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  territorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  territoryChipWrap: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  territoryChipWrapActive: {
    overflow: 'hidden',
  },
  territoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  territoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
  },
  territoryChipTextActive: {
    color: colors.white,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  contactValue: {
    fontSize: 16,
    color: colors.textMain,
    fontWeight: '600',
    flex: 1,
  },
  mapButtonWrap: {
    marginTop: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
  },
  mapButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E9F6FF',
    borderRadius: 12,
  },
  websiteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  actionsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: '#E9F6FF',
    padding: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  actionButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionButtonTextDisabled: {
    color: '#94A3B8',
  },
  description: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  favoriteHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  missingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  missingText: {
    fontSize: 18,
    color: '#0F172A',
    marginBottom: 16,
  },
  backFallback: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: '#0F172A',
  },
  backFallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

