import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGiftCards } from '@/src/hooks/useGiftCards';
import { useRewards } from '@/src/hooks/useRewards';
import { useWallet } from '@/src/hooks/useWallet';
import { useWebhookEvents } from '@/src/hooks/useWebhookEvents';
import {
  getGiftBoxes,
  sendBoxUp,
  getGiftCardOffers,
  getCartesUpLibresForApp,
  sendPredefinedGift,
  sendSelectionUp,
  createGiftCardPaymentIntent,
  confirmCardPaymentForGift,
  GiftBox,
  GiftCardOffer,
  GiftCardPurchase,
  type CarteUpLibre,
  uploadGiftVideo,
} from '@/src/services/giftCardService';
import { usePaymentSheet } from '../src/stubs/stripePaymentSheet';
import { getPartners } from '@/src/services/partnerService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TabScreenHeader, TAB_HEADER_HEIGHT, TAB_HEADER_TOP_OFFSET } from '@/src/components/TabScreenHeader';
import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import { useNotifications } from '../context/NotificationsContext';
import type { Partner } from '../data/partners';
import type { BottomTabParamList } from '../navigation/BottomTabs';
import { MainStackParamList } from '../navigation/MainStack';
import { useAuth } from '../context/AuthContext';
import { useKYCGuard } from '../src/guards/kycGuard';
import { normalizeImageUrl } from '../src/utils/normalizeUrl';
import { ApiError } from '../src/types/api';
import { VoucherPayload } from '../types/vouchers';
import { useGiftVideo } from '@/src/hooks/useGiftVideo';
import { getApiBaseUrl } from '@/src/config/api';
import { GiftVideoPreview } from '@/src/components/GiftVideoPreview';

/** Extrait le message d'erreur API (401 → message session, sinon message backend ou générique). */
function getApiErrorMessage(error: unknown, fallback: string): string {
  const status = (error as { response?: { status?: number }; statusCode?: number })?.response?.status
    ?? (error as ApiError)?.statusCode;
  if (status === 401) {
    return 'Session expirée. Veuillez vous reconnecter.';
  }
  const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? (error instanceof Error ? error.message : fallback);
  return msg || fallback;
}

/** Aligné back office : Mes cartes | Cartes UP | Box UP */
type TabKey = 'mes' | 'cartes-up' | 'box-up';
type CartesUpSubTab = 'selection' | 'predefinie';
type VoucherItem = VoucherPayload;

type PartnerPickerTarget = 'personal' | 'gift';

const CARD_THEMES = [
  { id: 'classic', label: 'Classique', colors: ['#12C2E9', '#A445FF'] },
  { id: 'anniversaire', label: 'Anniversaire', colors: ['#FF9A9E', '#FAD0C4'] },
  { id: 'merci', label: 'Merci', colors: ['#C6FFDD', '#FBD786'] },
  { id: 'felicitations', label: 'Félicitations', colors: ['#84FAB0', '#8FD3F4'] },
];

const MACARON_PRESETS = [
  'Joyeux anniversaire',
  'Plaisir d\'offrir',
  'Bonne fête',
  'Félicitations',
  'Bonne fête maman',
  'Bonne fête papa',
  'Joyeuse Saint-Valentin',
  'Bonne fête mamie',
  'Bonne fête papi',
];

/** Couleurs pour la carte test (aligné back office) */
const TEXT_COLORS_CARTE = [
  { id: 'noir', label: 'Noir', value: '#1a1a2e' },
  { id: 'bleu', label: 'Bleu foncé', value: '#1e3a5f' },
  { id: 'bordeaux', label: 'Bordeaux', value: '#6b2d3c' },
  { id: 'vert', label: 'Vert forêt', value: '#1b4332' },
  { id: 'violet', label: 'Violet', value: '#3d2464' },
];
const MACARON_COLORS_CARTE = [
  { id: 'primary', label: 'Vert', value: '#047857' },
  { id: 'rouge', label: 'Rouge', value: '#c41e3a' },
  { id: 'or', label: 'Or', value: '#b8860b' },
  { id: 'violet', label: 'Violet', value: '#6f42c1' },
  { id: 'bleu', label: 'Bleu', value: '#0d6efd' },
];
const BACKGROUND_COLORS_CARTE = [
  { id: 'blanc', label: 'Blanc', value: '#ffffff' },
  { id: 'creme', label: 'Crème', value: '#fef9e7' },
  { id: 'gris', label: 'Gris clair', value: '#f5f5f5' },
  { id: 'bleu', label: 'Bleu clair', value: '#e8f4fd' },
  { id: 'rose', label: 'Rose clair', value: '#fce4ec' },
  { id: 'lavande', label: 'Lavande', value: '#ede7f6' },
];

/** Grille de couleurs étendue pour macarons (presets + palette) */
const MACARON_PALETTE_GRID: Array<{ id: string; value: string }> = [
  ...MACARON_COLORS_CARTE,
  { id: '#e74c3c', value: '#e74c3c' },
  { id: '#c0392b', value: '#c0392b' },
  { id: '#e67e22', value: '#e67e22' },
  { id: '#d35400', value: '#d35400' },
  { id: '#f39c12', value: '#f39c12' },
  { id: '#f1c40f', value: '#f1c40f' },
  { id: '#2ecc71', value: '#2ecc71' },
  { id: '#27ae60', value: '#27ae60' },
  { id: '#1abc9c', value: '#1abc9c' },
  { id: '#16a085', value: '#16a085' },
  { id: '#3498db', value: '#3498db' },
  { id: '#2980b9', value: '#2980b9' },
  { id: '#9b59b6', value: '#9b59b6' },
  { id: '#8e44ad', value: '#8e44ad' },
  { id: '#e91e63', value: '#e91e63' },
  { id: '#c2185b', value: '#c2185b' },
  { id: '#009688', value: '#009688' },
  { id: '#795548', value: '#795548' },
  { id: '#5d4037', value: '#5d4037' },
  { id: '#607d8b', value: '#607d8b' },
  { id: '#455a64', value: '#455a64' },
  { id: '#37474f', value: '#37474f' },
  { id: '#263238', value: '#263238' },
  { id: '#ff5722', value: '#ff5722' },
  { id: '#ff9800', value: '#ff9800' },
  { id: '#ffeb3b', value: '#ffeb3b' },
  { id: '#8bc34a', value: '#8bc34a' },
  { id: '#4caf50', value: '#4caf50' },
  { id: '#03a9f4', value: '#03a9f4' },
  { id: '#2196f3', value: '#2196f3' },
  { id: '#3f51b5', value: '#3f51b5' },
  { id: '#673ab7', value: '#673ab7' },
  { id: '#9c27b0', value: '#9c27b0' },
  { id: '#f44336', value: '#f44336' },
];

/** Grille de couleurs étendue pour fond de carte (presets + palette vive) */
const BACKGROUND_PALETTE_GRID: Array<{ id: string; value: string }> = [
  ...BACKGROUND_COLORS_CARTE,
  { id: '#bbdefb', value: '#bbdefb' },
  { id: '#90caf9', value: '#90caf9' },
  { id: '#64b5f6', value: '#64b5f6' },
  { id: '#b3e5fc', value: '#b3e5fc' },
  { id: '#81d4fa', value: '#81d4fa' },
  { id: '#b2ebf2', value: '#b2ebf2' },
  { id: '#80deea', value: '#80deea' },
  { id: '#c8e6c9', value: '#c8e6c9' },
  { id: '#a5d6a7', value: '#a5d6a7' },
  { id: '#81c784', value: '#81c784' },
  { id: '#b2dfdb', value: '#b2dfdb' },
  { id: '#80cbc4', value: '#80cbc4' },
  { id: '#f8bbd9', value: '#f8bbd9' },
  { id: '#f48fb1', value: '#f48fb1' },
  { id: '#f06292', value: '#f06292' },
  { id: '#ffccbc', value: '#ffccbc' },
  { id: '#ffab91', value: '#ffab91' },
  { id: '#ffe0b2', value: '#ffe0b2' },
  { id: '#ffcc80', value: '#ffcc80' },
  { id: '#fff9c4', value: '#fff9c4' },
  { id: '#fff59d', value: '#fff59d' },
  { id: '#d1c4e9', value: '#d1c4e9' },
  { id: '#b39ddb', value: '#b39ddb' },
  { id: '#9575cd', value: '#9575cd' },
  { id: '#e1bee7', value: '#e1bee7' },
  { id: '#ce93d8', value: '#ce93d8' },
  { id: '#c5cae9', value: '#c5cae9' },
  { id: '#9fa8da', value: '#9fa8da' },
  { id: '#b0bec5', value: '#b0bec5' },
  { id: '#cfd8dc', value: '#cfd8dc' },
  { id: '#ffecb3', value: '#ffecb3' },
  { id: '#ffe082', value: '#ffe082' },
  { id: '#d7ccc8', value: '#d7ccc8' },
  { id: '#bcaaa4', value: '#bcaaa4' },
  { id: '#ffb74d', value: '#ffb74d' },
];

/** Polices pour la carte test (aligné back office) */
const FONT_OPTIONS_CARTE = [
  { id: 'dancing', label: 'Festive', fontFamily: undefined as string | undefined, fontStyle: 'italic' as const, fontWeight: '600' as const },
  { id: 'georgia', label: 'Élégante', fontFamily: 'Georgia', fontStyle: 'normal' as const, fontWeight: '600' as const },
  { id: 'system', label: 'Classique', fontFamily: undefined, fontStyle: 'normal' as const, fontWeight: '600' as const },
];

const TERRITORIES: Array<'Martinique' | 'Guadeloupe' | 'Guyane'> = ['Martinique', 'Guadeloupe', 'Guyane'];

const buildAvatarUrl = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=12C2E9&color=FFFFFF&bold=true`;
const formatCurrency = (value: number) => `${value.toFixed(2)} €`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const ACCENT_COLORS = ['#A445FF', '#12C2E9', '#2DD881', '#F97316'];
const getAccentColor = (seed: string) => {
  const code = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ACCENT_COLORS[Math.abs(code) % ACCENT_COLORS.length];
};
const fallbackHeroImage =
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=60';

const computeCashbackEarned = (amount: number, cashbackRate?: number | string | null) => {
  const rate = cashbackRate != null && cashbackRate !== '' ? Number(cashbackRate) : 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const earned = (amount * rate) / 100;
  return Math.round(earned * 100) / 100;
};

const confirmWalletDebit = (params: { amount: number; cashbackRate?: number | string | null; title?: string }) =>
  new Promise<boolean>((resolve) => {
    const cashbackEarned = computeCashbackEarned(params.amount, params.cashbackRate);
    const net = Math.round((params.amount - cashbackEarned) * 100) / 100;
    Alert.alert(
      params.title ?? 'Confirmer le débit',
      `Vous allez payer ${formatCurrency(params.amount)} depuis votre cagnotte cashback.\n\nCashback gagné : ${formatCurrency(cashbackEarned)}\nImpact net sur votre solde : -${formatCurrency(net)}\n\nConfirmer ?`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
      ]
    );
  });

/** URL d'image pour une box : uniquement l'image enregistrée au back office (heroImageUrl, imageUrl ou snake_case). Pas d'image par défaut. */
function getBoxImageUri(box: {
  heroImageUrl?: string | null;
  imageUrl?: string | null;
  nom?: string;
  title?: string;
} & Record<string, unknown>): string | null {
  const raw =
    box.heroImageUrl ?? box.imageUrl ??
    (box.hero_image_url as string | undefined) ?? (box.image_url as string | undefined);
  if (raw && typeof raw === 'string' && raw.trim() !== '') {
    return normalizeImageUrl(raw);
  }
  return null;
}

type GiftCardsNav = NativeStackNavigationProp<MainStackParamList>;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

/** Hauteur du bandeau (TabScreenHeader) pour positionner le bloc sticky 4px en dessous */
const getBandeauStickyOffset = (insets: { top: number }) =>
  Math.max(0, insets.top - 36) + TAB_HEADER_TOP_OFFSET + TAB_HEADER_HEIGHT + 4;

/** Marge bas pour défilement au-dessus du bandeau (tab bar) */
const BOTTOM_TAB_AREA = 90;

export default function GiftCardsScreen() {
  const navigation = useNavigation<GiftCardsNav>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { user: authUser, logout } = useAuth();
  const { addNotification, notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationPress = useCallback(() => {
    (navigation as any).navigate('Accueil', { screen: 'Notifications' });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    (navigation as any).navigate('Accueil', { screen: 'Profile' });
  }, [navigation]);
  const { checkAccess } = useKYCGuard();
  const triggerEmail = (to: string, subject: string, body: string) => {
    const recipient = (to || 'contact@kashup.com').trim();
    const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailto).catch(() =>
      Alert.alert('Messagerie indisponible', 'Impossible d’ouvrir votre application e-mail.'),
    );
  };
  /** Vue principale : landing (3 encarts) | mes_cartes | flow dédié (selection_flow, carte_up_flow, box_up_flow) */
  const [viewMode, setViewMode] = useState<'landing' | 'mes_cartes' | 'selection_flow' | 'carte_up_flow' | 'box_up_flow'>('landing');
  const [selectionStep, setSelectionStep] = useState(0);
  const [carteUpStep, setCarteUpStep] = useState(0);
  const [boxUpStep, setBoxUpStep] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>('mes');
  const [showCartesUpLanding, setShowCartesUpLanding] = useState(true);
  const [cartesUpSubTab, setCartesUpSubTab] = useState<CartesUpSubTab>('selection');

  const [partnerPickerVisible, setPartnerPickerVisible] = useState(false);
  const [partnerPickerTarget, setPartnerPickerTarget] = useState<PartnerPickerTarget>('personal');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerCategoryFilter, setPartnerCategoryFilter] = useState<string>('all');
  const [partnerDeptFilter, setPartnerDeptFilter] =
    useState<'all' | 'Martinique' | 'Guadeloupe' | 'Guyane'>('all');

  const [personalPartnerId, setPersonalPartnerId] = useState('');
  const [personalAmount, setPersonalAmount] = useState('');
  const [personalRecipient, setPersonalRecipient] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [selectionOfferModalVisible, setSelectionOfferModalVisible] = useState(false);
  const [selectionOfferRecipient, setSelectionOfferRecipient] = useState('');
  const [selectionOfferSendMode, setSelectionOfferSendMode] = useState<'email' | 'notification'>('notification');
  const [selectionOfferSending, setSelectionOfferSending] = useState(false);
  const [showCartesUpInfoModal, setShowCartesUpInfoModal] = useState(false);

  const [selectionMacaron, setSelectionMacaron] = useState<string>('');
  const [selectionMacaronLibre, setSelectionMacaronLibre] = useState('');
  const [selectionImageUri, setSelectionImageUri] = useState<string | null>(null);
  const [selectionFontId, setSelectionFontId] = useState(FONT_OPTIONS_CARTE[0].id);
  const [selectionTextColorId, setSelectionTextColorId] = useState(TEXT_COLORS_CARTE[0].id);
  const [selectionMacaronColorId, setSelectionMacaronColorId] = useState(MACARON_COLORS_CARTE[0].id);
  const [selectionBackgroundColorId, setSelectionBackgroundColorId] = useState(BACKGROUND_COLORS_CARTE[0].id);
  const [macaronDropdownOpen, setMacaronDropdownOpen] = useState(false);
  const [showMacaronPalette, setShowMacaronPalette] = useState(false);
  const [showBackgroundPalette, setShowBackgroundPalette] = useState(false);

  const [predefinedModalVisible, setPredefinedModalVisible] = useState(false);
  const [selectedPredefinedGift, setSelectedPredefinedGift] = useState<GiftCardOffer | null>(null);
  const [predefinedSendMode, setPredefinedSendMode] = useState<'email' | 'notification'>('email');
  const [predefinedPaymentMethod, setPredefinedPaymentMethod] = useState<'cashback' | 'card'>('cashback');
  const [selectionPaymentMethod, setSelectionPaymentMethod] = useState<'cashback' | 'card'>('cashback');
  const [predefinedRecipient, setPredefinedRecipient] = useState('');
  const [predefinedBeneficiaryName, setPredefinedBeneficiaryName] = useState('');
  const [predefinedMessage, setPredefinedMessage] = useState('');
  const [predefinedMacaron, setPredefinedMacaron] = useState('');
  const [predefinedMacaronLibre, setPredefinedMacaronLibre] = useState('');
  const [predefinedMacaronColorId, setPredefinedMacaronColorId] = useState(MACARON_COLORS_CARTE[0].id);
  const [predefinedFontId, setPredefinedFontId] = useState(FONT_OPTIONS_CARTE[0].id);
  const [predefinedTextColorId, setPredefinedTextColorId] = useState(TEXT_COLORS_CARTE[0].id);
  const [predefinedBackgroundColorId, setPredefinedBackgroundColorId] = useState(BACKGROUND_COLORS_CARTE[0].id);
  const [offerTemplates, setOfferTemplates] = useState<GiftCardOffer[]>([]);
  const [boxTemplates, setBoxTemplates] = useState<GiftBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<GiftBox | null>(null);
  const [boxOfferRecipient, setBoxOfferRecipient] = useState('');
  const [boxOfferMessage, setBoxOfferMessage] = useState('');
  const [boxOfferSendMode, setBoxOfferSendMode] = useState<'email' | 'notification'>('email');
  const [boxOfferPaymentMethod, setBoxOfferPaymentMethod] = useState<'cashback' | 'card'>('cashback');
  const [boxOfferSending, setBoxOfferSending] = useState(false);
  const [boxPdfExporting, setBoxPdfExporting] = useState(false);
  const [selectionUpConfig, setSelectionUpConfig] = useState<CarteUpLibre[]>([]);
  const [selectionUpPartners, setSelectionUpPartners] = useState<Partner[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [infoCardType, setInfoCardType] = useState<'selection_up' | 'carte_up' | 'box_up' | null>(null);
  const selectionVideo = useGiftVideo({
    onVideoRecorded: () =>
      Alert.alert('Vidéo enregistrée', 'Votre vidéo a bien été enregistrée. Vous pouvez la visionner ci-dessous.'),
  });
  const predefinedVideo = useGiftVideo({
    onVideoRecorded: () =>
      Alert.alert('Vidéo enregistrée', 'Votre vidéo a bien été enregistrée. Vous pouvez la visionner ci-dessous.'),
  });
  const boxVideo = useGiftVideo({
    onVideoRecorded: () =>
      Alert.alert('Vidéo enregistrée', 'Votre vidéo a bien été enregistrée. Vous pouvez la visionner ci-dessous.'),
  });

  const {
    data: giftCardData,
    loading: giftCardsLoading,
    error: giftCardsError,
    refetch: refetchGiftCards,
    purchase,
    purchasing,
    purchaseError,
  } = useGiftCards();
  const { data: walletData, refetch: refetchWallet } = useWallet();
  const { data: rewardsData } = useRewards();
  const cashback = walletData?.wallet?.soldeCashback ?? null;
  const points = walletData?.wallet?.soldePoints ?? rewardsData?.summary?.points ?? null;
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  // Écouter les événements webhook pour rafraîchir automatiquement les cartes cadeaux
  useWebhookEvents({
    onGiftCardConfigChanged: refetchGiftCards,
    onBoxUpConfigChanged: refetchGiftCards,
  });

  const catalog = giftCardData.catalog;
  const purchases = giftCardData.purchases;

  /** Config Carte Sélection UP (première active) pour filtrer partenaires / montants */
  const selectionUpConfigActive = selectionUpConfig.find((c) => c.status === 'active');
  const eligiblePartnerIds = useMemo(
    () => new Set(selectionUpConfigActive?.partenairesEligibles ?? []),
    [selectionUpConfigActive]
  );
  const allowedAmounts = useMemo(
    () => selectionUpConfigActive?.montantsDisponibles ?? [],
    [selectionUpConfigActive]
  );

  const partnerOptionsFromCatalog = useMemo<Partner[]>(() => {
    if (catalog.length === 0) return [];
    const seen = new Map<string, Partner>();
    let territoryIndex = 0;
    catalog.forEach((card) => {
      const key = card.partner?.id ?? card.id;
      if (seen.has(key)) return;
      if (eligiblePartnerIds.size > 0 && !eligiblePartnerIds.has(key)) return;
      const territory = TERRITORIES[territoryIndex % TERRITORIES.length];
      territoryIndex += 1;
      const cashbackRate = card.value;
      seen.set(key, {
        id: key,
        name: card.partner?.name ?? card.name,
        categoryId: card.partner?.id ?? card.type,
        city: card.partner ? 'Partenaire KashUP' : 'Catalogue KashUP',
        country: territory,
        cashbackRate,
        isBoosted: card.type !== 'bon_achat',
        logoUrl: card.partner?.logoUrl ?? buildAvatarUrl(card.name),
        websiteUrl: undefined,
        facebookUrl: undefined,
        instagramUrl: undefined,
        permanentOffer: { label: 'Valeur', rate: cashbackRate },
        welcomeOffer: { label: 'Bonus fidélité', rate: cashbackRate + 2 },
      });
    });
    return Array.from(seen.values());
  }, [catalog, eligiblePartnerIds]);

  /** Pour Carte Sélection UP : partenaires issus de l’API (tous les partenaires de l’app) */
  const selectionUpPartnerOptions = useMemo<Partner[]>(() => {
    if (selectionUpPartners.length === 0) return [];
    return selectionUpPartners;
  }, [selectionUpPartners]);

  /** Liste utilisée par le sélecteur : en flow Carte Sélection UP -> partenaires API, sinon catalogue */
  const partnerOptions = useMemo<Partner[]>(() => {
    if (viewMode === 'selection_flow') {
      return selectionUpPartnerOptions;
    }
    return partnerOptionsFromCatalog;
  }, [viewMode, selectionUpPartnerOptions, partnerOptionsFromCatalog]);

  /** Map partenaireId -> logoUrl pour afficher les logos dans les Box UP */
  const partnerLogoMap = useMemo(() => {
    const map: Record<string, string> = {};
    selectionUpPartners.forEach((p) => {
      if (p.id && p.logoUrl) map[p.id] = p.logoUrl;
    });
    return map;
  }, [selectionUpPartners]);

  useEffect(() => {
    if (partnerOptions.length === 0) return;
    const isCurrentInList = partnerOptions.some((p) => p.id === personalPartnerId);
    if (!personalPartnerId || !isCurrentInList) {
      setPersonalPartnerId(partnerOptions[0].id);
    }
  }, [partnerOptions, personalPartnerId]);

  const partnerCategories = useMemo(() => {
    if (partnerOptions.length === 0) return [];
    const unique = new Map<string, string>();
    partnerOptions.forEach((partner) => {
      unique.set(partner.categoryId, partner.name);
    });
    return Array.from(unique.entries()).map(([id, label]) => ({ id, label }));
  }, [partnerOptions]);

  const resolveGiftCardId = (partnerId: string | null) => {
    if (!partnerId) return null;
    const card = catalog.find((item) => (item.partner?.id ?? item.id) === partnerId);
    return card?.id ?? null;
  };

  const personalPartner = useMemo(
    () => partnerOptions.find((partner) => partner.id === personalPartnerId),
    [partnerOptions, personalPartnerId]
  );

  const loadEditorialContent = useCallback(async () => {
    setContentLoading(true);
    setContentError(null);
    try {
      const [offersData, boxesData, configData, partnersData] = await Promise.all([
        getGiftCardOffers(),
        getGiftBoxes(),
        getCartesUpLibresForApp(),
        getPartners().catch(() => []),
      ]);
      setOfferTemplates(offersData);
      setBoxTemplates(boxesData);
      setSelectionUpConfig(configData);
      const mappedPartners: Partner[] = (partnersData ?? []).map((p: { id: string; name: string; logoUrl?: string | null; categoryId?: string; territory?: string; tauxCashbackBase?: number; boostable?: boolean }) => {
        const rate = p.tauxCashbackBase ?? 0;
        const country = (['Martinique', 'Guadeloupe', 'Guyane'].includes(p.territory ?? '') ? p.territory : 'Martinique') as 'Martinique' | 'Guadeloupe' | 'Guyane';
        return {
          id: p.id,
          name: p.name,
          categoryId: p.categoryId ?? p.id,
          city: 'Partenaire KashUP',
          country,
          cashbackRate: rate,
          isBoosted: p.boostable ?? false,
          logoUrl: p.logoUrl ?? buildAvatarUrl(p.name),
          permanentOffer: { label: 'Valeur', rate },
          welcomeOffer: { label: 'Bonus fidélité', rate: rate + 2 },
        };
      });
      setSelectionUpPartners(mappedPartners);
    } catch (error) {
      setContentError(
        error instanceof Error
          ? error.message
          : "Impossible de charger les cartes et coffrets pour le moment."
      );
      setOfferTemplates([]);
      setBoxTemplates([]);
      setSelectionUpConfig([]);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEditorialContent();
  }, [loadEditorialContent]);

  const filteredPartners = useMemo(() => {
    return partnerOptions.filter((partner) => {
      const matchesSearch =
        partner.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
        partner.city.toLowerCase().includes(partnerSearch.toLowerCase());
      const matchesCategory =
        partnerCategoryFilter === 'all' || partner.categoryId === partnerCategoryFilter;
      const matchesDept =
        partnerDeptFilter === 'all' ||
        (partner.territories?.length ? partner.territories.includes(partnerDeptFilter) : partner.country === partnerDeptFilter);
      return matchesSearch && matchesCategory && matchesDept;
    });
  }, [partnerOptions, partnerSearch, partnerCategoryFilter, partnerDeptFilter]);

  const openPartnerPicker = (target: PartnerPickerTarget) => {
    setPartnerPickerTarget(target);
    setPartnerPickerVisible(true);
  };

  const handlePartnerSelect = (partnerId: string) => {
    setPersonalPartnerId(partnerId);
    setPartnerPickerVisible(false);
  };

  const pickSelectionImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Autorisez l’accès à la galerie pour choisir une image pour la carte.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setSelectionImageUri(result.assets[0].uri);
    }
  }, []);

  /** Utilisé par le modal Offrir (mode e-mail) pour générer le PDF après envoi API. Si videoLinkUrl est fourni, un lien "Voir la vidéo" est ajouté au PDF. */
  const buildSelectionCardHtmlForPdf = (videoLinkUrl?: string) => {
    const escapeHtml = (s: string) =>
      String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const title = escapeHtml(personalPartner?.name ?? 'Carte Sélection UP');
    const option = escapeHtml(`Valeur : ${formatCurrency(Number(personalAmount) || 0)}`);
    const msg = escapeHtml(personalMessage.trim());
    const macaronText = escapeHtml(selectionMacaron || selectionMacaronLibre.trim() || '');
    const fontOpt = FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId) ?? FONT_OPTIONS_CARTE[0];
    const fontFamily = fontOpt.fontFamily ?? 'system-ui';
    const fontStyle = fontOpt.fontStyle ?? 'normal';
    const fontWeight = fontOpt.fontWeight ?? '600';
    const textColor = TEXT_COLORS_CARTE.find((c) => c.id === selectionTextColorId)?.value ?? '#1a1a2e';
    const bgColor = BACKGROUND_PALETTE_GRID.find((c) => c.id === selectionBackgroundColorId)?.value ?? '#ffffff';
    const macaronBgColor =
      (MACARON_PALETTE_GRID.find((c) => c.id === selectionMacaronColorId)?.value ?? '#047857').trim().startsWith('#')
        ? (MACARON_PALETTE_GRID.find((c) => c.id === selectionMacaronColorId)?.value ?? '#047857').trim()
        : '#047857';
    const imageUrlForPdf =
      selectionImageUri && (selectionImageUri.startsWith('http://') || selectionImageUri.startsWith('https://'))
        ? selectionImageUri
        : null;
    const imageSection = imageUrlForPdf
      ? `<img src="${escapeHtml(imageUrlForPdf)}" alt="" style="width:100%;height:100px;object-fit:cover;display:block;" />`
      : '<div style="width:100%;height:100px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;">Carte Sélection UP</div>';
    const logoUrl = personalPartner?.logoUrl ? normalizeImageUrl(personalPartner.logoUrl) : '';
    const logoSection = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="" style="width:100%;height:100%;object-fit:contain;" />`
      : '';
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
  *{box-sizing:border-box;} body{margin:0;padding:20px;font-family:${fontFamily},system-ui,sans-serif;}
  .card{width:320px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
  .card-img-wrap{width:100%;height:100px;background:#e2e8f0;position:relative;}
  .card-title-tab{position:absolute;top:8px;left:8px;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,0.5);color:#FFFFFF;font-size:12px;font-weight:600;max-width:80%;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .card-body{padding:12px;min-height:80px;}
  .card-option{font-size:9px;font-weight:600;margin-top:4px;opacity:0.9;}
  .card-msg{font-size:13px;line-height:18px;margin-top:8px;}
  .card-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:8px;}
  .macaron{display:inline-block;padding:3px 7px;border-radius:9px;font-size:8px;font-weight:700;color:#fff;background-color:${macaronBgColor};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .logo-wrap{width:36px;height:36px;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;background:#fff;}
  .video-link{margin-top:16px;padding:10px;text-align:center;font-size:12px;}
  .video-link a{color:#047857;text-decoration:underline;}
</style></head><body>
  <div class="card" style="background:${bgColor}">
    <div class="card-img-wrap">${imageSection}
      <div class="card-title-tab" style="font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${title}</div>
    </div>
    <div class="card-body">
      <div class="card-option" style="color:${textColor};font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${option}</div>
      ${msg ? `<div class="card-msg" style="color:${textColor};font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${msg}</div>` : ''}
      <div class="card-bottom">
        ${macaronText ? `<div class="macaron" style="font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${macaronText}</div>` : '<div></div>'}
        ${logoSection ? `<div class="logo-wrap">${logoSection}</div>` : '<div></div>'}
      </div>
    </div>
  </div>
  ${videoLinkUrl ? `<div class="video-link"><a href="${escapeHtml(videoLinkUrl)}">Voir la vidéo du cadeau</a></div>` : ''}
</body></html>`;
  };

  const openSelectionOfferModal = () => {
    if (!authUser) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour offrir une carte.');
      return;
    }
    const amountValue = Number(personalAmount);
    if (!personalAmount || Number.isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant valide avant d\'offrir.');
      return;
    }
    if (!personalPartnerId?.trim() || !personalPartner) {
      Alert.alert('Partenaire requis', 'Choisissez un partenaire avant d\'offrir.');
      return;
    }
    setSelectionOfferRecipient('');
    setSelectionOfferSendMode('notification');
    selectionVideo.clearVideo();
    setSelectionOfferModalVisible(true);
  };

  const confirmSelectionUpOfferNotification = async () => {
    const email = selectionOfferRecipient.trim();
    if (!email) {
      Alert.alert('E-mail requis', "Indiquez l'e-mail du compte KashUP du destinataire pour lui envoyer la carte dans l'app.");
      return;
    }
    const amountValue = Number(personalAmount);
    if (!personalAmount || Number.isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant valide (supérieur à 0) pour envoyer la carte.');
      return;
    }
    const messageForApi =
      [selectionMacaron || selectionMacaronLibre, personalMessage].filter(Boolean).join('\n\n') || undefined;
    const payload = {
      amount: amountValue,
      beneficiaryEmail: email,
      message: messageForApi,
      partnerId: personalPartnerId || undefined,
      partnerName: personalPartner?.name,
    };
    try {
      setSelectionOfferSending(true);
      if (selectionPaymentMethod === 'card') {
        const { clientSecret, paymentIntentId } = await createGiftCardPaymentIntent({ giftType: 'selection_up', ...payload });
        const { error: initErr } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'KashUP' });
        if (initErr) {
          Alert.alert('Paiement', initErr.message ?? 'Impossible d\'ouvrir le paiement.');
          return;
        }
        const { error: presentErr } = await presentPaymentSheet();
        if (presentErr) {
          if (presentErr.code !== 'Canceled') Alert.alert('Paiement', presentErr.message ?? 'Paiement annulé ou échoué.');
          return;
        }
        const result = await confirmCardPaymentForGift({ paymentIntentId, giftType: 'selection_up', ...payload });
        if (
          selectionVideo.hasVideo &&
          selectionVideo.videoUri &&
          selectionVideo.videoDurationSeconds &&
          selectionVideo.consentAccepted &&
          result.purchaseId
        ) {
          try {
            await uploadGiftVideo({
              purchaseId: result.purchaseId,
              videoUri: selectionVideo.videoUri,
              requestedVideoDuration: selectionVideo.videoDurationSeconds,
              videoDurationOption: selectionVideo.videoDurationOption,
              consentAccepted: selectionVideo.consentAccepted,
            });
          } catch {
            // ne bloque pas l'envoi
          }
        }
        setSelectionOfferModalVisible(false);
        Alert.alert('Carte envoyée', result?.message ?? 'Le destinataire a été notifié dans l\'app.');
      } else {
        const okDebit = await confirmWalletDebit({
          amount: amountValue,
          cashbackRate: selectionUpConfigActive?.cashbackRate ?? null,
        });
        if (!okDebit) return;
        const result = await sendSelectionUp(payload);
        if (
          selectionVideo.hasVideo &&
          selectionVideo.videoUri &&
          selectionVideo.videoDurationSeconds &&
          selectionVideo.consentAccepted &&
          result.purchaseId
        ) {
          try {
            await uploadGiftVideo({
              purchaseId: result.purchaseId,
              videoUri: selectionVideo.videoUri,
              requestedVideoDuration: selectionVideo.videoDurationSeconds,
              videoDurationOption: selectionVideo.videoDurationOption,
              consentAccepted: selectionVideo.consentAccepted,
            });
          } catch {
            // idem
          }
        }
        setSelectionOfferModalVisible(false);
        const msg =
          (result as { data?: { message?: string } })?.data?.message ??
          (result as { message?: string })?.message;
        Alert.alert('Carte envoyée', msg ?? 'Le destinataire a été notifié dans l\'app.');
      }
      addNotification({
        category: 'cashback',
        title: 'Carte Sélection UP envoyée',
        description: `${personalPartner?.name ?? 'KashUP'} • ${formatCurrency(amountValue)}`,
      });
      await refetchGiftCards();
      await refetchWallet();
    } catch (error) {
      const status = (error as ApiError)?.statusCode ?? (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) await logout();
      const message = getApiErrorMessage(error, 'Veuillez réessayer plus tard.');
      Alert.alert('Impossible d\'envoyer la carte', message);
    } finally {
      setSelectionOfferSending(false);
    }
  };

  const confirmSelectionUpOfferEmail = async () => {
    const email = selectionOfferRecipient.trim();
    if (!email) {
      Alert.alert('Adresse e-mail requise', 'Merci d\'ajouter un e-mail pour envoyer la carte.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('E-mail invalide', 'Saisissez une adresse e-mail valide (ex. nom@exemple.com).');
      return;
    }
    const amountValue = Number(personalAmount);
    if (!personalAmount || Number.isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant valide (supérieur à 0) pour envoyer la carte.');
      return;
    }
    const messageForApi =
      [selectionMacaron || selectionMacaronLibre, personalMessage].filter(Boolean).join('\n\n') || undefined;
    const payload = {
      amount: amountValue,
      beneficiaryEmail: email,
      message: messageForApi,
      partnerId: personalPartnerId || undefined,
      partnerName: personalPartner?.name,
    };
    try {
      setSelectionOfferSending(true);
      let purchaseId: string | undefined;
      if (selectionPaymentMethod === 'card') {
        const { clientSecret, paymentIntentId } = await createGiftCardPaymentIntent({ giftType: 'selection_up', ...payload });
        const { error: initErr } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'KashUP' });
        if (initErr) {
          Alert.alert('Paiement', initErr.message ?? 'Impossible d\'ouvrir le paiement.');
          return;
        }
        const { error: presentErr } = await presentPaymentSheet();
        if (presentErr) {
          if (presentErr.code !== 'Canceled') Alert.alert('Paiement', presentErr.message ?? 'Paiement annulé ou échoué.');
          return;
        }
        const result = await confirmCardPaymentForGift({ paymentIntentId, giftType: 'selection_up', ...payload });
        purchaseId = result.purchaseId;
        if (
          selectionVideo.hasVideo &&
          selectionVideo.videoUri &&
          selectionVideo.videoDurationSeconds &&
          selectionVideo.consentAccepted &&
          result.purchaseId
        ) {
          try {
            await uploadGiftVideo({
              purchaseId: result.purchaseId,
              videoUri: selectionVideo.videoUri,
              requestedVideoDuration: selectionVideo.videoDurationSeconds,
              videoDurationOption: selectionVideo.videoDurationOption,
              consentAccepted: selectionVideo.consentAccepted,
            });
          } catch {
            // n'empêche pas la génération du PDF
          }
        }
      } else {
        const okDebit = await confirmWalletDebit({
          amount: amountValue,
          cashbackRate: selectionUpConfigActive?.cashbackRate ?? null,
        });
        if (!okDebit) return;
        const result = await sendSelectionUp(payload);
        purchaseId = result.purchaseId;
        if (
          selectionVideo.hasVideo &&
          selectionVideo.videoUri &&
          selectionVideo.videoDurationSeconds &&
          selectionVideo.consentAccepted &&
          result.purchaseId
        ) {
          try {
            await uploadGiftVideo({
              purchaseId: result.purchaseId,
              videoUri: selectionVideo.videoUri,
              requestedVideoDuration: selectionVideo.videoDurationSeconds,
              videoDurationOption: selectionVideo.videoDurationOption,
              consentAccepted: selectionVideo.consentAccepted,
            });
          } catch {
            // idem
          }
        }
      }
      const videoLinkUrl =
        purchaseId && selectionVideo.hasVideo && selectionVideo.consentAccepted
          ? `${getApiBaseUrl()}/gift-cards/orders/${purchaseId}/video`
          : undefined;
      try {
        const html = buildSelectionCardHtmlForPdf(videoLinkUrl);
        const { uri } = await Print.printToFileAsync({ html, width: 340, height: 380 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Partager la carte (PDF)' });
        } else {
          Alert.alert('Export PDF', 'Le partage n\'est pas disponible sur cet appareil. Le PDF a été généré.', [{ text: 'OK' }]);
        }
      } catch (pdfErr) {
        if (__DEV__) console.warn('[GiftCards] PDF generation failed:', pdfErr);
        Alert.alert(
          'PDF non généré',
          'La carte a bien été enregistrée, mais la génération du PDF a échoué. Vous pouvez la partager par notification KashUP.'
        );
      }
      setSelectionOfferModalVisible(false);
      addNotification({
        category: 'cashback',
        title: 'Carte Sélection UP envoyée',
        description: `${formatCurrency(amountValue)} • PDF prêt à envoyer`,
      });
      await refetchGiftCards();
      await refetchWallet();
    } catch (error) {
      const status = (error as ApiError)?.statusCode ?? (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) await logout();
      const message = getApiErrorMessage(error, 'Impossible de générer ou d\'envoyer la carte.');
      Alert.alert('Erreur', message);
    } finally {
      setSelectionOfferSending(false);
    }
  };

  const openPredefinedModal = (gift: GiftCardOffer) => {
    setSelectedPredefinedGift(gift);
    setPredefinedSendMode('email');
    setPredefinedRecipient('');
    setPredefinedBeneficiaryName('');
    setPredefinedMessage('');
    setPredefinedMacaron('');
    setPredefinedMacaronLibre('');
    setPredefinedMacaronColorId(MACARON_COLORS_CARTE[0].id);
    setPredefinedFontId(FONT_OPTIONS_CARTE[0].id);
    setPredefinedTextColorId(TEXT_COLORS_CARTE[0].id);
    setPredefinedBackgroundColorId(BACKGROUND_COLORS_CARTE[0].id);
    predefinedVideo.clearVideo();
    setPredefinedModalVisible(true);
  };

  const [predefinedSending, setPredefinedSending] = useState(false);

  const confirmPredefinedGift = async () => {
    if (!selectedPredefinedGift) return;
    if (predefinedSendMode === 'email') {
      if (!predefinedRecipient) {
        Alert.alert('Adresse e-mail requise', 'Merci d’ajouter un e-mail pour envoyer le cadeau.');
        return;
      }
      const subject = `Cadeau ${selectedPredefinedGift.partner?.name ?? 'KashUP'} - ${selectedPredefinedGift.title}`;
      const macaronText = predefinedMacaron || predefinedMacaronLibre.trim();
      const beneficiaryLine = predefinedBeneficiaryName.trim() ? `\nPour : ${predefinedBeneficiaryName.trim()}` : '';
      const body = `Bonjour,\n\nVous recevez "${selectedPredefinedGift.title}" d’une valeur de ${selectedPredefinedGift.price.toFixed(
        2,
      )} €.${beneficiaryLine}\n${selectedPredefinedGift.description}${
        macaronText ? `\n\nMacaron : ${macaronText}` : ''
      }${predefinedMessage ? `\n\nMessage : ${predefinedMessage}` : ''}\n\nProfitez-en vite avec KashUP !`;
      triggerEmail(predefinedRecipient, subject, body);
      setPredefinedModalVisible(false);
      return;
    }
    const email = predefinedRecipient.trim();
    if (!email) {
      Alert.alert('E-mail requis', "Indiquez l'e-mail du compte KashUP du destinataire pour lui envoyer le cadeau dans l'app.");
      return;
    }
    try {
      setPredefinedSending(true);
      if (predefinedPaymentMethod === 'card') {
        const { clientSecret, paymentIntentId } = await createGiftCardPaymentIntent({
          giftType: 'carte_up',
          offerId: selectedPredefinedGift.id,
          beneficiaryEmail: email,
          message: predefinedMessage.trim() || undefined,
        });
        const { error: initErr } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'KashUP',
        });
        if (initErr) {
          Alert.alert('Paiement', initErr.message ?? 'Impossible d\'ouvrir le paiement.');
          return;
        }
        const { error: presentErr } = await presentPaymentSheet();
        if (presentErr) {
          if (presentErr.code !== 'Canceled') Alert.alert('Paiement', presentErr.message ?? 'Paiement annulé ou échoué.');
          return;
        }
        const result = await confirmCardPaymentForGift({
          paymentIntentId,
          giftType: 'carte_up',
          offerId: selectedPredefinedGift.id,
          beneficiaryEmail: email,
          message: predefinedMessage.trim() || undefined,
        });
        if (
          predefinedVideo.hasVideo &&
          predefinedVideo.videoUri &&
          predefinedVideo.videoDurationSeconds &&
          predefinedVideo.consentAccepted &&
          result.purchaseId
        ) {
          try {
            await uploadGiftVideo({
              purchaseId: result.purchaseId,
              videoUri: predefinedVideo.videoUri,
              requestedVideoDuration: predefinedVideo.videoDurationSeconds,
              videoDurationOption: predefinedVideo.videoDurationOption,
              consentAccepted: predefinedVideo.consentAccepted,
            });
          } catch {
            // ne bloque pas l'envoi
          }
        }
        setPredefinedModalVisible(false);
        Alert.alert('Cadeau envoyé', result?.message ?? "Le destinataire a été notifié dans l'app.");
      } else {
        const amountValue = Number((selectedPredefinedGift as any).price ?? (selectedPredefinedGift as any).montant ?? 0);
        const okDebit = await confirmWalletDebit({
          amount: amountValue,
          cashbackRate: (selectedPredefinedGift as any).cashbackRate ?? null,
        });
        if (!okDebit) return;
        const result = await sendPredefinedGift({
          offerId: selectedPredefinedGift.id,
          beneficiaryEmail: email,
          message: predefinedMessage.trim() || undefined,
        });
        if (
          predefinedVideo.hasVideo &&
          predefinedVideo.videoUri &&
          predefinedVideo.videoDurationSeconds &&
          predefinedVideo.consentAccepted &&
          result.purchaseId
        ) {
          try {
            await uploadGiftVideo({
              purchaseId: result.purchaseId,
              videoUri: predefinedVideo.videoUri,
              requestedVideoDuration: predefinedVideo.videoDurationSeconds,
              videoDurationOption: predefinedVideo.videoDurationOption,
              consentAccepted: predefinedVideo.consentAccepted,
            });
          } catch {
            // idem
          }
        }
        setPredefinedModalVisible(false);
        const msg = (result as { data?: { message?: string }; message?: string })?.data?.message ?? (result as { message?: string })?.message;
        Alert.alert('Cadeau envoyé', msg ?? "Le destinataire a été notifié dans l'app.");
      }
      await refetchGiftCards();
      await refetchWallet();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message
        ?? "Envoi impossible. Vérifiez l'e-mail (compte KashUP) et votre solde.";
      Alert.alert('Erreur', message);
    } finally {
      setPredefinedSending(false);
    }
  };

  const handleUseVoucher = (voucher: VoucherItem) => {
    navigation.navigate('VoucherDetail', { voucher });
  };

  const renderPartnerSelector = (target: PartnerPickerTarget) => {
    const partner = personalPartner;
    return (
      <TouchableOpacity style={styles.selector} onPress={() => openPartnerPicker(target)}>
        <Text style={styles.selectorLabel}>Partenaire sélectionné</Text>
        <View style={styles.selectorRow}>
          <View style={styles.selectorTitleWrap}>
            <Text style={styles.selectorTitle} numberOfLines={2}>
              {partner?.name ?? 'Choisissez un partenaire'}
            </Text>
            <Text style={styles.selectorSubtitle} numberOfLines={1}>
              {partner ? `${partner.city}, ${partner.country}` : 'Catalogue KashUP'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMyVouchers = () => {
    if (giftCardsLoading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primaryPurple} />
          <Text style={styles.loaderText}>Chargement de vos bons…</Text>
        </View>
      );
    }

    if (giftCardsError) {
      return (
        <TouchableOpacity style={styles.placeholderCard} onPress={refetchGiftCards}>
          <Text style={styles.placeholderTitle}>Impossible de charger vos bons.</Text>
          <Text style={styles.placeholderSubtitle}>Touchez pour réessayer.</Text>
        </TouchableOpacity>
      );
    }

    if (purchases.length === 0) {
      return (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Vous n’avez pas encore de bons d’achat.</Text>
          <Text style={styles.placeholderSubtitle}>
            Achetez ou recevez un bon pour le voir apparaître ici.
          </Text>
        </View>
      );
    }

    const buildVoucherPayload = (v: GiftCardPurchase): VoucherPayload => {
      const partner = v.giftCard.partner;
      let locationText: string | null = null;
      let mapUrl: string | null = null;
      if (partner?.territories) {
        try {
          const t = typeof partner.territories === 'string' ? JSON.parse(partner.territories) : partner.territories;
          locationText = Array.isArray(t) ? t.join(', ') : String(partner.territories);
        } catch {
          locationText = String(partner.territories);
        }
      }
      if (partner?.latitude != null && partner?.longitude != null) {
        mapUrl = `https://www.google.com/maps?q=${partner.latitude},${partner.longitude}`;
      }
      return {
        id: v.id,
        partenaire: v.giftCard.partner?.name ?? v.giftCard.name,
        montant: v.amount,
        expiration: formatDate(v.expiresAt),
        purchaseId: v.id,
        partnerId: partner?.id ?? null,
        logoUrl: partner?.logoUrl ?? null,
        locationText: locationText ?? null,
        mapUrl,
        videoStatus: v.videoStatus ?? undefined,
        videoDurationSeconds: v.videoDurationSeconds ?? undefined,
      };
    };

    return purchases.map((voucher) => {
      const payload = buildVoucherPayload(voucher);
      const partner = voucher.giftCard.partner;
      const partnerName = partner?.name ?? voucher.giftCard.name;
      return (
        <TouchableOpacity
          key={voucher.id}
          style={styles.voucherCard}
          activeOpacity={0.85}
          onPress={() => handleUseVoucher(payload)}>
          {partner?.logoUrl ? (
            <View style={styles.voucherLogoWrap}>
              <Image source={{ uri: normalizeImageUrl(partner.logoUrl) }} style={styles.voucherLogo} />
            </View>
          ) : null}
          <Text style={styles.voucherPersonalCopy}>
            Profite des <Text style={styles.voucherPersonalValue}>{formatCurrency(voucher.amount)}</Text> chez{' '}
            <Text style={styles.voucherPersonalPartner}>{partnerName}</Text>
          </Text>
          <Text style={styles.voucherMetaLabel}>Valable jusqu’au {formatDate(voucher.expiresAt)}</Text>
          <View style={styles.voucherPrimaryButton}>
            <LinearGradient
              colors={[colors.primaryBlue, colors.primaryPurple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.voucherPrimaryGradient}>
              <Text style={styles.voucherPrimaryText}>Voir le bon et la localisation</Text>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      );
    });
  };

  /** Bloc accordéons / config : défile avec le premier scroll (au-dessus de « Aperçu en direct ») */
  const renderSelectionUpAccordionsBlock = () => (
    <View style={{ marginTop: spacing.md }}>
      {contentLoading ? (
        <ActivityIndicator color={colors.primaryPurple} style={{ marginVertical: spacing.lg }} />
      ) : (
        <>
          {selectionUpConfig.length === 0 ? null : (
            (selectionUpConfigActive ? [selectionUpConfigActive] : selectionUpConfig).map((config) => (
              <View key={config.id} style={[styles.purchaseCard, { marginBottom: spacing.lg }]}>
                <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Configuration Carte Sélection UP</Text>
                {config.imageUrl ? (
                  <Image source={{ uri: normalizeImageUrl(config.imageUrl) }} style={styles.configImage} resizeMode="cover" />
                ) : null}
                <Text style={styles.configTitle}>{config.nom}</Text>
                <Text style={styles.offerSubtitle}>{config.description}</Text>
                <View style={[styles.cashbackRow, { marginBottom: 8 }]}>
                  <View style={styles.cashbackItem}>
                    <Ionicons
                      name="pricetag"
                      size={12}
                      color={(config.cashbackRate != null && config.cashbackRate !== '' && Number(config.cashbackRate) >= 0) ? '#05A357' : colors.textSecondary}
                    />
                    <Text style={[
                      styles.cashbackRate,
                      (config.cashbackRate == null || config.cashbackRate === '' || Number(config.cashbackRate) < 0) && styles.cashbackRateEmpty,
                    ]}>
                      {(config.cashbackRate != null && config.cashbackRate !== '' && Number(config.cashbackRate) >= 0)
                        ? `${Number(config.cashbackRate)}%`
                        : '—'}
                    </Text>
                    <Text style={styles.cashbackItemLabel}>
                      {(config.cashbackRate != null && config.cashbackRate !== '' && Number(config.cashbackRate) >= 0)
                        ? "À l'achat"
                        : 'Non renseigné'}
                    </Text>
                  </View>
                </View>
                <View style={styles.configMeta}>
                  <Text style={styles.configMetaText}>
                    Montant : {config.montantsDisponibles.length > 0 ? config.montantsDisponibles.map((m) => `${m} €`).join(', ') : 'libre (défini par vous)'}
                  </Text>
                  <Text style={styles.configMetaText}>
                    Partenaires éligibles : {config.partenairesEligibles.length} partenaire{config.partenairesEligibles.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {config.conditions ? (
                  <View style={styles.configBlock}>
                    <Text style={styles.sectionLabel}>Conditions</Text>
                    <Text style={styles.configBlockText}>{config.conditions}</Text>
                  </View>
                ) : null}
                {config.commentCaMarche ? (
                  <View style={styles.configBlock}>
                    <Text style={styles.sectionLabel}>Comment ça marche</Text>
                    <Text style={styles.configBlockText}>{config.commentCaMarche}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </>
      )}
    </View>
  );

  /** Bloc sticky : uniquement « Aperçu en direct » + carte (le scroll s’arrête ici) */
  const renderSelectionUpCardStickyBlock = (opts?: { noStickyOffset?: boolean }) => (
    <View style={[styles.stickyCardBlock, !opts?.noStickyOffset && { paddingTop: getBandeauStickyOffset(insets) }]}>
      <Text style={[styles.sectionLabel, { marginBottom: spacing.sm }]}>Aperçu en direct</Text>
      <View
            style={[
              styles.carteTestPreview,
              { backgroundColor: BACKGROUND_PALETTE_GRID.find((c) => c.id === selectionBackgroundColorId)?.value ?? '#ffffff' },
            ]}>
            {selectionImageUri ? (
              <View style={styles.carteTestImageWrap}>
                <Image source={{ uri: selectionImageUri }} style={styles.carteTestImage} resizeMode="cover" />
              </View>
            ) : (
              <View style={styles.carteTestImagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.carteTestImagePlaceholderText}>Image</Text>
              </View>
            )}
            <View style={styles.carteTestBody}>
              <View style={styles.carteTestBodyText}>
                <Text
                  style={[
                    styles.carteTestMainText,
                    {
                      color: TEXT_COLORS_CARTE.find((c) => c.id === selectionTextColorId)?.value ?? '#1a1a2e',
                      fontFamily: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontFamily,
                      fontStyle: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontStyle,
                      fontWeight: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontWeight,
                    },
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  Profite des <Text style={styles.carteTestHighlight}>{personalAmount ? `${personalAmount} €` : '…'}</Text> chez{' '}
                  <Text style={styles.carteTestHighlight}>{personalPartner?.name ?? '…'}</Text>
                </Text>
                {personalMessage ? (
                  <Text
                    style={[
                      styles.carteTestMessage,
                      {
                        color: TEXT_COLORS_CARTE.find((c) => c.id === selectionTextColorId)?.value ?? '#1a1a2e',
                        fontFamily: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontFamily,
                        fontStyle: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontStyle,
                        fontWeight: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontWeight,
                      },
                    ]}
                    numberOfLines={3}>
                    {personalMessage}
                  </Text>
                ) : null}
                <View style={styles.carteTestMacaronLogoRow}>
                  {(selectionMacaron || selectionMacaronLibre) ? (
                    <View
                      style={[
                        styles.carteTestMacaron,
                        {
                          backgroundColor: MACARON_PALETTE_GRID.find((c) => c.id === selectionMacaronColorId)?.value ?? colors.primary,
                        },
                      ]}>
                      <Text style={styles.carteTestMacaronText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {selectionMacaron === '' ? (selectionMacaronLibre.trim() || 'Votre texte') : selectionMacaron}
                      </Text>
                    </View>
                  ) : null}
                  {personalPartner?.logoUrl ? (
                    <View style={styles.carteTestLogoWrap}>
                      <Image source={{ uri: normalizeImageUrl(personalPartner.logoUrl) }} style={styles.carteTestLogo} resizeMode="contain" />
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
    </View>
  );

  /** Champs du formulaire Carte Sélection UP (partagés entre formulaire seul et contenu complet) */
  const renderFormFields = () => (
    <>
      <Text style={styles.sectionLabel}>Partenaire</Text>
      {renderPartnerSelector('personal')}
      <Text style={styles.sectionLabel}>Montant (€)</Text>
      {allowedAmounts.length > 0 && (
        <Text style={[styles.offerSubtitle, { marginBottom: 4 }]}>
          Montants disponibles : {allowedAmounts.map((a) => `${a} €`).join(', ')}
        </Text>
      )}
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder={allowedAmounts.length > 0 ? `Ex : ${allowedAmounts[0]}` : 'Ex : 50'}
        value={personalAmount}
        onChangeText={setPersonalAmount}
      />
      <Text style={styles.sectionLabel}>Macaron</Text>
      <View style={styles.macaronDropdownWrap}>
        <TouchableOpacity
          style={[styles.macaronDropdownTrigger, macaronDropdownOpen && styles.macaronDropdownTriggerOpen]}
          onPress={() => setMacaronDropdownOpen((o) => !o)}
          activeOpacity={0.7}>
          <Text style={styles.macaronDropdownTriggerText} numberOfLines={1}>
            {selectionMacaron
              ? selectionMacaron
              : selectionMacaronLibre.trim()
                ? `Pastille libre : ${selectionMacaronLibre.trim()}`
                : 'Choisir un macaron'}
          </Text>
          <Ionicons
            name={macaronDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
        {macaronDropdownOpen ? (
          <View style={styles.macaronSelect}>
            {MACARON_PRESETS.map((label) => {
              const active = selectionMacaron === label;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.macaronOption, active && styles.macaronOptionActive]}
                  onPress={() => {
                    setSelectionMacaron(active ? '' : label);
                    if (!active) setSelectionMacaronLibre('');
                    setMacaronDropdownOpen(false);
                  }}>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={active ? colors.primaryPurple : colors.textSecondary}
                  />
                  <Text style={[styles.macaronOptionText, active && styles.macaronOptionTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.macaronOption, styles.macaronOptionLast, selectionMacaron === '' && styles.macaronOptionActive]}
              onPress={() => {
                setSelectionMacaron('');
                setMacaronDropdownOpen(false);
              }}>
              <Ionicons
                name={selectionMacaron === '' ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={selectionMacaron === '' ? colors.primaryPurple : colors.textSecondary}
              />
              <Text style={[styles.macaronOptionText, selectionMacaron === '' && styles.macaronOptionTextActive]}>
                Pastille libre
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      {selectionMacaron === '' && (
        <View style={styles.macaronLibreRow}>
          <Text style={styles.configMetaText}>Texte du macaron (pastille libre)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : Merci pour tout, Bonne retraite..."
            value={selectionMacaronLibre}
            onChangeText={setSelectionMacaronLibre}
          />
        </View>
      )}
      <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Message (texte)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Un mot doux pour accompagner la carte"
        multiline
        value={personalMessage}
        onChangeText={setPersonalMessage}
      />
      <Text style={styles.sectionLabel}>Image</Text>
      <View style={styles.imagePickerRow}>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickSelectionImage}>
          <Ionicons name="image-outline" size={22} color={colors.primaryPurple} />
          <Text style={styles.imagePickerButtonText}>
            {selectionImageUri ? "Changer l'image" : 'Choisir une image'}
          </Text>
        </TouchableOpacity>
        {selectionImageUri ? (
          <TouchableOpacity style={styles.imagePickerRemove} onPress={() => setSelectionImageUri(null)}>
            <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            <Text style={styles.imagePickerRemoveText}>Supprimer</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {selectionImageUri ? (
        <View style={styles.imagePickerPreviewWrap}>
          <Image source={{ uri: selectionImageUri }} style={styles.imagePickerPreview} resizeMode="cover" />
        </View>
      ) : null}
      <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Style de la carte</Text>
      <Text style={[styles.offerSubtitle, { marginBottom: 12 }]}>
        Police et couleurs (l'aperçu ci‑dessus se met à jour en direct).
      </Text>
      <Text style={styles.configMetaText}>Police du texte</Text>
      <View style={styles.fontRow}>
        {FONT_OPTIONS_CARTE.map((f) => {
          const active = selectionFontId === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setSelectionFontId(f.id)}
              style={[styles.fontChip, active && styles.fontChipActive]}>
              <Text style={[styles.fontChipLabel, active && styles.fontChipLabelActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.colorBlock}>
        <Text style={styles.colorBlockLabel}>Texte</Text>
        <View style={styles.colorSwatchRow}>
          {TEXT_COLORS_CARTE.map((c) => {
            const active = selectionTextColorId === c.id;
            const swatchColor = c.value;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectionTextColorId(c.id)}
                style={[styles.colorSwatch, { backgroundColor: swatchColor }, active && styles.colorSwatchActive]}
              />
            );
          })}
        </View>
        <Text style={styles.colorBlockLabel}>Macaron</Text>
        <View style={styles.colorPaletteRow}>
          <View style={[styles.colorSwatchGridItem, { backgroundColor: MACARON_PALETTE_GRID.find((x) => x.id === selectionMacaronColorId)?.value ?? colors.primary }]} />
          <TouchableOpacity style={styles.colorPaletteToggle} onPress={() => setShowMacaronPalette((v) => !v)}>
            <Text style={styles.colorPaletteToggleText}>{showMacaronPalette ? 'Masquer les couleurs' : 'Choisir une couleur'}</Text>
            <Ionicons name={showMacaronPalette ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primaryPurple} />
          </TouchableOpacity>
        </View>
        {showMacaronPalette && (
          <View style={styles.colorSwatchGrid}>
{MACARON_PALETTE_GRID.map((c, i) => {
            const active = selectionMacaronColorId === c.id;
            return (
              <TouchableOpacity
                key={`macaron-${i}-${c.id}`}
                  onPress={() => setSelectionMacaronColorId(c.id)}
                  style={[styles.colorSwatchGridItem, { backgroundColor: c.value }, active && styles.colorSwatchGridItemActive]}
                >
                  {active ? (
                    <View style={styles.colorSwatchCheckWrap}>
                      <Ionicons name="checkmark" size={14} color="#fff" style={styles.colorSwatchCheck} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <Text style={styles.colorBlockLabel}>Fond</Text>
        <View style={styles.colorPaletteRow}>
          <View style={[styles.colorSwatchGridItem, { backgroundColor: BACKGROUND_PALETTE_GRID.find((x) => x.id === selectionBackgroundColorId)?.value ?? '#ffffff' }]} />
          <TouchableOpacity style={styles.colorPaletteToggle} onPress={() => setShowBackgroundPalette((v) => !v)}>
            <Text style={styles.colorPaletteToggleText}>{showBackgroundPalette ? 'Masquer les couleurs' : 'Choisir une couleur'}</Text>
            <Ionicons name={showBackgroundPalette ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primaryPurple} />
          </TouchableOpacity>
        </View>
        {showBackgroundPalette && (
          <View style={styles.colorSwatchGrid}>
{BACKGROUND_PALETTE_GRID.map((c, i) => {
            const active = selectionBackgroundColorId === c.id;
            return (
              <TouchableOpacity
                key={`bg-${i}-${c.id}`}
                onPress={() => setSelectionBackgroundColorId(c.id)}
                  style={[styles.colorSwatchGridItem, { backgroundColor: c.value }, active && styles.colorSwatchGridItemActive]}
                >
                  {active ? (
                    <View style={styles.colorSwatchCheckWrap}>
                      <Ionicons name="checkmark" size={14} color="#333" style={styles.colorSwatchCheck} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
      <Text style={styles.sectionLabel}>Nom du bénéficiaire</Text>
      <TextInput
        style={styles.input}
        placeholder="Prénom Nom"
        value={personalRecipient}
        onChangeText={setPersonalRecipient}
      />
      <TouchableOpacity
        style={[styles.primaryButton, selectionOfferSending && styles.primaryButtonDisabled]}
        onPress={openSelectionOfferModal}
        disabled={selectionOfferSending}>
        <LinearGradient
          colors={[...CARD_GRADIENT_COLORS]}
          locations={[...CARD_GRADIENT_LOCATIONS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryGradient}>
          <Text style={styles.primaryText}>Offrir</Text>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderSelectionUpFormBlock = () => (
    <View style={styles.buyContainer}>
      <Text style={[styles.offerSubtitle, { marginBottom: 12 }]}>
        Créez votre carte : choisissez un partenaire, un montant, un texte, un visuel et un macaron. Les changements
        s'affichent en direct ci‑dessus.
      </Text>
      <View style={styles.purchaseCard}>{renderFormFields()}</View>
    </View>
  );

  const SELECTION_STEPS = [
    'Partenaire',
    'Montant',
    'Macaron',
    'Image',
    'Style de la carte',
    'Bénéficiaire',
    'Vidéo',
    'Envoi et confirmation',
  ];

  const renderSelectionUpWizard = () => {
    const showCardPreview = selectionStep <= 5;
    const isLastStep = selectionStep === 7;
    return (
      <View style={styles.wizardContainer}>
        <TouchableOpacity onPress={() => setShowCartesUpInfoModal(true)} style={styles.moduleInfoTrigger}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.moduleInfoTriggerText}>À quoi ça sert et comment ça marche ?</Text>
        </TouchableOpacity>
        {showCardPreview && (
          <View style={[styles.section, { marginBottom: spacing.md }]}>
            <Text style={[styles.sectionLabel, { marginBottom: spacing.sm }]}>Aperçu de la carte</Text>
            {renderSelectionUpCardStickyBlock({ noStickyOffset: true })}
          </View>
        )}
        <View style={[styles.section, styles.purchaseCard]}>
          <Text style={[styles.sectionLabel, { marginBottom: spacing.sm }]}>{SELECTION_STEPS[selectionStep]}</Text>
          {selectionStep === 0 && (
            <>
              <Text style={styles.sectionLabel}>Partenaire</Text>
              {renderPartnerSelector('personal')}
            </>
          )}
          {selectionStep === 1 && (
            <>
              <Text style={styles.sectionLabel}>Montant (€)</Text>
              {allowedAmounts.length > 0 && (
                <Text style={[styles.offerSubtitle, { marginBottom: 4 }]}>
                  Montants disponibles : {allowedAmounts.map((a) => `${a} €`).join(', ')}
                </Text>
              )}
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={allowedAmounts.length > 0 ? `Ex : ${allowedAmounts[0]}` : 'Ex : 50'}
                value={personalAmount}
                onChangeText={setPersonalAmount}
              />
              <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Message (texte)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Un mot doux pour accompagner la carte"
                multiline
                value={personalMessage}
                onChangeText={setPersonalMessage}
              />
            </>
          )}
          {selectionStep === 2 && (
            <>
              <View style={styles.macaronDropdownWrap}>
                <TouchableOpacity
                  style={[styles.macaronDropdownTrigger, macaronDropdownOpen && styles.macaronDropdownTriggerOpen]}
                  onPress={() => setMacaronDropdownOpen((o) => !o)}
                  activeOpacity={0.7}>
                  <Text style={styles.macaronDropdownTriggerText} numberOfLines={1}>
                    {selectionMacaron ? selectionMacaron : selectionMacaronLibre.trim() ? `Pastille libre : ${selectionMacaronLibre.trim()}` : 'Choisir un macaron'}
                  </Text>
                  <Ionicons name={macaronDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {macaronDropdownOpen ? (
                  <View style={styles.macaronSelect}>
                    {MACARON_PRESETS.map((label) => (
                      <TouchableOpacity
                        key={label}
                        style={[styles.macaronOption, selectionMacaron === label && styles.macaronOptionActive]}
                        onPress={() => { setSelectionMacaron(selectionMacaron === label ? '' : label); if (selectionMacaron !== label) setSelectionMacaronLibre(''); setMacaronDropdownOpen(false); }}>
                        <Ionicons name={selectionMacaron === label ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selectionMacaron === label ? colors.primaryPurple : colors.textSecondary} />
                        <Text style={[styles.macaronOptionText, selectionMacaron === label && styles.macaronOptionTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.macaronOption, styles.macaronOptionLast, selectionMacaron === '' && !selectionMacaronLibre.trim() && styles.macaronOptionActive]}
                      onPress={() => { setSelectionMacaron(''); setMacaronDropdownOpen(false); }}>
                      <Ionicons name={selectionMacaron === '' && !selectionMacaronLibre.trim() ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={colors.textSecondary} />
                      <Text style={[styles.macaronOptionText, selectionMacaron === '' && !selectionMacaronLibre.trim() && styles.macaronOptionTextActive]}>Pastille libre</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
              {selectionMacaron === '' && (
                <View style={styles.macaronLibreRow}>
                  <Text style={styles.configMetaText}>Texte du macaron (pastille libre)</Text>
                  <TextInput style={styles.input} placeholder="Ex : Merci pour tout..." value={selectionMacaronLibre} onChangeText={setSelectionMacaronLibre} />
                </View>
              )}
            </>
          )}
          {selectionStep === 3 && (
            <>
              <View style={styles.imagePickerRow}>
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickSelectionImage}>
                  <Ionicons name="image-outline" size={22} color={colors.primaryPurple} />
                  <Text style={styles.imagePickerButtonText}>{selectionImageUri ? "Changer l'image" : 'Choisir une image'}</Text>
                </TouchableOpacity>
                {selectionImageUri ? (
                  <TouchableOpacity style={styles.imagePickerRemove} onPress={() => setSelectionImageUri(null)}>
                    <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                    <Text style={styles.imagePickerRemoveText}>Supprimer</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {selectionImageUri ? (
                <View style={styles.imagePickerPreviewWrap}>
                  <Image source={{ uri: selectionImageUri }} style={styles.imagePickerPreview} resizeMode="cover" />
                </View>
              ) : null}
            </>
          )}
          {selectionStep === 4 && (
            <>
              <Text style={styles.configMetaText}>Police du texte</Text>
              <View style={styles.fontRow}>
                {FONT_OPTIONS_CARTE.map((f) => (
                  <TouchableOpacity key={f.id} onPress={() => setSelectionFontId(f.id)} style={[styles.fontChip, selectionFontId === f.id && styles.fontChipActive]}>
                    <Text style={[styles.fontChipLabel, selectionFontId === f.id && styles.fontChipLabelActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.colorBlockLabel, { marginTop: spacing.sm }]}>Couleur texte</Text>
              <View style={styles.colorSwatchRow}>
                {TEXT_COLORS_CARTE.map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => setSelectionTextColorId(c.id)} style={[styles.colorSwatch, { backgroundColor: c.value }, selectionTextColorId === c.id && styles.colorSwatchActive]} />
                ))}
              </View>
              <Text style={styles.colorBlockLabel}>Couleur macaron</Text>
              <View style={styles.colorSwatchRow}>
                {MACARON_COLORS_CARTE.map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => setSelectionMacaronColorId(c.id)} style={[styles.colorSwatch, { backgroundColor: c.value }, selectionMacaronColorId === c.id && styles.colorSwatchActive]} />
                ))}
              </View>
              <Text style={styles.colorBlockLabel}>Fond de la carte</Text>
              <View style={styles.colorSwatchRow}>
                {BACKGROUND_COLORS_CARTE.map((c) => (
                  <TouchableOpacity key={c.id} onPress={() => setSelectionBackgroundColorId(c.id)} style={[styles.colorSwatch, { backgroundColor: c.value }, selectionBackgroundColorId === c.id && styles.colorSwatchActive]} />
                ))}
              </View>
            </>
          )}
          {selectionStep === 5 && (
            <>
              <Text style={styles.sectionLabel}>Nom du bénéficiaire</Text>
              <TextInput style={styles.input} placeholder="Prénom Nom" value={personalRecipient} onChangeText={setPersonalRecipient} />
            </>
          )}
          {selectionStep === 6 && (
            <View style={styles.videoStepBlock}>
              <Text style={styles.videoStepTitle}>Ajoutez de l'émotion à votre cadeau</Text>
              <View style={styles.videoStepButtons}>
                <TouchableOpacity style={styles.videoStepButton} onPress={selectionVideo.recordVideo} activeOpacity={0.8}>
                  <Ionicons name="videocam-outline" size={32} color={colors.primaryPurple} />
                  <Text style={styles.videoStepButtonText}>Prendre une vidéo en direct</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.videoStepButton} onPress={selectionVideo.pickVideo} activeOpacity={0.8}>
                  <Ionicons name="images-outline" size={32} color={colors.primaryPurple} />
                  <Text style={styles.videoStepButtonText}>Télécharger une vidéo</Text>
                </TouchableOpacity>
              </View>
              {selectionVideo.hasVideo && selectionVideo.videoUri && (
                <>
                  <GiftVideoPreview
                    videoUri={selectionVideo.videoUri}
                    videoDurationSeconds={selectionVideo.videoDurationSeconds}
                    onRemove={selectionVideo.clearVideo}
                    sendWithLabel="Cette vidéo sera envoyée avec votre carte."
                  />
                  <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity onPress={() => selectionVideo.setVideoDurationOption(selectionVideo.videoDurationOption === 'default' ? 'extended' : 'default')} style={styles.cartesUpInfoPill}>
                      <Text style={styles.cartesUpInfoPillText}>{selectionVideo.videoDurationOption === 'extended' ? 'Durée étendue' : 'Durée standard'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => selectionVideo.setConsentAccepted(!selectionVideo.consentAccepted)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={selectionVideo.consentAccepted ? 'checkbox-outline' : 'square-outline'} size={20} color={colors.primaryPurple} />
                      <Text style={styles.sectionLabel}>J'accepte le stockage</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
          {selectionStep === 7 && (
            <>
              <Text style={styles.sectionLabel}>Mode d'envoi</Text>
              <View style={styles.sendModeRow}>
                <TouchableOpacity style={[styles.sendModeCard, selectionOfferSendMode === 'email' && styles.sendModeCardActive]} onPress={() => setSelectionOfferSendMode('email')} activeOpacity={0.8}>
                  <Ionicons name="mail-outline" size={24} color={selectionOfferSendMode === 'email' ? colors.white : colors.primaryPurple} />
                  <Text style={[styles.sendModeTitle, selectionOfferSendMode === 'email' && styles.sendModeTitleActive]}>E-mail</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sendModeCard, selectionOfferSendMode === 'notification' && styles.sendModeCardActive]} onPress={() => setSelectionOfferSendMode('notification')} activeOpacity={0.8}>
                  <Ionicons name="notifications-outline" size={24} color={selectionOfferSendMode === 'notification' ? colors.white : colors.primaryPurple} />
                  <Text style={[styles.sendModeTitle, selectionOfferSendMode === 'notification' && styles.sendModeTitleActive]}>Notification KashUP</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionLabel}>Mode de paiement</Text>
              <View style={styles.sendModeRow}>
                <TouchableOpacity style={[styles.sendModeCard, selectionPaymentMethod === 'cashback' && styles.sendModeCardActive]} onPress={() => setSelectionPaymentMethod('cashback')} activeOpacity={0.8}>
                  <Ionicons name="wallet-outline" size={24} color={selectionPaymentMethod === 'cashback' ? colors.white : colors.primaryPurple} />
                  <Text style={[styles.sendModeTitle, selectionPaymentMethod === 'cashback' && styles.sendModeTitleActive]}>Cashback</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sendModeCard, selectionPaymentMethod === 'card' && styles.sendModeCardActive]} onPress={() => setSelectionPaymentMethod('card')} activeOpacity={0.8}>
                  <Ionicons name="card-outline" size={24} color={selectionPaymentMethod === 'card' ? colors.white : colors.primaryPurple} />
                  <Text style={[styles.sendModeTitle, selectionPaymentMethod === 'card' && styles.sendModeTitleActive]}>Carte</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionLabel}>Adresse e-mail du destinataire</Text>
              <TextInput style={styles.input} placeholder="exemple@mail.com" value={selectionOfferRecipient} onChangeText={setSelectionOfferRecipient} keyboardType="email-address" autoCapitalize="none" />
              <TouchableOpacity
                style={[styles.primaryButton, selectionOfferSending && styles.primaryButtonDisabled]}
                onPress={async () => {
                  if (selectionOfferSendMode === 'notification') await confirmSelectionUpOfferNotification();
                  else await confirmSelectionUpOfferEmail();
                  setViewMode('landing');
                }}
                disabled={selectionOfferSending}>
                <LinearGradient colors={[...CARD_GRADIENT_COLORS]} locations={[...CARD_GRADIENT_LOCATIONS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryText}>Confirmer et offrir</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
        {!isLastStep && (
          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: spacing.lg, marginHorizontal: spacing.md }]}
            onPress={() => setSelectionStep((s) => s + 1)}>
            <LinearGradient colors={[...CARD_GRADIENT_COLORS]} locations={[...CARD_GRADIENT_LOCATIONS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>Suivant</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCarteUpWizard = () => {
    const isLastStep = carteUpStep === 2;
    return (
      <View style={styles.wizardContainer}>
        <TouchableOpacity onPress={() => setShowCartesUpInfoModal(true)} style={styles.moduleInfoTrigger}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.moduleInfoTriggerText}>À quoi ça sert et comment ça marche ?</Text>
        </TouchableOpacity>
        {carteUpStep === 0 && (
          <View style={[styles.section, styles.purchaseCard]}>
            <Text style={styles.sectionLabel}>Choisissez une Carte UP</Text>
            {contentLoading ? <ActivityIndicator color={colors.primaryPurple} /> : offerTemplates.length === 0 ? <Text style={styles.placeholderText}>Aucune Carte UP.</Text> : offerTemplates.map((gift) => (
              <PredefinedGiftCard key={gift.id} gift={gift} onOffer={() => { setSelectedPredefinedGift(gift); setCarteUpStep(1); }} />
            ))}
          </View>
        )}
        {carteUpStep === 1 && selectedPredefinedGift && (
          <View style={[styles.section, styles.purchaseCard]}>
            <Text style={styles.sectionLabel}>Vidéo (optionnel)</Text>
            <View style={styles.videoStepBlock}>
              <Text style={styles.videoStepTitle}>Ajoutez de l'émotion à votre cadeau</Text>
              <View style={styles.videoStepButtons}>
                <TouchableOpacity style={styles.videoStepButton} onPress={predefinedVideo.recordVideo} activeOpacity={0.8}>
                  <Ionicons name="videocam-outline" size={32} color={colors.primaryPurple} />
                  <Text style={styles.videoStepButtonText}>Prendre une vidéo en direct</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.videoStepButton} onPress={predefinedVideo.pickVideo} activeOpacity={0.8}>
                  <Ionicons name="images-outline" size={32} color={colors.primaryPurple} />
                  <Text style={styles.videoStepButtonText}>Télécharger une vidéo</Text>
                </TouchableOpacity>
              </View>
              {predefinedVideo.hasVideo && predefinedVideo.videoUri && (
                <>
                  <GiftVideoPreview
                    videoUri={predefinedVideo.videoUri}
                    videoDurationSeconds={predefinedVideo.videoDurationSeconds}
                    onRemove={predefinedVideo.clearVideo}
                    sendWithLabel="Cette vidéo sera envoyée avec votre carte."
                  />
                  <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity onPress={() => predefinedVideo.setVideoDurationOption(predefinedVideo.videoDurationOption === 'default' ? 'extended' : 'default')} style={styles.cartesUpInfoPill}>
                      <Text style={styles.cartesUpInfoPillText}>{predefinedVideo.videoDurationOption === 'extended' ? 'Durée étendue' : 'Durée standard'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => predefinedVideo.setConsentAccepted(!predefinedVideo.consentAccepted)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={predefinedVideo.consentAccepted ? 'checkbox-outline' : 'square-outline'} size={20} color={colors.primaryPurple} />
                      <Text style={styles.sectionLabel}>J'accepte le stockage</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
        {carteUpStep === 2 && selectedPredefinedGift && (
          <View style={[styles.section, styles.purchaseCard]}>
            <Text style={styles.sectionLabel}>Envoi et confirmation</Text>
            <Text style={styles.sectionLabel}>Bénéficiaire</Text>
            <TextInput style={styles.input} placeholder="Prénom Nom" value={predefinedBeneficiaryName} onChangeText={setPredefinedBeneficiaryName} />
            <Text style={styles.sectionLabel}>E-mail du destinataire</Text>
            <TextInput style={styles.input} placeholder="exemple@mail.com" value={predefinedRecipient} onChangeText={setPredefinedRecipient} keyboardType="email-address" />
            <Text style={styles.sectionLabel}>Mode d'envoi</Text>
            <View style={styles.sendModeRow}>
              <TouchableOpacity style={[styles.sendModeCard, predefinedSendMode === 'email' && styles.sendModeCardActive]} onPress={() => setPredefinedSendMode('email')} activeOpacity={0.8}>
                <Ionicons name="mail-outline" size={24} color={predefinedSendMode === 'email' ? colors.white : colors.primaryPurple} />
                <Text style={[styles.sendModeTitle, predefinedSendMode === 'email' && styles.sendModeTitleActive]}>E-mail</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sendModeCard, predefinedSendMode === 'notification' && styles.sendModeCardActive]} onPress={() => setPredefinedSendMode('notification')} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={24} color={predefinedSendMode === 'notification' ? colors.white : colors.primaryPurple} />
                <Text style={[styles.sendModeTitle, predefinedSendMode === 'notification' && styles.sendModeTitleActive]}>Notification</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>Mode de paiement</Text>
            <View style={styles.sendModeRow}>
              <TouchableOpacity style={[styles.sendModeCard, predefinedPaymentMethod === 'cashback' && styles.sendModeCardActive]} onPress={() => setPredefinedPaymentMethod('cashback')} activeOpacity={0.8}>
                <Ionicons name="wallet-outline" size={24} color={predefinedPaymentMethod === 'cashback' ? colors.white : colors.primaryPurple} />
                <Text style={[styles.sendModeTitle, predefinedPaymentMethod === 'cashback' && styles.sendModeTitleActive]}>Cashback</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sendModeCard, predefinedPaymentMethod === 'card' && styles.sendModeCardActive]} onPress={() => setPredefinedPaymentMethod('card')} activeOpacity={0.8}>
                <Ionicons name="card-outline" size={24} color={predefinedPaymentMethod === 'card' ? colors.white : colors.primaryPurple} />
                <Text style={[styles.sendModeTitle, predefinedPaymentMethod === 'card' && styles.sendModeTitleActive]}>Carte</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.primaryButton, predefinedSending && styles.primaryButtonDisabled]} onPress={async () => { await confirmPredefinedGift(); setViewMode('landing'); }} disabled={predefinedSending}>
              <LinearGradient colors={[...CARD_GRADIENT_COLORS]} locations={[...CARD_GRADIENT_LOCATIONS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                <Text style={styles.primaryText}>Confirmer et offrir</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        {carteUpStep === 1 && (
          <TouchableOpacity style={[styles.primaryButton, { marginTop: spacing.lg, marginHorizontal: spacing.md }]} onPress={() => setCarteUpStep(2)}>
            <LinearGradient colors={[...CARD_GRADIENT_COLORS]} locations={[...CARD_GRADIENT_LOCATIONS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>Suivant</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBoxUpWizard = () => (
    <View style={styles.wizardContainer}>
      <TouchableOpacity onPress={() => setShowCartesUpInfoModal(true)} style={styles.moduleInfoTrigger}>
        <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.moduleInfoTriggerText}>À quoi ça sert et comment ça marche ?</Text>
      </TouchableOpacity>
      {boxUpStep === 0 && renderBoxTab({
        onSelectBox: (box) => {
          setSelectedBox(box);
          boxVideo.clearVideo();
          setBoxOfferRecipient('');
          setBoxOfferMessage('');
          setBoxOfferSendMode('email');
          setBoxOfferPaymentMethod('cashback');
          setBoxUpStep(1);
        },
      })}
      {boxUpStep === 1 && (
        <View style={[styles.section, styles.purchaseCard]}>
          <Text style={styles.videoStepTitle}>Ajoutez de l'émotion à votre cadeau</Text>
          <View style={styles.videoStepButtons}>
            <TouchableOpacity style={styles.videoStepButton} onPress={boxVideo.recordVideo} activeOpacity={0.8}>
              <Ionicons name="videocam-outline" size={32} color={colors.primaryPurple} />
              <Text style={styles.videoStepButtonText}>Prendre une vidéo en direct</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoStepButton} onPress={boxVideo.pickVideo} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={32} color={colors.primaryPurple} />
              <Text style={styles.videoStepButtonText}>Télécharger une vidéo</Text>
            </TouchableOpacity>
          </View>
          {boxVideo.hasVideo && boxVideo.videoUri && (
            <>
              <GiftVideoPreview
                videoUri={boxVideo.videoUri}
                videoDurationSeconds={boxVideo.videoDurationSeconds}
                onRemove={boxVideo.clearVideo}
                sendWithLabel="Cette vidéo sera envoyée avec votre box."
              />
              <View style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={() => boxVideo.setVideoDurationOption(boxVideo.videoDurationOption === 'default' ? 'extended' : 'default')} style={styles.cartesUpInfoPill}>
                  <Text style={styles.cartesUpInfoPillText}>{boxVideo.videoDurationOption === 'extended' ? 'Durée étendue' : 'Durée standard'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => boxVideo.setConsentAccepted(!boxVideo.consentAccepted)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={boxVideo.consentAccepted ? 'checkbox-outline' : 'square-outline'} size={20} color={colors.primaryPurple} />
                  <Text style={styles.sectionLabel}>J'accepte le stockage</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <TouchableOpacity style={[styles.primaryButton, { marginTop: spacing.lg }]} onPress={() => setBoxUpStep(2)}>
            <LinearGradient colors={[...CARD_GRADIENT_COLORS]} locations={[...CARD_GRADIENT_LOCATIONS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>Suivant</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      {boxUpStep === 2 && selectedBox && (
        <View style={[styles.section, styles.purchaseCard]}>
          <Text style={styles.sectionLabel}>Offrir cette Box</Text>
          <Text style={styles.sectionLabel}>Mode d'envoi</Text>
          <View style={styles.sendModeRow}>
            <TouchableOpacity style={[styles.sendModeCard, boxOfferSendMode === 'email' && styles.sendModeCardActive]} onPress={() => setBoxOfferSendMode('email')} activeOpacity={0.8}>
              <Ionicons name="mail-outline" size={24} color={boxOfferSendMode === 'email' ? colors.white : colors.primaryPurple} />
              <Text style={[styles.sendModeTitle, boxOfferSendMode === 'email' && styles.sendModeTitleActive]}>E-mail</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sendModeCard, boxOfferSendMode === 'notification' && styles.sendModeCardActive]} onPress={() => setBoxOfferSendMode('notification')} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={24} color={boxOfferSendMode === 'notification' ? colors.white : colors.primaryPurple} />
              <Text style={[styles.sendModeTitle, boxOfferSendMode === 'notification' && styles.sendModeTitleActive]}>Notification</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>Mode de paiement</Text>
          <View style={styles.sendModeRow}>
            <TouchableOpacity style={[styles.sendModeCard, boxOfferPaymentMethod === 'cashback' && styles.sendModeCardActive]} onPress={() => setBoxOfferPaymentMethod('cashback')} activeOpacity={0.8}>
              <Ionicons name="wallet-outline" size={24} color={boxOfferPaymentMethod === 'cashback' ? colors.white : colors.primaryPurple} />
              <Text style={[styles.sendModeTitle, boxOfferPaymentMethod === 'cashback' && styles.sendModeTitleActive]}>Cashback</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sendModeCard, boxOfferPaymentMethod === 'card' && styles.sendModeCardActive]} onPress={() => setBoxOfferPaymentMethod('card')} activeOpacity={0.8}>
              <Ionicons name="card-outline" size={24} color={boxOfferPaymentMethod === 'card' ? colors.white : colors.primaryPurple} />
              <Text style={[styles.sendModeTitle, boxOfferPaymentMethod === 'card' && styles.sendModeTitleActive]}>Carte</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>{boxOfferSendMode === 'email' ? 'Adresse e-mail' : 'E-mail du destinataire (compte KashUP)'}</Text>
          <TextInput style={styles.input} placeholder="exemple@mail.com" value={boxOfferRecipient} onChangeText={setBoxOfferRecipient} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.sectionLabel}>Message</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Un message pour accompagner la box" value={boxOfferMessage} onChangeText={setBoxOfferMessage} multiline />

          {boxOfferSendMode === 'email' ? (
            <TouchableOpacity
              style={[styles.primaryButton, boxPdfExporting && styles.primaryButtonDisabled]}
              disabled={boxPdfExporting}
              onPress={async () => {
                if (!selectedBox) return;
                try {
                  setBoxPdfExporting(true);
                  const title = selectedBox.title ?? selectedBox.nom ?? 'Box UP';
                  const price = (selectedBox.priceFrom ?? selectedBox.value ?? 0).toFixed(0);
                  const html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><style>body{font-family:system-ui;padding:24px;} .card{max-width:320px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;} h1{font-size:18px;margin:0 0 8px;} p{margin:4px 0;color:#334155;}</style></head><body><div class=\"card\"><h1>${title}</h1><p>${(selectedBox.shortDescription ?? selectedBox.description ?? '').substring(0, 200)}</p><p><strong>Valeur : ${price} €</strong></p></div></body></html>`;
                  const { uri } = await Print.printToFileAsync({ html, width: 340, height: 400 });
                  const canShare = await Sharing.isAvailableAsync();
                  if (canShare) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Partager la Box UP (PDF)' });
                  else Alert.alert('Export PDF', "Le partage n'est pas disponible sur cet appareil. Le PDF a été généré.");
                  setViewMode('landing');
                } catch {
                  Alert.alert('Erreur', 'Impossible de générer le PDF.');
                } finally {
                  setBoxPdfExporting(false);
                }
              }}>
              <LinearGradient colors={[...CARD_GRADIENT_COLORS]} locations={[...CARD_GRADIENT_LOCATIONS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                <Text style={styles.primaryText}>{boxPdfExporting ? 'Génération du PDF…' : 'Télécharger / partager (PDF)'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, boxOfferSending && styles.primaryButtonDisabled]}
              disabled={boxOfferSending}
              onPress={async () => {
                if (!selectedBox) return;
                const email = boxOfferRecipient.trim();
                if (!email) {
                  Alert.alert('E-mail requis', "Indiquez l'e-mail du compte KashUP du destinataire.");
                  return;
                }
                const payload = { boxId: selectedBox.id, beneficiaryEmail: email, message: boxOfferMessage.trim() || undefined };
                try {
                  setBoxOfferSending(true);
                  if (boxOfferPaymentMethod === 'card') {
                    const { clientSecret, paymentIntentId } = await createGiftCardPaymentIntent({ giftType: 'box_up', ...payload });
                    const { error: initErr } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'KashUP' });
                    if (initErr) {
                      Alert.alert('Paiement', initErr.message ?? "Impossible d'ouvrir le paiement.");
                      return;
                    }
                    const { error: presentErr } = await presentPaymentSheet();
                    if (presentErr) {
                      if (presentErr.code !== 'Canceled') Alert.alert('Paiement', presentErr.message ?? 'Paiement annulé ou échoué.');
                      return;
                    }
                    const result = await confirmCardPaymentForGift({ paymentIntentId, giftType: 'box_up', ...payload });
                    if (boxVideo.hasVideo && boxVideo.videoUri && boxVideo.videoDurationSeconds && boxVideo.consentAccepted && result.purchaseId) {
                      try {
                        await uploadGiftVideo({
                          purchaseId: result.purchaseId,
                          videoUri: boxVideo.videoUri,
                          requestedVideoDuration: boxVideo.videoDurationSeconds,
                          videoDurationOption: boxVideo.videoDurationOption,
                          consentAccepted: boxVideo.consentAccepted,
                        });
                      } catch {
                        // ne bloque pas l'envoi
                      }
                    }
                    Alert.alert('Box envoyée', result?.message ?? "Le destinataire a été notifié dans l'app.");
                  } else {
                    const result = await sendBoxUp(payload);
                    if (boxVideo.hasVideo && boxVideo.videoUri && boxVideo.videoDurationSeconds && boxVideo.consentAccepted && result.purchaseId) {
                      try {
                        await uploadGiftVideo({
                          purchaseId: result.purchaseId,
                          videoUri: boxVideo.videoUri,
                          requestedVideoDuration: boxVideo.videoDurationSeconds,
                          videoDurationOption: boxVideo.videoDurationOption,
                          consentAccepted: boxVideo.consentAccepted,
                        });
                      } catch {
                        // idem
                      }
                    }
                    Alert.alert('Box envoyée', result.message ?? "Le destinataire a été notifié dans l'app.");
                  }
                  setViewMode('landing');
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as Error)?.message ?? 'Envoi impossible.';
                  Alert.alert('Erreur', msg);
                } finally {
                  setBoxOfferSending(false);
                }
              }}>
              <LinearGradient colors={[...CARD_GRADIENT_COLORS]} locations={[...CARD_GRADIENT_LOCATIONS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                <Text style={styles.primaryText}>{boxOfferSending ? 'Envoi…' : 'Confirmer et offrir'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  /** Carte Sélection UP : config (si présente) + formulaire + carte test toujours visibles */
  const renderCarteSelectionUpContent = () => (
    <View style={styles.buyContainer}>
      {contentLoading ? (
        <ActivityIndicator color={colors.primaryPurple} style={{ marginVertical: spacing.lg }} />
      ) : (
        <>
          {selectionUpConfig.length === 0 ? null : (
            (selectionUpConfigActive ? [selectionUpConfigActive] : selectionUpConfig).map((config) => (
              <View key={config.id} style={[styles.purchaseCard, { marginBottom: spacing.lg }]}>
                <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>Configuration Carte Sélection UP</Text>
                {config.imageUrl ? (
                  <Image
                    source={{ uri: normalizeImageUrl(config.imageUrl) }}
                    style={styles.configImage}
                    resizeMode="cover"
                  />
                ) : null}
                <Text style={styles.configTitle}>{config.nom}</Text>
                <Text style={styles.offerSubtitle}>{config.description}</Text>
                <View style={[styles.cashbackRow, { marginBottom: 8 }]}>
                  <View style={styles.cashbackItem}>
                    <Ionicons
                      name="pricetag"
                      size={12}
                      color={(config.cashbackRate != null && config.cashbackRate !== '' && Number(config.cashbackRate) >= 0) ? '#05A357' : colors.textSecondary}
                    />
                    <Text style={[
                      styles.cashbackRate,
                      (config.cashbackRate == null || config.cashbackRate === '' || Number(config.cashbackRate) < 0) && styles.cashbackRateEmpty,
                    ]}>
                      {(config.cashbackRate != null && config.cashbackRate !== '' && Number(config.cashbackRate) >= 0)
                        ? `${Number(config.cashbackRate)}%`
                        : '—'}
                    </Text>
                    <Text style={styles.cashbackItemLabel}>
                      {(config.cashbackRate != null && config.cashbackRate !== '' && Number(config.cashbackRate) >= 0)
                        ? "À l'achat"
                        : 'Non renseigné'}
                    </Text>
                  </View>
                </View>
                <View style={styles.configMeta}>
                  <Text style={styles.configMetaText}>
                    Montant : {config.montantsDisponibles.length > 0
                      ? config.montantsDisponibles.map((m) => `${m} €`).join(', ')
                      : 'libre (défini par vous)'}
                  </Text>
                  <Text style={styles.configMetaText}>
                    Partenaires éligibles : {config.partenairesEligibles.length} partenaire{config.partenairesEligibles.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {config.conditions ? (
                  <View style={styles.configBlock}>
                    <Text style={styles.sectionLabel}>Conditions</Text>
                    <Text style={styles.configBlockText}>{config.conditions}</Text>
                  </View>
                ) : null}
                {config.commentCaMarche ? (
                  <View style={styles.configBlock}>
                    <Text style={styles.sectionLabel}>Comment ça marche</Text>
                    <Text style={styles.configBlockText}>{config.commentCaMarche}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
          <Text style={[styles.sectionLabel, { marginTop: spacing.md, marginBottom: spacing.sm }]}>Aperçu en direct</Text>
          <View
            style={[
              styles.carteTestPreview,
              {
                backgroundColor:
                  BACKGROUND_PALETTE_GRID.find((c) => c.id === selectionBackgroundColorId)?.value ?? '#ffffff',
              },
            ]}>
            {selectionImageUri ? (
              <View style={styles.carteTestImageWrap}>
                <Image source={{ uri: selectionImageUri }} style={styles.carteTestImage} resizeMode="cover" />
              </View>
            ) : (
              <View style={styles.carteTestImagePlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.carteTestImagePlaceholderText}>Image</Text>
              </View>
            )}
            <View style={styles.carteTestBody}>
              <View style={styles.carteTestBodyText}>
                <Text
                  style={[
                    styles.carteTestMainText,
                    {
                      color: TEXT_COLORS_CARTE.find((c) => c.id === selectionTextColorId)?.value ?? '#1a1a2e',
                      fontFamily: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontFamily,
                      fontStyle: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontStyle,
                      fontWeight: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontWeight,
                    },
                  ]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}>
                  Profite des <Text style={styles.carteTestHighlight}>{personalAmount ? `${personalAmount} €` : '…'}</Text> chez{' '}
                  <Text style={styles.carteTestHighlight}>{personalPartner?.name ?? '…'}</Text>
                </Text>
                {personalMessage ? (
                  <Text
                    style={[
                      styles.carteTestMessage,
                      {
                        color: TEXT_COLORS_CARTE.find((c) => c.id === selectionTextColorId)?.value ?? '#1a1a2e',
                        fontFamily: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontFamily,
                        fontStyle: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontStyle,
                        fontWeight: FONT_OPTIONS_CARTE.find((f) => f.id === selectionFontId)?.fontWeight,
                      },
                    ]}
                    numberOfLines={3}>
                    {personalMessage}
                  </Text>
                ) : null}
                <View style={styles.carteTestMacaronLogoRow}>
                  {(selectionMacaron || selectionMacaronLibre) ? (
                    <View
                      style={[
                        styles.carteTestMacaron,
                        {
                          backgroundColor:
                            MACARON_PALETTE_GRID.find((c) => c.id === selectionMacaronColorId)?.value ?? colors.primary,
                        },
                      ]}>
                      <Text style={styles.carteTestMacaronText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {selectionMacaron === '' ? (selectionMacaronLibre.trim() || 'Votre texte') : selectionMacaron}
                      </Text>
                    </View>
                  ) : null}
                  {personalPartner?.logoUrl ? (
                    <View style={styles.carteTestLogoWrap}>
                      <Image
                        source={{ uri: normalizeImageUrl(personalPartner.logoUrl) }}
                        style={styles.carteTestLogo}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
          <Text style={[styles.offerSubtitle, { marginBottom: 12, marginTop: spacing.lg }]}>
            Créez votre carte : choisissez un partenaire, un montant, un texte, un visuel et un macaron. Les changements s’affichent en direct ci‑dessus.
          </Text>
          <View style={styles.purchaseCard}>{renderFormFields()}</View>
        </>
      )}
    </View>
  );

  /** Carte UP : cartes créées par l’admin (partenaire, montant, image) – l’utilisateur ajoute texte + macaron – aligné back office */
  const renderCarteUpContent = () => (
    <View style={styles.offerSection}>
      <Text style={styles.offerTitle}>Carte UP</Text>
      <Text style={styles.offerSubtitle}>
        Cartes créées par l’administrateur : partenaire, montant, image. Vous pouvez ajouter un texte et un macaron avant d’envoyer.
      </Text>
      {contentLoading ? (
        <ActivityIndicator color={colors.primaryPurple} style={{ marginTop: spacing.md }} />
      ) : offerTemplates.length === 0 ? (
        <Text style={styles.placeholderText}>Aucune Carte UP créée pour l’instant.</Text>
      ) : (
        offerTemplates.map((gift) => (
          <PredefinedGiftCard key={gift.id} gift={gift} onOffer={() => openPredefinedModal(gift)} />
        ))
      )}
    </View>
  );

  const renderBoxTab = (opts?: { onSelectBox?: (box: GiftBox) => void }) => (
    <View style={styles.boxSection}>
      {contentLoading ? (
        <ActivityIndicator color={colors.primaryPurple} style={{ marginVertical: spacing.lg }} />
      ) : boxTemplates.length === 0 ? (
        <Text style={styles.placeholderText}>Les Box UP seront bientôt disponibles.</Text>
      ) : (
        boxTemplates.map((box) => {
          const boxImageUri = getBoxImageUri(box);
          return (
          <View key={box.id} style={styles.boxCard}>
            {boxImageUri ? (
            <ImageBackground
              source={{ uri: boxImageUri }}
              style={styles.boxImage}
              imageStyle={styles.boxImageRadius}>
              <LinearGradient
                colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.boxImageOverlay}>
                <Text style={styles.boxBadge}>Multi-partenaires</Text>
                <Text style={styles.boxTitle}>{box.nom ?? box.title}</Text>
                <Text style={styles.boxSubtitle}>{box.shortDescription ?? box.description}</Text>
              </LinearGradient>
            </ImageBackground>
            ) : (
            <View style={[styles.boxImage, styles.boxImagePlaceholder]}>
              <LinearGradient
                colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.1)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.boxImagePlaceholderCenter}>
                <Ionicons name="gift-outline" size={48} color="rgba(255,255,255,0.5)" />
                <Text style={styles.boxImagePlaceholderText}>Pas d'image</Text>
              </View>
              <View style={styles.boxImageOverlay}>
                <Text style={styles.boxBadge}>Multi-partenaires</Text>
                <Text style={styles.boxTitle}>{box.nom ?? box.title}</Text>
                <Text style={styles.boxSubtitle}>{box.shortDescription ?? box.description}</Text>
              </View>
            </View>
            )}
            <View style={styles.boxInfo}>
              <Text style={styles.boxPrice}>À partir de {(box.value ?? box.priceFrom).toFixed(0)} €</Text>
              <View style={styles.cashbackRow}>
                <View style={styles.cashbackItem}>
                  <Ionicons
                    name="pricetag"
                    size={12}
                    color={(box.cashbackRate != null && box.cashbackRate !== '' && Number(box.cashbackRate) >= 0) ? '#05A357' : colors.textSecondary}
                  />
                  <Text style={[
                    styles.cashbackRate,
                    (box.cashbackRate == null || box.cashbackRate === '' || Number(box.cashbackRate) < 0) && styles.cashbackRateEmpty,
                  ]}>
                    {(box.cashbackRate != null && box.cashbackRate !== '' && Number(box.cashbackRate) >= 0)
                      ? `${Number(box.cashbackRate)}%`
                      : '—'}
                  </Text>
                  <Text style={styles.cashbackItemLabel}>
                    {(box.cashbackRate != null && box.cashbackRate !== '' && Number(box.cashbackRate) >= 0)
                      ? "À l'achat"
                      : 'Non renseigné'}
                  </Text>
                </View>
              </View>
              {(box.commentCaMarche ?? box.cashbackInfo) && (
                <Text style={styles.boxCashback}>{box.commentCaMarche ?? box.cashbackInfo}</Text>
              )}
              {(box.partenaires && box.partenaires.length > 0 ? box.partenaires : box.partners)?.length > 0 ? (
                <View style={styles.boxPartnerBlock}>
                  <Text style={styles.boxPartnerBlockTitle}>Offres chez les partenaires</Text>
                  <View style={styles.boxPartnerList}>
                    {(box.partenaires && box.partenaires.length > 0 ? box.partenaires : box.partners).map((partner, idx) => {
                      const name = 'partenaireName' in partner ? partner.partenaireName : partner.name;
                      const id = 'partenaireId' in partner ? partner.partenaireId : partner.id;
                      const offre = 'offrePartenaire' in partner ? partner.offrePartenaire : null;
                      const accentColor = 'accentColor' in partner && partner.accentColor ? partner.accentColor : getAccentColor(id);
                      const logoUrl = id ? partnerLogoMap[String(id)] : null;
                      return (
                        <View key={id || idx} style={styles.boxPartnerItem}>
                          {logoUrl ? (
                            <View style={styles.boxPartnerItemLogoWrap}>
                              <Image source={{ uri: normalizeImageUrl(logoUrl) }} style={styles.boxPartnerItemLogo} resizeMode="contain" />
                            </View>
                          ) : (
                            <View style={[styles.boxPartnerItemDot, { backgroundColor: accentColor }]} />
                          )}
                          <View style={styles.boxPartnerItemContent}>
                            <Text style={styles.boxPartnerItemName} numberOfLines={1}>{name ?? id}</Text>
                            {offre ? (
                              <Text style={styles.boxPartnerItemOffre} numberOfLines={2}>{offre}</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.boxButtonWrap}
                onPress={() => (opts?.onSelectBox ? opts.onSelectBox(box) : navigation.navigate('BoxUpDetail', { boxId: box.id, box }))}>
                <LinearGradient
                  colors={[...CARD_GRADIENT_COLORS]}
                  locations={[...CARD_GRADIENT_LOCATIONS]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.boxButton}>
                  <Text style={styles.boxButtonText}>Voir la Box</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          );
        })
      )}
    </View>
  );

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
        {giftCardsError && (
          <TouchableOpacity style={styles.errorBanner} onPress={refetchGiftCards}>
            <Text style={styles.errorBannerText}>{giftCardsError}</Text>
            <Text style={styles.errorBannerCta}>Touchez pour réessayer</Text>
          </TouchableOpacity>
        )}
        <TabScreenHeader
          scrollY={scrollY}
          onNotificationPress={handleNotificationPress}
          onProfilePress={handleProfilePress}
          unreadCount={unreadCount}
          cashback={cashback}
          points={points}
          showPillsRow
          solidBackground
          onBackPress={
            viewMode !== 'landing'
              ? () => {
                  if (viewMode === 'mes_cartes') setViewMode('landing');
                  else if (viewMode === 'selection_flow') {
                    if (selectionStep > 0) setSelectionStep((s) => s - 1);
                    else setViewMode('landing');
                  } else if (viewMode === 'carte_up_flow') {
                    if (carteUpStep > 0) setCarteUpStep((s) => s - 1);
                    else setViewMode('landing');
                  } else if (viewMode === 'box_up_flow') {
                    if (boxUpStep > 0) setBoxUpStep((s) => s - 1);
                    else setViewMode('landing');
                  }
                }
              : undefined
          }
        />
        <AnimatedScrollView
          style={styles.scrollFill}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(0, insets.top - 36) + TAB_HEADER_TOP_OFFSET + TAB_HEADER_HEIGHT + 15,
              paddingBottom: Math.max(spacing.xl * 2, insets.bottom + BOTTOM_TAB_AREA),
            },
          ]}
          stickyHeaderIndices={
            activeTab === 'cartes-up' && cartesUpSubTab === 'selection' ? [7] : []
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          refreshControl={<RefreshControl refreshing={giftCardsLoading} onRefresh={refetchGiftCards} />}
        >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>
            {viewMode === 'selection_flow' ? 'Carte Sélection UP' : viewMode === 'carte_up_flow' ? 'Carte UP' : viewMode === 'box_up_flow' ? 'Box UP' : viewMode === 'mes_cartes' ? 'Mes cartes' : 'Cartes UP'}
          </Text>
          {viewMode === 'landing' && <Text style={styles.pageSubtitle}>Faites plaisir à vos proches.</Text>}
        </View>

        {viewMode === 'landing' && contentError ? (
          <TouchableOpacity style={styles.errorBanner} onPress={loadEditorialContent}>
            <Text style={styles.errorBannerText}>{contentError}</Text>
            <Text style={styles.errorBannerCta}>Actualiser les cadeaux partenaires</Text>
          </TouchableOpacity>
        ) : null}

        {viewMode === 'landing' && (
          <>
            <View style={styles.cartesUpIntro}>
              <View style={styles.cartesUpCardsRow}>
              <TouchableOpacity
                style={styles.cartesUpCard}
                activeOpacity={0.9}
                onPress={() => {
                  setViewMode('selection_flow');
                  setSelectionStep(0);
                }}>
                <ImageBackground
                  source={{ uri: fallbackHeroImage }}
                  style={styles.cartesUpCardImage}
                  imageStyle={styles.cartesUpCardImageInner}>
                  <View style={styles.cartesUpCardOverlay} />
                  <View style={styles.cartesUpCardContent}>
                    <Text style={styles.cartesUpCardTitle}>Carte Sélection UP</Text>
                    <Text style={styles.cartesUpCardText}>
                      Choisissez un partenaire et un montant, envoyez un cadeau ultra personnalisé.
                    </Text>
                  </View>
                </ImageBackground>
                <View style={styles.cartesUpCardFooter}>
                  <TouchableOpacity
                    style={styles.cartesUpInfoPill}
                    onPress={() => setInfoCardType('selection_up')}
                    activeOpacity={0.8}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primaryPurple} />
                    <Text style={styles.cartesUpInfoPillText}>En savoir plus</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cartesUpCard}
                activeOpacity={0.9}
                onPress={() => {
                  setViewMode('carte_up_flow');
                  setCarteUpStep(0);
                }}>
                <ImageBackground
                  source={{ uri: fallbackHeroImage }}
                  style={styles.cartesUpCardImage}
                  imageStyle={styles.cartesUpCardImageInner}>
                  <View style={styles.cartesUpCardOverlay} />
                  <View style={styles.cartesUpCardContent}>
                    <Text style={styles.cartesUpCardTitle}>Carte UP</Text>
                    <Text style={styles.cartesUpCardText}>
                      Cartes prêtes à l’emploi, sélectionnées par KashUP, à envoyer en quelques secondes.
                    </Text>
                  </View>
                </ImageBackground>
                <View style={styles.cartesUpCardFooter}>
                  <TouchableOpacity
                    style={styles.cartesUpInfoPill}
                    onPress={() => setInfoCardType('carte_up')}
                    activeOpacity={0.8}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primaryPurple} />
                    <Text style={styles.cartesUpInfoPillText}>En savoir plus</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cartesUpCard}
                activeOpacity={0.9}
                onPress={() => {
                  setViewMode('box_up_flow');
                  setBoxUpStep(0);
                }}>
                <ImageBackground
                  source={{ uri: fallbackHeroImage }}
                  style={styles.cartesUpCardImage}
                  imageStyle={styles.cartesUpCardImageInner}>
                  <View style={styles.cartesUpCardOverlay} />
                  <View style={styles.cartesUpCardContent}>
                    <Text style={styles.cartesUpCardTitle}>Box UP</Text>
                    <Text style={styles.cartesUpCardText}>
                      Une vraie box cadeau physique, avec vos produits favoris et un message vidéo.
                    </Text>
                  </View>
                </ImageBackground>
                <View style={styles.cartesUpCardFooter}>
                  <TouchableOpacity
                    style={styles.cartesUpInfoPill}
                    onPress={() => setInfoCardType('box_up')}
                    activeOpacity={0.8}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primaryPurple} />
                    <Text style={styles.cartesUpInfoPillText}>En savoir plus</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.moduleInfoTrigger} onPress={() => setViewMode('mes_cartes')}>
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            <Text style={styles.moduleInfoTriggerText}>Voir mes cartes</Text>
          </TouchableOpacity>
        </>
        )}

        {viewMode === 'mes_cartes' && (
          <View style={styles.section}>
            {renderMyVouchers()}
          </View>
        )}

        {viewMode === 'selection_flow' && renderSelectionUpWizard()}

        {viewMode === 'carte_up_flow' && renderCarteUpWizard()}

        {viewMode === 'box_up_flow' && renderBoxUpWizard()}
      </AnimatedScrollView>

      </KeyboardAvoidingView>

      <PartnerPickerModal
        visible={partnerPickerVisible}
        onClose={() => setPartnerPickerVisible(false)}
        partners={filteredPartners}
        categories={partnerCategories}
        onSelect={handlePartnerSelect}
        search={partnerSearch}
        onSearchChange={setPartnerSearch}
        categoryFilter={partnerCategoryFilter}
        onCategoryChange={setPartnerCategoryFilter}
        deptFilter={partnerDeptFilter}
        onDeptChange={setPartnerDeptFilter}
      />

      <Modal
        visible={infoCardType != null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoCardType(null)}>
        <TouchableOpacity
          style={styles.moduleInfoModalOverlay}
          activeOpacity={1}
          onPress={() => setInfoCardType(null)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.moduleInfoModalBox}>
            <View style={styles.moduleInfoModalHeader}>
              <Text style={styles.moduleInfoModalTitle}>
                {infoCardType === 'selection_up'
                  ? 'Carte Sélection UP'
                  : infoCardType === 'carte_up'
                  ? 'Carte UP'
                  : 'Box UP'}
              </Text>
            </View>
            <View style={styles.moduleInfoModalBody}>
              <Text style={styles.moduleInfoModalText}>
                {infoCardType === 'selection_up' &&
                  "Vous choisissez un partenaire, un montant et un message. Le bénéficiaire reçoit une carte 100% digitale et personnalisable, valable chez ce partenaire."}
                {infoCardType === 'carte_up' &&
                  "Des cartes prêtes à l'emploi, créées par KashUP : vous sélectionnez l'offre, vous ajoutez un petit mot et vous envoyez la carte en quelques secondes."}
                {infoCardType === 'box_up' &&
                  "Vous composez une box cadeau physique (produits, expériences…) et vous l'associez à un message et, si vous le souhaitez, à une vidéo personnalisée."}
              </Text>
            </View>
            <TouchableOpacity style={styles.moduleInfoModalClose} onPress={() => setInfoCardType(null)}>
              <Text style={styles.moduleInfoModalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <SelectionUpOfferModal
        visible={selectionOfferModalVisible}
        onClose={() => setSelectionOfferModalVisible(false)}
        partner={personalPartner}
        amount={personalAmount}
        beneficiaryName={personalRecipient}
        sendMode={selectionOfferSendMode}
        onSendModeChange={setSelectionOfferSendMode}
        recipient={selectionOfferRecipient}
        onRecipientChange={setSelectionOfferRecipient}
        sending={selectionOfferSending}
        paymentMethod={selectionPaymentMethod}
        onPaymentMethodChange={setSelectionPaymentMethod}
        onConfirmNotification={confirmSelectionUpOfferNotification}
        onConfirmEmail={confirmSelectionUpOfferEmail}
        videoHasVideo={selectionVideo.hasVideo}
        videoDurationSeconds={selectionVideo.videoDurationSeconds}
        videoDurationOption={selectionVideo.videoDurationOption}
        onVideoDurationOptionChange={selectionVideo.setVideoDurationOption}
        videoConsentAccepted={selectionVideo.consentAccepted}
        onVideoConsentChange={selectionVideo.setConsentAccepted}
        onPickVideo={selectionVideo.pickVideo}
        onRecordVideo={selectionVideo.recordVideo}
        onClearVideo={selectionVideo.clearVideo}
        unreadCount={unreadCount}
        cashback={cashback}
        points={points}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        onNavigateToTab={(tab) => {
          setSelectionOfferModalVisible(false);
          (navigation as any).navigate(tab);
        }}
      />

      <PredefinedGiftModal
        visible={predefinedModalVisible}
        onClose={() => setPredefinedModalVisible(false)}
        gift={selectedPredefinedGift}
        sendMode={predefinedSendMode}
        onSendModeChange={setPredefinedSendMode}
        recipient={predefinedRecipient}
        onRecipientChange={setPredefinedRecipient}
        beneficiaryName={predefinedBeneficiaryName}
        onBeneficiaryNameChange={setPredefinedBeneficiaryName}
        message={predefinedMessage}
        onMessageChange={setPredefinedMessage}
        selectedMacaron={predefinedMacaron}
        onMacaronChange={setPredefinedMacaron}
        selectedMacaronLibre={predefinedMacaronLibre}
        onMacaronLibreChange={setPredefinedMacaronLibre}
        selectedMacaronColorId={predefinedMacaronColorId}
        onMacaronColorChange={setPredefinedMacaronColorId}
        selectedFontId={predefinedFontId}
        onFontChange={setPredefinedFontId}
        selectedTextColorId={predefinedTextColorId}
        onTextColorChange={setPredefinedTextColorId}
        selectedBackgroundColorId={predefinedBackgroundColorId}
        onBackgroundColorChange={setPredefinedBackgroundColorId}
        onConfirm={confirmPredefinedGift}
        videoHasVideo={predefinedVideo.hasVideo}
        videoDurationSeconds={predefinedVideo.videoDurationSeconds}
        videoDurationOption={predefinedVideo.videoDurationOption}
        onVideoDurationOptionChange={predefinedVideo.setVideoDurationOption}
        videoConsentAccepted={predefinedVideo.consentAccepted}
        onVideoConsentChange={predefinedVideo.setConsentAccepted}
        onPickVideo={predefinedVideo.pickVideo}
        onRecordVideo={predefinedVideo.recordVideo}
        onClearVideo={predefinedVideo.clearVideo}
        sending={predefinedSending}
        paymentMethod={predefinedPaymentMethod}
        onPaymentMethodChange={setPredefinedPaymentMethod}
        unreadCount={unreadCount}
        cashback={cashback}
        points={points}
        onNotificationPress={handleNotificationPress}
        onProfilePress={handleProfilePress}
        onNavigateToTab={(tab) => {
          setPredefinedModalVisible(false);
          (navigation as any).navigate(tab);
        }}
      />

      <Modal
        visible={showCartesUpInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCartesUpInfoModal(false)}>
        <TouchableOpacity
          style={styles.moduleInfoModalOverlay}
          activeOpacity={1}
          onPress={() => setShowCartesUpInfoModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.moduleInfoModalBox}>
            <View style={styles.moduleInfoModalHeader}>
              <Text style={styles.moduleInfoModalTitle}>Cartes UP</Text>
              <TouchableOpacity onPress={() => setShowCartesUpInfoModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={28} color={colors.textMain} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.moduleInfoModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.moduleIntroTitle}>À quoi ça sert</Text>
              <Text style={styles.moduleIntroBody}>
                Les Cartes UP permettent d'offrir ou d'utiliser des cartes cadeaux et des box (packs) partenaires, payantes ou en points.
              </Text>
              <Text style={styles.moduleIntroTitle}>Comment ça marche</Text>
              <Text style={[styles.moduleIntroBody, { marginBottom: 0 }]}>
                « Mes cartes » liste vos cartes reçues. « Carte Sélection UP » et « Carte UP » permettent d'envoyer une carte cadeau. « Box UP » propose des box à acheter ou à obtenir avec des points.
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

type PartnerPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  partners: Partner[];
  categories: Array<{ id: string; label: string }>;
  onSelect: (partnerId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  deptFilter: 'all' | 'Martinique' | 'Guadeloupe' | 'Guyane';
  onDeptChange: (value: 'all' | 'Martinique' | 'Guadeloupe' | 'Guyane') => void;
};

function PartnerPickerModal({
  visible,
  onClose,
  partners,
  categories,
  onSelect,
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  deptFilter,
  onDeptChange,
}: PartnerPickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choisir un partenaire</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textMain} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalSearch}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.modalSearchInput}
            placeholder="Rechercher par nom ou ville"
            value={search}
            onChangeText={onSearchChange}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.modalDeptRow}
          contentContainerStyle={styles.modalDeptContent}>
          {['all', 'Martinique', 'Guadeloupe', 'Guyane'].map((dept) => {
            const label = dept === 'all' ? 'Tous les territoires' : dept;
            const active = deptFilter === dept;
            return (
              <TouchableOpacity
                key={dept}
                style={[styles.modalDeptChip, active && styles.modalDeptChipActive]}
                onPress={() => onDeptChange(dept as typeof deptFilter)}>
                <Text
                  style={[
                    styles.modalDeptChipText,
                    active && styles.modalDeptChipTextActive,
                  ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.modalCategoryRow}
          contentContainerStyle={styles.modalCategoryContent}>
          <TouchableOpacity
            style={[styles.modalCategoryChip, categoryFilter === 'all' && styles.modalCategoryChipActive]}
            onPress={() => onCategoryChange('all')}>
            <Text
              style={[
                styles.modalCategoryChipText,
                categoryFilter === 'all' && styles.modalCategoryChipTextActive,
              ]}>
              Tous
            </Text>
          </TouchableOpacity>
          {categories.map((category) => {
            const active = categoryFilter === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.modalCategoryChip, active && styles.modalCategoryChipActive]}
                onPress={() => onCategoryChange(category.id)}>
                <Text
                  style={[
                    styles.modalCategoryChipText,
                    active && styles.modalCategoryChipTextActive,
                  ]}>
                  {category.label.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <ScrollView style={styles.modalList}>
          {partners.map((partner) => (
            <TouchableOpacity
              key={partner.id}
              style={styles.modalPartnerRow}
              onPress={() => onSelect(partner.id)}>
              <View style={styles.modalPartnerAvatar}>
                <Text style={styles.modalPartnerAvatarText}>{partner.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalPartnerName}>{partner.name}</Text>
                <Text style={styles.modalPartnerMeta}>
                  {partner.city} • {partner.country}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
          {partners.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Aucun partenaire</Text>
              <Text style={styles.emptySubtitle}>Ajustez vos filtres ou votre recherche.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

type SelectionUpOfferModalProps = {
  visible: boolean;
  onClose: () => void;
  partner: Partner | null;
  amount: string;
  beneficiaryName: string;
  sendMode: 'email' | 'notification';
  onSendModeChange: (mode: 'email' | 'notification') => void;
  recipient: string;
  onRecipientChange: (value: string) => void;
  sending: boolean;
  paymentMethod?: 'cashback' | 'card';
  onPaymentMethodChange?: (method: 'cashback' | 'card') => void;
  onConfirmNotification: () => void;
  onConfirmEmail: () => void;
  /** Vidéo personnalisée (optionnel) */
  videoHasVideo?: boolean;
  videoDurationSeconds?: number | null;
  videoDurationOption?: 'default' | 'extended';
  onVideoDurationOptionChange?: (v: 'default' | 'extended') => void;
  videoConsentAccepted?: boolean;
  onVideoConsentChange?: (v: boolean) => void;
  onPickVideo?: () => void;
  onRecordVideo?: () => void;
  onClearVideo?: () => void;
  /** Bandeau haut : points et cashback */
  cashback?: number | null;
  points?: number | null;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  /** Bandeau bas (menu) : ferme le modal et navigue vers l'onglet */
  onNavigateToTab?: (tab: keyof BottomTabParamList) => void;
};

const formatPointsModalDisplay = (v: number) => `${v.toLocaleString('fr-FR')} pts`;
const formatCashbackModalDisplay = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SelectionUpOfferModal({
  visible,
  onClose,
  partner,
  amount,
  beneficiaryName,
  sendMode,
  onSendModeChange,
  recipient,
  onRecipientChange,
  sending,
  paymentMethod = 'cashback',
  onPaymentMethodChange,
  onConfirmNotification,
  onConfirmEmail,
  videoHasVideo = false,
  videoDurationSeconds = null,
  videoDurationOption = 'default',
  onVideoDurationOptionChange,
  videoConsentAccepted = false,
  onVideoConsentChange,
  onPickVideo,
  onRecordVideo,
  onClearVideo,
  cashback,
  points,
  unreadCount = 0,
  onNotificationPress,
  onProfilePress,
  onNavigateToTab,
}: SelectionUpOfferModalProps) {
  const insets = useSafeAreaInsets();
  const bandeauPaddingTop = Math.max(insets.top, 8);
  const amountValue = Number(amount) || 0;
  const partnerName = partner?.name ?? 'KashUP';
  const partnerLogoUri = partner?.logoUrl ? normalizeImageUrl(partner.logoUrl) : null;
  const pointsVal = points ?? 0;
  const cashbackVal = cashback ?? 0;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right', 'bottom']}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.modalBandeauRewards, { paddingTop: bandeauPaddingTop }]}>
          <View style={styles.modalBandeauRewardsInner}>
            {onNotificationPress ? (
              <TouchableOpacity style={styles.modalBandeauIcon} onPress={onNotificationPress} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={24} color={colors.textMain} />
                {unreadCount > 0 && (
                  <View style={styles.modalBandeauBadge}>
                    <Text style={styles.modalBandeauBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
            <View style={styles.modalBandeauPillsRow}>
              <LinearGradient
                colors={['#059669', colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalBandeauPill}>
                <Ionicons name="star" size={16} color="#FFF" />
                <Text style={styles.modalBandeauPillText}>{formatPointsModalDisplay(pointsVal)}</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#059669', colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalBandeauPill}>
                <Text style={styles.modalBandeauPillSymbol}>€</Text>
                <Text style={styles.modalBandeauPillText}>{formatCashbackModalDisplay(cashbackVal)}</Text>
              </LinearGradient>
            </View>
            {onProfilePress ? (
              <TouchableOpacity style={styles.modalBandeauIcon} onPress={onProfilePress} activeOpacity={0.7}>
                <Ionicons name="person-circle-outline" size={24} color={colors.textMain} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
            <TouchableOpacity style={styles.modalBandeauClose} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.textMain} />
            </TouchableOpacity>
          </View>
        </View>
        <KeyboardAvoidingView
          style={styles.offerModalContentWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ScrollView
            style={styles.offerModalScrollView}
            contentContainerStyle={[
              styles.offerModalScroll,
              { paddingHorizontal: spacing.lg },
              onNavigateToTab && { paddingBottom: spacing.xl + 96 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={[styles.purchaseCard, { marginBottom: spacing.md }]}>
              <Text style={styles.modalPageTitle}>Offrir - Carte Sélection UP</Text>
              <View style={styles.giftSummary}>
                {partnerLogoUri ? (
                  <Image source={{ uri: partnerLogoUri }} style={styles.summaryLogo} resizeMode="contain" />
                ) : (
                  <View style={styles.summaryLogoFallback}>
                    <Text style={styles.summaryLogoFallbackText}>{partnerName.slice(0, 2).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryPartner}>{partnerName}</Text>
                  <Text style={styles.summaryTitle}>Carte personnalisée</Text>
                  <Text style={styles.summaryPrice}>{amountValue.toFixed(2)} €</Text>
                </View>
              </View>
            </View>
            <View style={[styles.purchaseCard, { marginTop: spacing.sm }]}>
              <Text style={styles.sectionLabel}>Nom du bénéficiaire</Text>
              <Text style={[styles.input, { color: colors.textMain }]}>{beneficiaryName || '—'}</Text>
              {/* Vidéo personnalisée : notification = dans l'app ; e-mail = lien dans le PDF */}
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.sectionLabel}>Vidéo personnalisée (optionnel)</Text>
                <View style={styles.sendModeRow}>
                  {onRecordVideo && (
                    <TouchableOpacity
                      style={[styles.sendModeCard, videoHasVideo && styles.sendModeCardActive]}
                      onPress={onRecordVideo}
                      activeOpacity={0.8}>
                      <View style={[styles.sendModeIconWrap, videoHasVideo && styles.sendModeIconWrapActive]}>
                        <Ionicons name="videocam-outline" size={24} color={videoHasVideo ? colors.white : colors.primaryPurple} />
                      </View>
                      <Text style={[styles.sendModeTitle, videoHasVideo && styles.sendModeTitleActive]}>
                        {videoHasVideo ? 'Vidéo enregistrée' : 'Filmer'}
                      </Text>
                      {videoDurationSeconds != null && (
                        <Text style={styles.sendModeSubtitle}>{videoDurationSeconds}s</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {onPickVideo && (
                    <TouchableOpacity
                      style={[styles.sendModeCard, videoHasVideo && styles.sendModeCardActive]}
                      onPress={onPickVideo}
                      activeOpacity={0.8}>
                      <View style={[styles.sendModeIconWrap, videoHasVideo && styles.sendModeIconWrapActive]}>
                        <Ionicons name="images-outline" size={24} color={videoHasVideo ? colors.white : colors.primaryPurple} />
                      </View>
                      <Text style={[styles.sendModeTitle, videoHasVideo && styles.sendModeTitleActive]}>Galerie</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {videoHasVideo && onVideoDurationOptionChange && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Durée max.</Text>
                    <View style={styles.sendModeRow}>
                      <TouchableOpacity
                        style={[styles.sendModeCard, videoDurationOption === 'default' && styles.sendModeCardActive]}
                        onPress={() => onVideoDurationOptionChange('default')}
                        activeOpacity={0.8}>
                        <Text style={[styles.sendModeTitle, videoDurationOption === 'default' && styles.sendModeTitleActive]}>Standard</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sendModeCard, videoDurationOption === 'extended' && styles.sendModeCardActive]}
                        onPress={() => onVideoDurationOptionChange('extended')}
                        activeOpacity={0.8}>
                        <Text style={[styles.sendModeTitle, videoDurationOption === 'extended' && styles.sendModeTitleActive]}>Étendue</Text>
                      </TouchableOpacity>
                    </View>
                    {onVideoConsentChange && (
                      <TouchableOpacity
                        style={{ marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                        onPress={() => onVideoConsentChange(!videoConsentAccepted)}
                        activeOpacity={0.8}>
                        <Ionicons
                          name={videoConsentAccepted ? 'checkbox-outline' : 'square-outline'}
                          size={20}
                          color={videoConsentAccepted ? colors.primaryPurple : colors.textSecondary}
                        />
                        <Text style={[styles.sectionLabel, { flex: 1 }]}>J'accepte le stockage de cette vidéo pour ce cadeau.</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
              <Text style={styles.sectionLabel}>Mode d'envoi</Text>
              <View style={styles.sendModeRow}>
                <TouchableOpacity
                  style={[styles.sendModeCard, sendMode === 'email' && styles.sendModeCardActive]}
                  onPress={() => onSendModeChange('email')}
                  activeOpacity={0.8}>
                  <View style={[styles.sendModeIconWrap, sendMode === 'email' && styles.sendModeIconWrapActive]}>
                    <Ionicons name="mail-outline" size={24} color={sendMode === 'email' ? colors.white : colors.primaryPurple} />
                  </View>
                  <Text style={[styles.sendModeTitle, sendMode === 'email' && styles.sendModeTitleActive]}>E-mail</Text>
                  <Text style={styles.sendModeSubtitle}>Envoi par courriel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendModeCard, sendMode === 'notification' && styles.sendModeCardActive]}
                  onPress={() => onSendModeChange('notification')}
                  activeOpacity={0.8}>
                  <View style={[styles.sendModeIconWrap, sendMode === 'notification' && styles.sendModeIconWrapActive]}>
                    <Ionicons name="notifications-outline" size={24} color={sendMode === 'notification' ? colors.white : colors.primaryPurple} />
                  </View>
                  <Text style={[styles.sendModeTitle, sendMode === 'notification' && styles.sendModeTitleActive]}>Notification KashUP</Text>
                  <Text style={styles.sendModeSubtitle}>Alerte dans l'app</Text>
                </TouchableOpacity>
              </View>
              {onPaymentMethodChange != null ? (
                <>
                  <Text style={styles.sectionLabel}>Mode de paiement</Text>
                  <View style={styles.sendModeRow}>
                    <TouchableOpacity
                      style={[styles.sendModeCard, paymentMethod === 'cashback' && styles.sendModeCardActive]}
                      onPress={() => onPaymentMethodChange('cashback')}
                      activeOpacity={0.8}>
                      <View style={[styles.sendModeIconWrap, paymentMethod === 'cashback' && styles.sendModeIconWrapActive]}>
                        <Ionicons name="wallet-outline" size={24} color={paymentMethod === 'cashback' ? colors.white : colors.primaryPurple} />
                      </View>
                      <Text style={[styles.sendModeTitle, paymentMethod === 'cashback' && styles.sendModeTitleActive]}>Cashback</Text>
                      <Text style={styles.sendModeSubtitle}>Solde KashUP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendModeCard, paymentMethod === 'card' && styles.sendModeCardActive]}
                      onPress={() => onPaymentMethodChange('card')}
                      activeOpacity={0.8}>
                      <View style={[styles.sendModeIconWrap, paymentMethod === 'card' && styles.sendModeIconWrapActive]}>
                        <Ionicons name="card-outline" size={24} color={paymentMethod === 'card' ? colors.white : colors.primaryPurple} />
                      </View>
                      <Text style={[styles.sendModeTitle, paymentMethod === 'card' && styles.sendModeTitleActive]}>Carte</Text>
                      <Text style={styles.sendModeSubtitle}>Apple Pay / Google Pay</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
              <Text style={styles.sectionLabel}>
                {sendMode === 'email' ? 'Adresse e-mail' : 'E-mail du destinataire (compte KashUP)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={sendMode === 'email' ? 'exemple@mail.com' : 'exemple@mail.com'}
                value={recipient}
                onChangeText={onRecipientChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {sendMode === 'email' ? (
                <>
                  <Text style={styles.sectionLabel}>Exporter la carte</Text>
                  <Text style={[styles.purchaseDescription, { marginBottom: spacing.sm }]}>
                    La carte sera enregistrée et débitée, puis vous pourrez télécharger le PDF ou l'envoyer par e-mail.
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryButton, sending && styles.primaryButtonDisabled]}
                    onPress={onConfirmEmail}
                    disabled={sending}>
                    {sending ? (
                      <View style={[styles.primaryGradient, styles.exportPdfButtonContent, { backgroundColor: colors.primary }]}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={[styles.primaryText, styles.primaryButtonTextSmall]}>Envoi et génération du PDF…</Text>
                      </View>
                    ) : (
                      <LinearGradient
                        colors={[...CARD_GRADIENT_COLORS]}
                        locations={[...CARD_GRADIENT_LOCATIONS]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.primaryGradient}>
                        <View style={styles.exportPdfButtonContent}>
                          <Ionicons name="document-attach-outline" size={20} color="#fff" />
                          <Text style={[styles.primaryText, styles.primaryButtonTextSmall]}>Télécharger / Envoyer en PDF</Text>
                        </View>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}
              {sendMode === 'notification' ? (
                <TouchableOpacity
                  style={[styles.primaryButton, sending && styles.primaryButtonDisabled]}
                  onPress={onConfirmNotification}
                  disabled={sending}>
                  {sending ? (
                    <View style={[styles.primaryGradient, styles.exportPdfButtonContent, { backgroundColor: colors.primary }]}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.primaryText}>Envoi…</Text>
                    </View>
                  ) : (
                    <LinearGradient
                      colors={[...CARD_GRADIENT_COLORS]}
                      locations={[...CARD_GRADIENT_LOCATIONS]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryGradient}>
                      <Text style={styles.primaryText}>Confirmer et offrir</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {onNavigateToTab ? (
          <View style={[styles.modalTabBarContainer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} pointerEvents="box-none">
            <View style={styles.modalTabBarPill}>
              <View style={styles.modalTabBarPillInner}>
                {MODAL_TABS.map((tab) => {
                  const isFocused = tab.name === "Bons d'achat";
                  return (
                    <TouchableOpacity
                      key={tab.name}
                      style={styles.modalTabBarTab}
                      onPress={() => onNavigateToTab(tab.name)}
                      activeOpacity={0.7}>
                      <View style={[styles.modalTabBarTabContent, isFocused && styles.modalTabBarTabContentActive]}>
                        <Ionicons
                          name={tab.icon as any}
                          size={24}
                          color={isFocused ? '#047857' : '#3C3C3C'}
                        />
                        <Text
                          style={[styles.modalTabBarTabLabel, isFocused && styles.modalTabBarTabLabelActive]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          textAlign="center">
                          {tab.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

type PredefinedGiftCardProps = {
  gift: GiftCardOffer;
  onOffer: () => void;
};

function PredefinedGiftCard({ gift, onOffer }: PredefinedGiftCardProps) {
  const partnerName = gift.partner?.name ?? 'KashUP';
  const partnerLogoUri = gift.partner?.logoUrl ? normalizeImageUrl(gift.partner.logoUrl) : null;
  return (
    <View style={styles.predefinedCard}>
      <View style={styles.predefinedLogoWrapper}>
        {partnerLogoUri ? (
          <Image source={{ uri: partnerLogoUri }} style={styles.predefinedLogo} resizeMode="contain" />
        ) : (
          <Text style={styles.predefinedLogoFallback}>{partnerName.slice(0, 2).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.predefinedInfos}>
        <Text style={styles.predefinedPartner}>{partnerName}</Text>
        <Text style={styles.predefinedTitle}>{gift.title}</Text>
        <Text style={styles.predefinedDescription}>{gift.description}</Text>
        <Text style={styles.predefinedPrice}>{gift.price.toFixed(2)} €</Text>
        <View style={styles.cashbackRow}>
          <View style={styles.cashbackItem}>
            <Ionicons
              name="pricetag"
              size={12}
              color={(gift.cashbackRate != null && gift.cashbackRate !== '' && Number(gift.cashbackRate) >= 0) ? '#05A357' : colors.textSecondary}
            />
            <Text style={[
              styles.cashbackRate,
              (gift.cashbackRate == null || gift.cashbackRate === '' || Number(gift.cashbackRate) < 0) && styles.cashbackRateEmpty,
            ]}>
              {(gift.cashbackRate != null && gift.cashbackRate !== '' && Number(gift.cashbackRate) >= 0)
                ? `${Number(gift.cashbackRate)}%`
                : '—'}
            </Text>
            <Text style={styles.cashbackItemLabel}>
              {(gift.cashbackRate != null && gift.cashbackRate !== '' && Number(gift.cashbackRate) >= 0)
                ? "À l'achat"
                : 'Non renseigné'}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.predefinedButtonWrap} onPress={onOffer}>
        <LinearGradient
          colors={[...CARD_GRADIENT_COLORS]}
          locations={[...CARD_GRADIENT_LOCATIONS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.predefinedButton}>
          <Text style={styles.predefinedButtonText}>Offrir</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const formatPointsModal = (v: number) => `${v.toLocaleString('fr-FR')} pts`;
const formatCashbackModal = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PredefinedGiftModalProps = {
  visible: boolean;
  onClose: () => void;
  gift: GiftCardOffer | null;
  sendMode: 'email' | 'notification';
  onSendModeChange: (mode: 'email' | 'notification') => void;
  recipient: string;
  onRecipientChange: (value: string) => void;
  beneficiaryName: string;
  onBeneficiaryNameChange: (value: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  selectedMacaron: string;
  onMacaronChange: (value: string) => void;
  selectedMacaronLibre: string;
  onMacaronLibreChange: (value: string) => void;
  selectedMacaronColorId: string;
  onMacaronColorChange: (value: string) => void;
  selectedFontId: string;
  onFontChange: (value: string) => void;
  selectedTextColorId: string;
  onTextColorChange: (value: string) => void;
  selectedBackgroundColorId: string;
  onBackgroundColorChange: (value: string) => void;
  onConfirm: () => void;
  videoHasVideo?: boolean;
  videoDurationSeconds?: number | null;
  videoDurationOption?: 'default' | 'extended';
  onVideoDurationOptionChange?: (v: 'default' | 'extended') => void;
  videoConsentAccepted?: boolean;
  onVideoConsentChange?: (v: boolean) => void;
  onPickVideo?: () => void;
  onRecordVideo?: () => void;
  onClearVideo?: () => void;
  /** Envoi en cours (mode notification) */
  sending?: boolean;
  /** Mode de paiement : cashback ou carte (Apple Pay / Google Pay) */
  paymentMethod?: 'cashback' | 'card';
  onPaymentMethodChange?: (method: 'cashback' | 'card') => void;
  unreadCount?: number;
  cashback?: number | null;
  points?: number | null;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  /** Clic sur un onglet du bandeau bas : ferme le modal et navigue vers l’onglet */
  onNavigateToTab?: (tab: keyof BottomTabParamList) => void;
};

/** Onglets du bandeau bas (même ordre et libellés que BottomTabs) */
const MODAL_TABS: { name: keyof BottomTabParamList; title: string; icon: string }[] = [
  { name: 'Accueil', title: 'Accueil', icon: 'home-outline' },
  { name: 'Partenaires', title: 'Partenaires', icon: 'storefront-outline' },
  { name: 'Cagnotte', title: 'Cagnotte', icon: 'wallet-outline' },
  { name: "Bons d'achat", title: 'Cartes UP', icon: 'gift-outline' },
  { name: 'Rewards', title: 'Rewards', icon: 'star-outline' },
];

function PredefinedGiftModal({
  visible,
  onClose,
  gift,
  sendMode,
  onSendModeChange,
  recipient,
  onRecipientChange,
  beneficiaryName,
  onBeneficiaryNameChange,
  message,
  onMessageChange,
  selectedMacaron,
  onMacaronChange,
  selectedMacaronLibre,
  onMacaronLibreChange,
  selectedMacaronColorId,
  onMacaronColorChange,
  selectedFontId,
  onFontChange,
  selectedTextColorId,
  onTextColorChange,
  selectedBackgroundColorId,
  onBackgroundColorChange,
  onConfirm,
  videoHasVideo = false,
  videoDurationSeconds = null,
  videoDurationOption = 'default',
  onVideoDurationOptionChange,
  videoConsentAccepted = false,
  onVideoConsentChange,
  onPickVideo,
  onRecordVideo,
  onClearVideo,
  sending = false,
  paymentMethod = 'cashback',
  onPaymentMethodChange,
  unreadCount = 0,
  cashback = null,
  points = null,
  onNotificationPress,
  onProfilePress,
  onNavigateToTab,
}: PredefinedGiftModalProps) {
  const [macaronDropdownOpen, setMacaronDropdownOpen] = useState(false);
  const [showMacaronPalette, setShowMacaronPalette] = useState(false);
  const [showBackgroundPalette, setShowBackgroundPalette] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const insets = useSafeAreaInsets();
  if (!gift) return null;

  const partnerLogoUri = gift.partner?.logoUrl ? normalizeImageUrl(gift.partner.logoUrl) : null;
  const rawCardImage = (gift as { imageUrl?: string | null; image_url?: string | null }).imageUrl
    ?? (gift as { image_url?: string | null }).image_url;
  const cardImageUri =
    (typeof rawCardImage === 'string' && rawCardImage.trim() !== '')
      ? normalizeImageUrl(rawCardImage.trim())
      : null;
  const macaronLabel = selectedMacaron || (selectedMacaronLibre.trim() ? `Pastille libre : ${selectedMacaronLibre.trim()}` : '') || 'Choisir un macaron';
  const macaronColor = MACARON_PALETTE_GRID.find((c) => c.id === selectedMacaronColorId)?.value ?? colors.primary;
  const predefinedTextColor = TEXT_COLORS_CARTE.find((c) => c.id === selectedTextColorId)?.value ?? '#1a1a2e';
  const predefinedBgColor = BACKGROUND_PALETTE_GRID.find((c) => c.id === selectedBackgroundColorId)?.value ?? '#ffffff';
  const predefinedFont = FONT_OPTIONS_CARTE.find((f) => f.id === selectedFontId);

  const escapeHtml = (s: string) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const buildCardHtml = () => {
    const title = escapeHtml(gift.title ?? '');
    const option = escapeHtml(gift.offre ?? '');
    const msg = escapeHtml(message.trim());
    const macaronText = escapeHtml(selectedMacaron || selectedMacaronLibre.trim() || '');
    const fontFamily = predefinedFont?.fontFamily ?? 'system-ui';
    const fontStyle = predefinedFont?.fontStyle ?? 'normal';
    const fontWeight = predefinedFont?.fontWeight ?? '600';
    const macaronBgColor =
      typeof macaronColor === 'string' && macaronColor.trim().startsWith('#')
        ? macaronColor.trim()
        : '#047857';
    const imageSection = cardImageUri
      ? `<img src="${escapeHtml(cardImageUri)}" alt="" style="width:100%;height:100px;object-fit:cover;display:block;" />`
      : '<div style="width:100%;height:100px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;">Image définie par l\'admin</div>';
    const logoSection = partnerLogoUri
      ? `<img src="${escapeHtml(partnerLogoUri)}" alt="" style="width:100%;height:100%;object-fit:contain;" />`
      : '';
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
  *{box-sizing:border-box;} body{margin:0;padding:20px;font-family:${fontFamily},system-ui,sans-serif;}
  .card{width:320px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
  .card-img-wrap{width:100%;height:100px;background:#e2e8f0;position:relative;}
  .card-title-tab{position:absolute;top:8px;left:8px;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,0.5);color:#FFFFFF;font-size:12px;font-weight:600;max-width:80%;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .card-body{padding:12px;min-height:80px;}
  .card-option{font-size:9px;font-weight:600;margin-top:4px;opacity:0.9;}
  .card-msg{font-size:13px;line-height:18px;margin-top:8px;}
  .card-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:8px;}
  .macaron{display:inline-block;padding:3px 7px;border-radius:9px;font-size:8px;font-weight:700;color:#fff;background-color:${macaronBgColor};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .logo-wrap{width:36px;height:36px;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;background:#fff;}
</style></head><body>
  <div class="card" style="background:${predefinedBgColor}">
    <div class="card-img-wrap">${imageSection}
      <div class="card-title-tab" style="font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${title}</div>
    </div>
    <div class="card-body">
      ${option ? `<div class="card-option" style="color:${predefinedTextColor};font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${option}</div>` : ''}
      ${msg ? `<div class="card-msg" style="color:${predefinedTextColor};font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${msg}</div>` : ''}
      <div class="card-bottom">
        ${macaronText ? `<div class="macaron" style="font-family:${fontFamily};font-style:${fontStyle};font-weight:${fontWeight}">${macaronText}</div>` : '<div></div>'}
        ${logoSection ? `<div class="logo-wrap">${logoSection}</div>` : '<div></div>'}
      </div>
    </div>
  </div>
</body></html>`;
  };

  const handleExportPdf = async () => {
    try {
      setPdfExporting(true);
      const html = buildCardHtml();
      const { uri } = await Print.printToFileAsync({
        html,
        width: 340,
        height: 380,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager la carte (PDF)',
        });
      } else {
        Alert.alert(
          'Export PDF',
          'Le partage n\'est pas disponible sur cet appareil. Le PDF a été généré.',
          [{ text: 'OK' }],
        );
      }
    } catch (err) {
      console.error('[GiftCards] Export PDF:', err);
      Alert.alert('Erreur', 'Impossible de générer le PDF. Réessayez plus tard.');
    } finally {
      setPdfExporting(false);
    }
  };

  const bandeauPaddingTop = Math.max(insets.top, 8);
  const pointsValue = points ?? 0;
  const cashbackValue = cashback ?? 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea} edges={['left', 'right', 'bottom']}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.modalBandeauRewards, { paddingTop: bandeauPaddingTop }]}>
          <View style={styles.modalBandeauRewardsInner}>
            <TouchableOpacity
              style={styles.modalBandeauIcon}
              onPress={onNotificationPress}
              activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={24} color={colors.textMain} />
              {unreadCount > 0 && (
                <View style={styles.modalBandeauBadge}>
                  <Text style={styles.modalBandeauBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.modalBandeauPillsRow}>
              <LinearGradient
                colors={['#059669', colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalBandeauPill}>
                <Ionicons name="star" size={16} color="#FFF" />
                <Text style={styles.modalBandeauPillText}>{formatPointsModal(pointsValue)}</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#059669', colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalBandeauPill}>
                <Text style={styles.modalBandeauPillSymbol}>€</Text>
                <Text style={styles.modalBandeauPillText}>{formatCashbackModal(cashbackValue)}</Text>
              </LinearGradient>
            </View>
            <TouchableOpacity
              style={styles.modalBandeauIcon}
              onPress={onProfilePress}
              activeOpacity={0.7}>
              <Ionicons name="person-circle-outline" size={24} color={colors.textMain} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBandeauClose} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.textMain} />
            </TouchableOpacity>
          </View>
        </View>
        <KeyboardAvoidingView
          style={[styles.offerModalContentWrap, { flex: 1 }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ScrollView
            style={styles.offerModalScrollView}
            contentContainerStyle={[
              styles.offerModalScroll,
              { paddingHorizontal: spacing.lg },
              onNavigateToTab && { paddingBottom: spacing.xl + 96 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={[1]}>
          <View style={[styles.purchaseCard, { marginBottom: spacing.md }]}>
            <Text style={styles.modalPageTitle}>Offrir "{gift.title}”</Text>
          <View style={styles.giftSummary}>
            {partnerLogoUri ? (
              <Image source={{ uri: partnerLogoUri }} style={styles.summaryLogo} resizeMode="contain" />
            ) : (
              <View style={styles.summaryLogoFallback}>
                <Text style={styles.summaryLogoFallbackText}>{(gift.partner?.name ?? 'KashUP').slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryPartner}>{gift.partner?.name ?? 'KashUP'}</Text>
              <Text style={styles.summaryTitle}>{gift.title}</Text>
              <Text style={styles.summaryPrice}>{gift.price.toFixed(2)} €</Text>
            </View>
          </View>
          </View>
          <View style={[styles.stickyCardBlock, { paddingTop: 4 }]}>
            <Text style={styles.sectionLabel}>Aperçu de la carte</Text>
            <View style={[styles.carteTestPreview, styles.carteTestPreviewModal, { backgroundColor: predefinedBgColor }]}>
              <View style={styles.carteTestImageWrap}>
                {cardImageUri ? (
                  <Image source={{ uri: cardImageUri }} style={styles.carteTestImage} resizeMode="cover" />
                ) : (
                  <View style={styles.carteTestImagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                    <Text style={styles.carteTestImagePlaceholderText}>Image définie par l'admin</Text>
                  </View>
                )}
                <View style={styles.carteTestTitleTab}>
                  <Text
                    style={[
                      styles.carteTestTitleTabText,
                      predefinedFont && {
                        fontFamily: predefinedFont.fontFamily,
                        fontStyle: predefinedFont.fontStyle,
                        fontWeight: predefinedFont.fontWeight,
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}>
                    {gift.title}
                  </Text>
                </View>
              </View>
              <View style={styles.carteTestBodyPredef}>
                <View style={styles.carteTestBodyPredefContent}>
                  {gift.offre ? (
                    <Text
                      style={[
                        styles.carteTestCardOption,
                        {
                          color: predefinedTextColor,
                          fontFamily: predefinedFont?.fontFamily,
                          fontStyle: predefinedFont?.fontStyle,
                          fontWeight: predefinedFont?.fontWeight,
                        },
                      ]}
                      numberOfLines={2}>
                      {gift.offre}
                    </Text>
                  ) : null}
                  {message.trim() ? (
                    <Text
                      style={[
                        styles.carteTestCardMessage,
                        {
                          color: predefinedTextColor,
                          fontFamily: predefinedFont?.fontFamily,
                          fontStyle: predefinedFont?.fontStyle,
                          fontWeight: predefinedFont?.fontWeight,
                        },
                      ]}
                      numberOfLines={3}>
                      {message.trim()}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.carteTestBodyPredefBottom}>
                  {(selectedMacaron || selectedMacaronLibre.trim()) ? (
                    <View style={[styles.carteTestMacaronSmall, { backgroundColor: macaronColor || '#047857' }]}>
                      <Text
                        style={[
                          styles.carteTestMacaronTextSmall,
                          {
                            fontFamily: predefinedFont?.fontFamily,
                            fontStyle: predefinedFont?.fontStyle,
                            fontWeight: predefinedFont?.fontWeight,
                          },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}>
                        {selectedMacaron || selectedMacaronLibre.trim() || 'Votre texte'}
                      </Text>
                    </View>
                  ) : null}
                  {partnerLogoUri ? (
                    <View style={styles.carteTestLogoWrapSmall}>
                      <Image source={{ uri: partnerLogoUri }} style={styles.carteTestLogoSmall} resizeMode="contain" />
                    </View>
                  ) : null}
              </View>
            </View>
          </View>
          </View>
          <View style={[styles.purchaseCard, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionLabel}>Macaron</Text>
          <View style={styles.macaronDropdownWrap}>
            <TouchableOpacity
              style={[styles.macaronDropdownTrigger, macaronDropdownOpen && styles.macaronDropdownTriggerOpen]}
              onPress={() => setMacaronDropdownOpen((o) => !o)}
              activeOpacity={0.7}>
              <Text style={styles.macaronDropdownTriggerText} numberOfLines={1}>
                {macaronLabel}
              </Text>
              <Ionicons name={macaronDropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {macaronDropdownOpen ? (
              <View style={styles.macaronSelect}>
                {MACARON_PRESETS.map((label) => {
                  const active = selectedMacaron === label;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[styles.macaronOption, active && styles.macaronOptionActive]}
                      onPress={() => {
                        onMacaronChange(active ? '' : label);
                        if (!active) onMacaronLibreChange('');
                        setMacaronDropdownOpen(false);
                      }}>
                      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? colors.primaryPurple : colors.textSecondary} />
                      <Text style={[styles.macaronOptionText, active && styles.macaronOptionTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.macaronOption, styles.macaronOptionLast, selectedMacaron === '' && styles.macaronOptionActive]}
                  onPress={() => { onMacaronChange(''); setMacaronDropdownOpen(false); }}>
                  <Ionicons name={selectedMacaron === '' ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selectedMacaron === '' ? colors.primaryPurple : colors.textSecondary} />
                  <Text style={[styles.macaronOptionText, selectedMacaron === '' && styles.macaronOptionTextActive]}>Pastille libre</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          {selectedMacaron === '' && (
            <View style={styles.macaronLibreRow}>
              <Text style={styles.configMetaText}>Texte du macaron (pastille libre)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex : Merci pour tout, Bonne retraite..."
                value={selectedMacaronLibre}
                onChangeText={onMacaronLibreChange}
              />
            </View>
          )}
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Message</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Un mot personnalisé pour accompagner le cadeau"
            value={message}
            onChangeText={onMessageChange}
            multiline
          />
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Style de la carte</Text>
          <Text style={styles.configMetaText}>Police du texte</Text>
          <View style={styles.fontRow}>
            {FONT_OPTIONS_CARTE.map((f) => {
              const active = selectedFontId === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => onFontChange(f.id)}
                  style={[styles.fontChip, active && styles.fontChipActive]}>
                  <Text style={[styles.fontChipLabel, active && styles.fontChipLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.colorBlock}>
            <Text style={styles.colorBlockLabel}>Texte</Text>
            <View style={styles.colorSwatchRow}>
              {TEXT_COLORS_CARTE.map((c) => {
                const active = selectedTextColorId === c.id;
                const swatchColor = c.value;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => onTextColorChange(c.id)}
                    style={[styles.colorSwatch, { backgroundColor: swatchColor }, active && styles.colorSwatchActive]}
                  />
                );
              })}
            </View>
            <Text style={styles.colorBlockLabel}>Macaron</Text>
            <View style={styles.colorPaletteRow}>
              <View style={[styles.colorSwatchGridItem, { backgroundColor: MACARON_PALETTE_GRID.find((x) => x.id === selectedMacaronColorId)?.value ?? colors.primary }]} />
              <TouchableOpacity style={styles.colorPaletteToggle} onPress={() => setShowMacaronPalette((v) => !v)}>
                <Text style={styles.colorPaletteToggleText}>{showMacaronPalette ? 'Masquer les couleurs' : 'Choisir une couleur'}</Text>
                <Ionicons name={showMacaronPalette ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primaryPurple} />
              </TouchableOpacity>
            </View>
            {showMacaronPalette && (
              <View style={styles.colorSwatchGrid}>
                {MACARON_PALETTE_GRID.map((c, i) => {
                  const active = selectedMacaronColorId === c.id;
                  return (
                    <TouchableOpacity
                      key={`macaron-p-${i}-${c.id}`}
                      onPress={() => onMacaronColorChange(c.id)}
                      style={[styles.colorSwatchGridItem, { backgroundColor: c.value }, active && styles.colorSwatchGridItemActive]}
                    >
                      {active ? (
                        <View style={styles.colorSwatchCheckWrap}>
                          <Ionicons name="checkmark" size={14} color="#fff" style={styles.colorSwatchCheck} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <Text style={styles.colorBlockLabel}>Fond</Text>
            <View style={styles.colorPaletteRow}>
              <View style={[styles.colorSwatchGridItem, { backgroundColor: BACKGROUND_PALETTE_GRID.find((x) => x.id === selectedBackgroundColorId)?.value ?? '#ffffff' }]} />
              <TouchableOpacity style={styles.colorPaletteToggle} onPress={() => setShowBackgroundPalette((v) => !v)}>
                <Text style={styles.colorPaletteToggleText}>{showBackgroundPalette ? 'Masquer les couleurs' : 'Choisir une couleur'}</Text>
                <Ionicons name={showBackgroundPalette ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primaryPurple} />
              </TouchableOpacity>
            </View>
            {showBackgroundPalette && (
              <View style={styles.colorSwatchGrid}>
                {BACKGROUND_PALETTE_GRID.map((c, i) => {
                  const active = selectedBackgroundColorId === c.id;
                  return (
                    <TouchableOpacity
                      key={`bg-p-${i}-${c.id}`}
                      onPress={() => onBackgroundColorChange(c.id)}
                      style={[styles.colorSwatchGridItem, { backgroundColor: c.value }, active && styles.colorSwatchGridItemActive]}
                    >
                      {active ? (
                        <View style={styles.colorSwatchCheckWrap}>
                          <Ionicons name="checkmark" size={14} color="#333" style={styles.colorSwatchCheck} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          <Text style={styles.sectionLabel}>Nom du bénéficiaire</Text>
          <TextInput
            style={styles.input}
            placeholder="Prénom Nom"
            value={beneficiaryName}
            onChangeText={onBeneficiaryNameChange}
          />
          {sendMode === 'notification' && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={styles.sectionLabel}>Vidéo personnalisée (optionnel)</Text>
              <View style={styles.sendModeRow}>
                {onRecordVideo && (
                  <TouchableOpacity
                    style={[styles.sendModeCard, videoHasVideo && styles.sendModeCardActive]}
                    onPress={onRecordVideo}
                    activeOpacity={0.8}>
                    <View style={[styles.sendModeIconWrap, videoHasVideo && styles.sendModeIconWrapActive]}>
                      <Ionicons name="videocam-outline" size={24} color={videoHasVideo ? colors.white : colors.primaryPurple} />
                    </View>
                    <Text style={[styles.sendModeTitle, videoHasVideo && styles.sendModeTitleActive]}>
                      {videoHasVideo ? 'Vidéo enregistrée' : 'Filmer'}
                    </Text>
                    {videoDurationSeconds != null && (
                      <Text style={styles.sendModeSubtitle}>{videoDurationSeconds}s</Text>
                    )}
                  </TouchableOpacity>
                )}
                {onPickVideo && (
                  <TouchableOpacity
                    style={[styles.sendModeCard, videoHasVideo && styles.sendModeCardActive]}
                    onPress={onPickVideo}
                    activeOpacity={0.8}>
                    <View style={[styles.sendModeIconWrap, videoHasVideo && styles.sendModeIconWrapActive]}>
                      <Ionicons name="images-outline" size={24} color={videoHasVideo ? colors.white : colors.primaryPurple} />
                    </View>
                    <Text style={[styles.sendModeTitle, videoHasVideo && styles.sendModeTitleActive]}>Galerie</Text>
                  </TouchableOpacity>
                )}
              </View>
              {videoHasVideo && onVideoDurationOptionChange && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Durée max.</Text>
                  <View style={styles.sendModeRow}>
                    <TouchableOpacity
                      style={[styles.sendModeCard, videoDurationOption === 'default' && styles.sendModeCardActive]}
                      onPress={() => onVideoDurationOptionChange('default')}
                      activeOpacity={0.8}>
                      <Text style={[styles.sendModeTitle, videoDurationOption === 'default' && styles.sendModeTitleActive]}>Standard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendModeCard, videoDurationOption === 'extended' && styles.sendModeCardActive]}
                      onPress={() => onVideoDurationOptionChange('extended')}
                      activeOpacity={0.8}>
                      <Text style={[styles.sendModeTitle, videoDurationOption === 'extended' && styles.sendModeTitleActive]}>Étendue</Text>
                    </TouchableOpacity>
                  </View>
                  {onVideoConsentChange && (
                    <TouchableOpacity
                      style={{ marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                      onPress={() => onVideoConsentChange(!videoConsentAccepted)}
                      activeOpacity={0.8}>
                      <Ionicons
                        name={videoConsentAccepted ? 'checkbox-outline' : 'square-outline'}
                        size={20}
                        color={videoConsentAccepted ? colors.primaryPurple : colors.textSecondary}
                      />
                      <Text style={[styles.sectionLabel, { flex: 1 }]}>J'accepte le stockage de cette vidéo pour ce cadeau.</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
          <Text style={styles.sectionLabel}>Mode d'envoi</Text>
          <View style={styles.sendModeRow}>
            <TouchableOpacity
              style={[styles.sendModeCard, sendMode === 'email' && styles.sendModeCardActive]}
              onPress={() => onSendModeChange('email')}
              activeOpacity={0.8}>
              <View style={[styles.sendModeIconWrap, sendMode === 'email' && styles.sendModeIconWrapActive]}>
                <Ionicons name="mail-outline" size={24} color={sendMode === 'email' ? colors.white : colors.primaryPurple} />
              </View>
              <Text style={[styles.sendModeTitle, sendMode === 'email' && styles.sendModeTitleActive]}>E-mail</Text>
              <Text style={styles.sendModeSubtitle}>Envoi par courriel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendModeCard, sendMode === 'notification' && styles.sendModeCardActive]}
              onPress={() => onSendModeChange('notification')}
              activeOpacity={0.8}>
              <View style={[styles.sendModeIconWrap, sendMode === 'notification' && styles.sendModeIconWrapActive]}>
                <Ionicons name="notifications-outline" size={24} color={sendMode === 'notification' ? colors.white : colors.primaryPurple} />
              </View>
              <Text style={[styles.sendModeTitle, sendMode === 'notification' && styles.sendModeTitleActive]}>Notification KashUP</Text>
              <Text style={styles.sendModeSubtitle}>Alerte dans l'app</Text>
            </TouchableOpacity>
          </View>
          {onPaymentMethodChange != null ? (
            <>
              <Text style={styles.sectionLabel}>Mode de paiement</Text>
              <View style={styles.sendModeRow}>
                <TouchableOpacity
                  style={[styles.sendModeCard, paymentMethod === 'cashback' && styles.sendModeCardActive]}
                  onPress={() => onPaymentMethodChange('cashback')}
                  activeOpacity={0.8}>
                  <View style={[styles.sendModeIconWrap, paymentMethod === 'cashback' && styles.sendModeIconWrapActive]}>
                    <Ionicons name="wallet-outline" size={24} color={paymentMethod === 'cashback' ? colors.white : colors.primaryPurple} />
                  </View>
                  <Text style={[styles.sendModeTitle, paymentMethod === 'cashback' && styles.sendModeTitleActive]}>Cashback</Text>
                  <Text style={styles.sendModeSubtitle}>Solde KashUP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendModeCard, paymentMethod === 'card' && styles.sendModeCardActive]}
                  onPress={() => onPaymentMethodChange('card')}
                  activeOpacity={0.8}>
                  <View style={[styles.sendModeIconWrap, paymentMethod === 'card' && styles.sendModeIconWrapActive]}>
                    <Ionicons name="card-outline" size={24} color={paymentMethod === 'card' ? colors.white : colors.primaryPurple} />
                  </View>
                  <Text style={[styles.sendModeTitle, paymentMethod === 'card' && styles.sendModeTitleActive]}>Carte</Text>
                  <Text style={styles.sendModeSubtitle}>Apple Pay / Google Pay</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
          <Text style={styles.sectionLabel}>
            {sendMode === 'email' ? 'Adresse e-mail' : 'E-mail du destinataire (compte KashUP)'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={sendMode === 'email' ? 'exemple@mail.com' : 'exemple@mail.com'}
            value={recipient}
            onChangeText={onRecipientChange}
          />
          {sendMode === 'email' ? (
            <>
              <Text style={styles.sectionLabel}>Exporter la carte</Text>
              <Text style={[styles.purchaseDescription, { marginBottom: spacing.sm }]}>
                Téléchargez la carte en PDF ou envoyez-la par e-mail.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, pdfExporting && styles.primaryButtonDisabled]}
                onPress={handleExportPdf}
                disabled={pdfExporting}>
                {pdfExporting ? (
                  <View style={[styles.primaryGradient, styles.exportPdfButtonContent, { backgroundColor: colors.primary }]}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[styles.primaryText, styles.primaryButtonTextSmall]}>Génération du PDF…</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={[...CARD_GRADIENT_COLORS]}
                    locations={[...CARD_GRADIENT_LOCATIONS]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.primaryGradient}>
                    <View style={styles.exportPdfButtonContent}>
                      <Ionicons name="document-attach-outline" size={20} color="#fff" />
                      <Text style={[styles.primaryText, styles.primaryButtonTextSmall]}>Télécharger / Envoyer en PDF</Text>
                    </View>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </>
          ) : null}
          {sendMode === 'notification' ? (
            <TouchableOpacity
              style={[styles.primaryButton, sending && styles.primaryButtonDisabled]}
              onPress={onConfirm}
              disabled={sending}>
              {sending ? (
                <View style={[styles.primaryGradient, styles.exportPdfButtonContent, { backgroundColor: colors.primary }]}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryText}>Envoi…</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={[...CARD_GRADIENT_COLORS]}
                  locations={[...CARD_GRADIENT_LOCATIONS]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}>
                  <Text style={styles.primaryText}>Confirmer et offrir</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          ) : null}
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {onNavigateToTab ? (
          <View style={[styles.modalTabBarContainer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} pointerEvents="box-none">
            <View style={styles.modalTabBarPill}>
              <View style={styles.modalTabBarPillInner}>
                {MODAL_TABS.map((tab) => {
                  const isFocused = tab.name === "Bons d'achat";
                  return (
                    <TouchableOpacity
                      key={tab.name}
                      style={styles.modalTabBarTab}
                      onPress={() => onNavigateToTab(tab.name)}
                      activeOpacity={0.7}>
                      <View style={[styles.modalTabBarTabContent, isFocused && styles.modalTabBarTabContentActive]}>
                        <Ionicons
                          name={tab.icon as any}
                          size={24}
                          color={isFocused ? '#047857' : '#3C3C3C'}
                        />
                        <Text
                          style={[styles.modalTabBarTabLabel, isFocused && styles.modalTabBarTabLabelActive]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          textAlign="center">
                          {tab.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  scrollFill: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  pageHeader: {
    paddingTop: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textMain,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  moduleIntro: {
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  moduleInfoTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  moduleInfoTriggerText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
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
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  heroCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#F5F5FF',
    fontSize: 14,
    marginTop: 4,
  },
  /** Menu à onglets type pilule (comme Offres KashUP sur détail partenaire) */
  giftCardsTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  giftCardsTabButtonWrap: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  giftCardsTabButtonWrapActive: {
    overflow: 'hidden',
  },
  giftCardsTabButton: {
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftCardsTabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  giftCardsTabButtonTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    gap: spacing.md,
  },
  sectionSelectionFlex: {
    flex: 1,
    minHeight: Dimensions.get('window').height * 0.5,
  },
  selectionFormScroll: {
    flex: 1,
  },
  selectionFormScrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  voucherCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: spacing.sm,
  },
  voucherLogoWrap: {
    alignSelf: 'flex-start',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.greyLight,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
    marginBottom: spacing.xs,
  },
  voucherLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  voucherPersonalCopy: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textMain,
    lineHeight: 24,
  },
  voucherPersonalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryBlue,
  },
  voucherPersonalPartner: {
    fontWeight: '800',
    color: colors.textMain,
    textDecorationLine: 'underline',
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  voucherMetaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  voucherMetaValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryBlue,
  },
  voucherPrimaryButton: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  voucherPrimaryGradient: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  voucherPrimaryText: {
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
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: spacing.xs / 2,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  placeholderCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  placeholderSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  buyContainer: {
    gap: spacing.lg,
  },
  stickyCardBlock: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  stickyIndexPlaceholder: {
    height: 0,
    overflow: 'hidden',
  },
  internalTabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  internalTabButton: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  internalTabButtonActive: {
    backgroundColor: '#EEF2FF',
  },
  internalTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  internalTabTextActive: {
    color: colors.primaryPurple,
  },
  purchaseCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: spacing.sm,
  },
  accordionCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  configImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    backgroundColor: colors.slateBackground,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.xs,
  },
  explainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 0,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  configMeta: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  configMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  configBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  configBlockText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  macaronDropdownWrap: {
    marginBottom: spacing.sm,
  },
  macaronDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  macaronDropdownTriggerText: {
    fontSize: 15,
    color: colors.textMain,
    flex: 1,
    marginRight: 8,
  },
  macaronDropdownTriggerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  macaronSelect: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  macaronOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  macaronOptionActive: {
    backgroundColor: 'rgba(164, 69, 255, 0.08)',
  },
  macaronOptionLast: {
    borderBottomWidth: 0,
  },
  macaronOptionText: {
    fontSize: 15,
    color: colors.textMain,
    flex: 1,
  },
  macaronOptionTextActive: {
    fontWeight: '600',
    color: colors.primaryPurple,
  },
  macaronLibreRow: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  fontRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  fontChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: colors.white,
  },
  fontChipActive: {
    borderColor: colors.primaryPurple,
    backgroundColor: 'rgba(164, 69, 255, 0.08)',
  },
  fontChipLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fontChipLabelActive: {
    color: colors.primaryPurple,
    fontWeight: '600',
  },
  colorBlock: {
    backgroundColor: colors.slateBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  colorBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  colorSwatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.sm,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: colors.primaryPurple,
  },
  colorSwatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  colorSwatchGridItem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchGridItemActive: {
    borderColor: '#1a1a2e',
    borderWidth: 2,
  },
  colorSwatchCheckWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchCheck: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  colorPaletteToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  colorPaletteToggleText: {
    fontSize: 14,
    color: colors.primaryPurple,
    fontWeight: '600',
  },
  colorRow: {
    marginBottom: spacing.sm,
    flexGrow: 0,
  },
  colorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginRight: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  colorChipActive: {
    borderWidth: 2,
    borderColor: colors.primaryPurple,
  },
  colorChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  carteTestPreview: {
    marginTop: spacing.md,
    padding: 0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    minHeight: 160,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  carteTestImageWrap: {
    width: '100%',
    height: 100,
    backgroundColor: colors.slateBackground,
    position: 'relative',
  },
  carteTestTitleTab: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    maxWidth: '80%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  carteTestTitleTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  carteTestImage: {
    width: '100%',
    height: '100%',
  },
  carteTestImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.slateBackgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  carteTestImagePlaceholderText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  carteTestBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md - 4,
    gap: spacing.md,
  },
  carteTestBodyText: {
    flex: 1,
    minWidth: 0,
  },
  carteTestMacaronLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  carteTestLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.greyBorder,
    overflow: 'hidden',
    marginLeft: 'auto',
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  carteTestLogo: {
    width: '100%',
    height: '100%',
  },
  carteTestMainText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  carteTestHighlight: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  carteTestMessage: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  carteTestMacaron: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  carteTestMacaronText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  purchaseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '700',
    color: colors.primaryPurple,
  },
  purchaseDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cartesUpIntro: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  cartesUpCardsRow: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  cartesUpCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.slateBackground,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cartesUpCardImage: {
    width: '100%',
    height: 140,
    justifyContent: 'flex-end',
  },
  cartesUpCardImageInner: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  cartesUpCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  cartesUpCardContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cartesUpCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  cartesUpCardText: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  cartesUpCardFooter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  cartesUpInfoPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  cartesUpInfoPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryPurple,
  },
  wizardContainer: {
    paddingBottom: spacing.xl,
  },
  videoStepBlock: {
    marginTop: spacing.sm,
  },
  videoStepTitle: {
    fontSize: 22,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.primary,
  },
  videoStepButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  videoStepButton: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primaryPurple,
    backgroundColor: '#EEF2FF',
  },
  videoStepButtonText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryPurple,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  imagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryPurple,
    borderStyle: 'dashed',
  },
  imagePickerButtonText: {
    fontSize: 14,
    color: colors.primaryPurple,
    fontWeight: '600',
  },
  imagePickerRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  imagePickerRemoveText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  imagePickerPreviewWrap: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.slateBackground,
  },
  imagePickerPreview: {
    width: '100%',
    height: 120,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    fontSize: 15,
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  selector: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  selectorLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  selectorRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  selectorSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sendModeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
  },
  sendModeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: colors.white,
  },
  sendModeCardActive: {
    borderColor: colors.primaryPurple,
    backgroundColor: 'rgba(164, 69, 255, 0.06)',
  },
  sendModeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(164, 69, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sendModeIconWrapActive: {
    backgroundColor: colors.primaryPurple,
  },
  sendModeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
    marginBottom: 2,
    textAlign: 'center',
  },
  sendModeTitleActive: {
    color: colors.primaryPurple,
  },
  sendModeSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radioChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.xs / 2,
  },
  radioChipActive: {
    borderColor: colors.primaryPurple,
    backgroundColor: '#F3E8FF',
  },
  radioChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  radioChipTextActive: {
    color: colors.primaryPurple,
    fontWeight: '600',
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  templateCard: {
    width: 120,
    height: 70,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardActive: {
    borderColor: colors.primaryPurple,
  },
  templateGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateLabel: {
    color: colors.white,
    fontWeight: '700',
  },
  formButtons: {
    marginTop: spacing.sm,
  },
  primaryButton: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryGradient: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.white,
    fontWeight: '700',
  },
  exportPdfButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonTextSmall: {
    fontSize: 13,
  },
  offerSection: {
    gap: spacing.md,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  offerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  boxSection: {
    gap: spacing.lg,
  },
  boxCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: 'hidden',
  },
  boxImage: {
    height: 170,
    width: '100%',
  },
  boxImagePlaceholder: {
    backgroundColor: colors.slateBackground,
  },
  boxImagePlaceholderCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  boxImagePlaceholderText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  boxImageRadius: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  boxImageOverlay: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  boxBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF33',
    color: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '700',
  },
  boxTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  boxSubtitle: {
    color: colors.white,
    fontSize: 13,
  },
  boxInfo: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  boxPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  boxCashback: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  boxPartnerBlock: {
    marginTop: spacing.xs,
  },
  boxPartnerBlockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  boxPartnerList: {
    gap: spacing.sm,
  },
  boxPartnerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.slateBackgroundLight,
    borderRadius: radius.sm,
  },
  boxPartnerItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    minWidth: 6,
  },
  boxPartnerItemLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  boxPartnerItemLogo: {
    width: '100%',
    height: '100%',
  },
  boxPartnerItemContent: {
    flex: 1,
    minWidth: 0,
  },
  boxPartnerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
  },
  boxPartnerItemOffre: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  boxButtonWrap: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  boxButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  boxButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  predefinedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  predefinedLogoWrapper: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    overflow: 'hidden',
  },
  predefinedLogo: {
    width: '100%',
    height: '100%',
  },
  predefinedLogoFallback: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  predefinedInfos: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  predefinedPartner: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  predefinedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  predefinedDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  predefinedPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 0,
  },
  cashbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashbackRate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#05A357',
  },
  cashbackRateEmpty: {
    color: colors.textSecondary,
  },
  cashbackItemLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  predefinedButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  predefinedButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  modalBandeau: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    minHeight: 44,
  },
  modalBandeauInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  modalBandeauSpacer: {
    width: 36,
    height: 36,
  },
  modalBandeauTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  modalBandeauClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBandeauRewards: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    minHeight: TAB_HEADER_HEIGHT,
  },
  modalBandeauRewardsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TAB_HEADER_HEIGHT,
    paddingVertical: spacing.sm,
  },
  modalBandeauIcon: {
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
  modalBandeauBadge: {
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
  modalBandeauBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  modalBandeauPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  modalBandeauPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 84,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  modalBandeauPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalBandeauPillSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modalTabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  modalTabBarPill: {
    width: '100%',
    maxWidth: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTabBarPillInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  modalTabBarTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    minWidth: 0,
  },
  modalTabBarTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 999,
  },
  modalTabBarTabContentActive: {
    backgroundColor: 'transparent',
  },
  modalTabBarTabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4,
    color: '#3C3C3C',
    textAlign: 'center',
  },
  modalTabBarTabLabelActive: {
    color: '#047857',
  },
  offerModalContentWrap: {
    flex: 1,
  },
  modalPageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.md,
    paddingHorizontal: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMain,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: spacing.xs,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textMain,
  },
  modalCategoryRow: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modalCategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  modalCategoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: spacing.sm,
  },
  modalCategoryChipActive: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  modalCategoryChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalCategoryChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  modalDeptRow: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalDeptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
  },
  modalDeptChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    marginRight: spacing.sm,
    backgroundColor: '#F8FAFC',
  },
  modalDeptChipActive: {
    backgroundColor: colors.primaryPurple,
    borderColor: colors.primaryPurple,
  },
  modalDeptChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalDeptChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  modalList: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  modalPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalPartnerAvatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalPartnerAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryPurple,
  },
  modalPartnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  modalPartnerMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  offerModal: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  offerModalScrollView: {
    flex: 1,
  },
  offerModalScroll: {
    paddingBottom: spacing.xl,
  },
  carteTestPreviewModal: {
    maxHeight: 220,
  },
  carteTestBodyPredef: {
    minHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  carteTestBodyPredefContent: {
    flex: 1,
  },
  carteTestCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  carteTestCardOption: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.9,
  },
  carteTestCardMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  carteTestBodyPredefBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: 12,
    paddingTop: spacing.sm,
  },
  carteTestMacaronSmall: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  carteTestMacaronTextSmall: {
    fontSize: 7,
    fontWeight: '700',
    color: '#fff',
  },
  carteTestLogoWrapSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    overflow: 'hidden',
  },
  carteTestLogoSmall: {
    width: '100%',
    height: '100%',
  },
  giftSummary: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  summaryLogo: {
    width: 64,
    height: 64,
  },
  summaryLogoFallback: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLogoFallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryPurple,
  },
  summaryPartner: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  summaryPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
});

