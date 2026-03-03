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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';

import { getPartnerById } from '@/src/services/partnerService';
import { adaptPartnerFromApi } from '@/src/utils/partnerAdapter';
import type { PartnerViewModel } from '@/src/utils/partnerAdapter';
import { colors } from '../constants/theme';
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
  const showLogo = partner.logoUrl && partner.logoUrl.trim() !== '' && !logoError;
  return (
    <View style={styles.heroLogoContainer}>
      {showLogo ? (
        <Image
          source={{ uri: partner.logoUrl }}
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPartnerById(partnerId)
      .then((apiPartner) => {
        if (!cancelled) {
          setPartner(adaptPartnerFromApi(apiPartner));
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

  const openLink = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert("Lien indisponible", "Impossible d'ouvrir ce lien pour le moment.");
    });
  };

  const openDirections = useCallback(async () => {
    if (!partner) return;
    const { latitude, longitude, name, city } = partner;
    const addressQuery = `${name} ${city}`;
    const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
    const destination = hasCoords ? `${latitude},${longitude}` : encodeURIComponent(addressQuery);
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
  }, [partner]);

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
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => setIsFavorite((prev) => !prev)}
                accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                <FontAwesome name={isFavorite ? 'heart' : 'heart-o'} size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <HeroLogo partner={partner} />
              <Text style={styles.heroName}>{partner.name}</Text>
              <Text style={styles.heroLocation}>
                {partner.city}, {partner.country}
              </Text>
              {(partner.marketingPrograms?.includes('pepites') || partner.isRecommended) && (
                <View style={styles.heroPepiteBadge}>
                  <Text style={styles.heroPepiteText}>Pépite KashUP</Text>
                </View>
              )}
            </LinearGradient>
          </ImageBackground>
        </View>

        {(partner.address || partner.phone || partner.openingHours || (partner.openingDays && partner.openingDays.length > 0)) ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Contact & Horaires</Text>
            {partner.address ? (
              <View style={styles.contactRow}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <Text style={styles.contactValue}>{partner.address}</Text>
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
              label="Cartes UP"
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
              cashbackRate={partner.permanentOffer.rate}
              onSeeDetails={() => navigation.navigate('OfferTemplate', { partnerId: partner.id, offerType: 'voucher' })}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Localisation</Text>
          <Text style={styles.cardValueSmall}>
            {partner.city} • {partner.country}
          </Text>
          <Text style={styles.cardHint}>Planifiez votre trajet en un geste.</Text>
          <TouchableOpacity style={styles.mapButton} onPress={openDirections}>
            <Ionicons name="navigate-outline" size={18} color={colors.white} />
            <Text style={styles.mapButtonText}>Ouvrir l’itinéraire</Text>
          </TouchableOpacity>
        </View>

        {partner.websiteUrl ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Site internet</Text>
            <TouchableOpacity
              style={styles.websiteButton}
              onPress={() => openLink(partner.websiteUrl)}
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
            <ActionButton
              label="Instagram"
              icon="instagram"
              disabled={!partner.instagramUrl}
              onPress={() => openLink(partner.instagramUrl)}
            />
            <ActionButton
              label="Facebook"
              icon="facebook"
              disabled={!partner.facebookUrl}
              onPress={() => openLink(partner.facebookUrl)}
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

type ActionButtonProps = {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({ label, icon, onPress, disabled }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
      onPress={onPress}
      disabled={disabled}>
      <FontAwesome name={icon} size={16} color={disabled ? '#94A3B8' : '#0F172A'} />
      <Text style={[styles.actionButtonText, disabled && styles.actionButtonTextDisabled]}>{label}</Text>
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
      style={[styles.offerTabButton, isActive && styles.offerTabButtonActive]}
      onPress={onPress}>
      <Text style={[styles.offerTabButtonText, isActive && styles.offerTabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

type VoucherPanelProps = {
  accentColor: string;
  partnerName: string;
  cashbackRate: number;
  onSeeDetails: () => void;
};

function VoucherPanel({ accentColor, partnerName, cashbackRate, onSeeDetails }: VoucherPanelProps) {
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
        colors={[accentColor, `${accentColor}CC`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.giftCard}>
        <View style={styles.giftCardHeader}>
          <Text style={styles.giftCardPartner}>{partnerName}</Text>
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
        style={[styles.purchaseButton, { backgroundColor: canPurchase ? accentColor : '#E2E8F0' }]}
        disabled={!canPurchase}
        onPress={() =>
          Alert.alert(
            'Bientôt disponible',
            'L’achat de bons d’achat sera bientôt disponible directement dans l’application.'
          )
        }>
        <Text style={[styles.purchaseButtonText, !canPurchase && { color: '#94A3B8' }]}>
          Continuer
        </Text>
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
  favoriteButton: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
  heroPepiteBadge: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#FDF0FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  heroPepiteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryPurple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  offerTabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  offerTabButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  offerTabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  offerTabButtonTextActive: {
    color: '#0F172A',
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
    marginTop: 4,
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
  purchaseButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
  mapButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryBlue,
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

