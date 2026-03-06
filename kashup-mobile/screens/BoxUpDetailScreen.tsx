import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { TAB_HEADER_HEIGHT } from '@/src/components/TabScreenHeader';
import { useNotifications } from '../context/NotificationsContext';
import { useRewards } from '@/src/hooks/useRewards';
import { useWallet } from '@/src/hooks/useWallet';
import { getGiftBoxById, sendBoxUp, createGiftCardPaymentIntent, confirmCardPaymentForGift, GiftBox } from '@/src/services/giftCardService';
import { usePaymentSheet } from '@stripe/stripe-react-native';
import { getPartners } from '@/src/services/partnerService';
import { normalizeImageUrl } from '@/src/utils/normalizeUrl';
import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import type { MainStackParamList } from '../navigation/MainStack';

const formatCashback = (v: number) =>
  v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPoints = (v: number) => `${v.toLocaleString('fr-FR')} pts`;

type BoxDetailRoute = RouteProp<MainStackParamList, 'BoxUpDetail'>;
/** Image symbolisant l'inconnu / la surprise pour les Box UP (cadeau mystère) — cadeau emballé rouge et noir */
const SURPRISE_BOX_IMAGE =
  'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1000&q=60';

/** URL d'image pour une box : si nom contient "SURPRISE" ou pas d'image, retourne l'image surprise */
function getBoxImageUri(box: {
  heroImageUrl?: string | null;
  imageUrl?: string | null;
  nom?: string;
  title?: string;
}): string {
  const name = (box.nom ?? box.title ?? '').toString().toUpperCase();
  if (name.includes('SURPRISE')) return SURPRISE_BOX_IMAGE;
  const raw = box.heroImageUrl ?? box.imageUrl;
  if (raw && typeof raw === 'string' && raw.trim() !== '') {
    return normalizeImageUrl(raw);
  }
  return SURPRISE_BOX_IMAGE;
}

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
    (navigation as any).navigate('Tabs', { screen: 'Accueil', params: { screen: 'Notifications' } });
  }, [navigation]);
  const handleProfilePress = useCallback(() => {
    (navigation as any).navigate('Tabs', { screen: 'Accueil', params: { screen: 'Profile' } });
  }, [navigation]);

  const [box, setBox] = useState<GiftBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Map partenaireId -> logoUrl pour afficher les logos (API box ne les renvoie pas toujours) */
  const [partnerLogos, setPartnerLogos] = useState<Record<string, string>>({});
  const [boxSendMode, setBoxSendMode] = useState<'email' | 'notification'>('email');
  const [boxPaymentMethod, setBoxPaymentMethod] = useState<'cashback' | 'card'>('cashback');
  const [boxRecipient, setBoxRecipient] = useState('');
  const [boxMessage, setBoxMessage] = useState('');
  const [pdfExporting, setPdfExporting] = useState(false);
  const [boxSending, setBoxSending] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

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

  const triggerEmail = (to: string, subject: string, body: string) => {
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir le client e-mail.'));
  };

  const handleExportPdf = useCallback(async () => {
    if (!box) return;
    try {
      setPdfExporting(true);
      const title = box.title ?? box.nom ?? 'Box UP';
      const price = (box.priceFrom ?? box.value ?? 0).toFixed(0);
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:system-ui;padding:24px;} .card{max-width:320px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;} h1{font-size:18px;margin:0 0 8px;} p{margin:4px 0;color:#334155;}</style></head><body><div class="card"><h1>${title}</h1><p>${(box.shortDescription ?? box.description ?? '').substring(0, 200)}</p><p><strong>Valeur : ${price} €</strong></p></div></body></html>`;
      const { uri } = await Print.printToFileAsync({ html, width: 340, height: 400 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Partager la Box UP (PDF)' });
      else Alert.alert('Export PDF', 'Le partage n\'est pas disponible. Le PDF a été généré.');
    } catch (err) {
      console.error('[BoxUp] Export PDF:', err);
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    } finally {
      setPdfExporting(false);
    }
  }, [box]);

  const handleConfirmBox = useCallback(async () => {
    if (!box) return;
    const email = boxRecipient.trim();
    if (!email) {
      Alert.alert('E-mail requis', "Indiquez l'e-mail du compte KashUP du destinataire.");
      return;
    }
    const payload = { boxId: box.id, beneficiaryEmail: email, message: boxMessage.trim() || undefined };
    try {
      setBoxSending(true);
      if (boxPaymentMethod === 'card') {
        const { clientSecret, paymentIntentId } = await createGiftCardPaymentIntent({ giftType: 'box_up', ...payload });
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
        const result = await confirmCardPaymentForGift({ paymentIntentId, giftType: 'box_up', ...payload });
        Alert.alert('Box envoyée', result?.message ?? "Le destinataire a été notifié dans l'app.");
      } else {
        const result = await sendBoxUp(payload);
        Alert.alert('Box envoyée', result.message ?? "Le destinataire a été notifié dans l'app.");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as Error)?.message ?? 'Envoi impossible.';
      Alert.alert('Erreur', msg);
    } finally {
      setBoxSending(false);
    }
  }, [box, boxRecipient, boxMessage, boxPaymentMethod, initPaymentSheet, presentPaymentSheet]);

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
            colors={['#059669', colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bandeauPillPoints}>
            <Ionicons name="star" size={16} color="#FFF" />
            <Text style={styles.bandeauPillPointsText}>{formatPoints(points ?? 0)}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#059669', colors.primary, colors.primaryDark]}
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
        <ImageBackground
          source={{ uri: getBoxImageUri(box) }}
          style={[styles.heroImage, { marginTop: -10 }]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.badgeText}>Multi-partenaires</Text>
          </View>
          <View style={styles.heroTexts}>
            <Text style={styles.heroTitle}>{box.title ?? box.nom ?? 'Box'}</Text>
            <Text style={styles.heroSubtitle}>{box.shortDescription ?? box.description ?? ''}</Text>
            <Text style={styles.heroPrice}>À partir de {(box.priceFrom ?? box.value ?? 0).toFixed(0)} €</Text>
            <View style={styles.cashbackRow}>
              <View style={styles.cashbackItem}>
                <Ionicons
                  name="pricetag"
                  size={12}
                  color={(box.cashbackRate != null && box.cashbackRate !== '' && Number(box.cashbackRate) >= 0) ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)'}
                />
                <Text style={[
                  styles.heroCashbackRate,
                  (box.cashbackRate == null || box.cashbackRate === '' || Number(box.cashbackRate) < 0) && styles.heroCashbackRateEmpty,
                ]}>
                  {(box.cashbackRate != null && box.cashbackRate !== '' && Number(box.cashbackRate) >= 0)
                    ? `${Number(box.cashbackRate)}%`
                    : '—'}
                </Text>
                <Text style={styles.heroCashbackItemLabel}>
                  {(box.cashbackRate != null && box.cashbackRate !== '' && Number(box.cashbackRate) >= 0)
                    ? "À l'achat"
                    : 'Non renseigné'}
                </Text>
              </View>
            </View>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Offrir cette Box</Text>
          <Text style={styles.sectionLabel}>Mode d'envoi</Text>
          <View style={styles.sendModeRow}>
            <TouchableOpacity
              style={[styles.sendModeCard, boxSendMode === 'email' && styles.sendModeCardActive]}
              onPress={() => setBoxSendMode('email')}
              activeOpacity={0.8}>
              <View style={[styles.sendModeIconWrap, boxSendMode === 'email' && styles.sendModeIconWrapActive]}>
                <Ionicons name="mail-outline" size={24} color={boxSendMode === 'email' ? colors.white : colors.primaryPurple} />
              </View>
              <Text style={[styles.sendModeTitle, boxSendMode === 'email' && styles.sendModeTitleActive]}>E-mail</Text>
              <Text style={styles.sendModeSubtitle}>Envoi par courriel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendModeCard, boxSendMode === 'notification' && styles.sendModeCardActive]}
              onPress={() => setBoxSendMode('notification')}
              activeOpacity={0.8}>
              <View style={[styles.sendModeIconWrap, boxSendMode === 'notification' && styles.sendModeIconWrapActive]}>
                <Ionicons name="notifications-outline" size={24} color={boxSendMode === 'notification' ? colors.white : colors.primaryPurple} />
              </View>
              <Text style={[styles.sendModeTitle, boxSendMode === 'notification' && styles.sendModeTitleActive]}>Notification KashUP</Text>
              <Text style={styles.sendModeSubtitle}>Alerte dans l'app</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>Mode de paiement</Text>
          <View style={styles.sendModeRow}>
            <TouchableOpacity
              style={[styles.sendModeCard, boxPaymentMethod === 'cashback' && styles.sendModeCardActive]}
              onPress={() => setBoxPaymentMethod('cashback')}
              activeOpacity={0.8}>
              <View style={[styles.sendModeIconWrap, boxPaymentMethod === 'cashback' && styles.sendModeIconWrapActive]}>
                <Ionicons name="wallet-outline" size={24} color={boxPaymentMethod === 'cashback' ? colors.white : colors.primaryPurple} />
              </View>
              <Text style={[styles.sendModeTitle, boxPaymentMethod === 'cashback' && styles.sendModeTitleActive]}>Cashback</Text>
              <Text style={styles.sendModeSubtitle}>Solde KashUP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendModeCard, boxPaymentMethod === 'card' && styles.sendModeCardActive]}
              onPress={() => setBoxPaymentMethod('card')}
              activeOpacity={0.8}>
              <View style={[styles.sendModeIconWrap, boxPaymentMethod === 'card' && styles.sendModeIconWrapActive]}>
                <Ionicons name="card-outline" size={24} color={boxPaymentMethod === 'card' ? colors.white : colors.primaryPurple} />
              </View>
              <Text style={[styles.sendModeTitle, boxPaymentMethod === 'card' && styles.sendModeTitleActive]}>Carte</Text>
              <Text style={styles.sendModeSubtitle}>Apple Pay / Google Pay</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionLabel}>
            {boxSendMode === 'email' ? 'Adresse e-mail' : 'E-mail du destinataire (compte KashUP)'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="exemple@mail.com"
            value={boxRecipient}
            onChangeText={setBoxRecipient}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.sectionLabel}>Message (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Un mot pour accompagner le cadeau"
            value={boxMessage}
            onChangeText={setBoxMessage}
            multiline
          />
          {boxSendMode === 'email' ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Exporter la Box</Text>
              <TouchableOpacity
                style={[styles.primaryButton, pdfExporting && { opacity: 0.7 }]}
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
          {boxSendMode === 'notification' ? (
            <TouchableOpacity
              style={[styles.primaryButton, boxSending && { opacity: 0.7 }]}
              onPress={handleConfirmBox}
              disabled={boxSending}>
              {boxSending ? (
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: colors.primary,
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  bandeauPillCashbackSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  bandeauPillCashbackValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  heroCashbackRate: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  heroCashbackRateEmpty: {
    color: 'rgba(255,255,255,0.75)',
  },
  heroCashbackItemLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
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
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  sendModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sendModeCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.greyBorder,
    alignItems: 'center',
  },
  sendModeCardActive: {
    borderColor: colors.primaryPurple,
    backgroundColor: 'rgba(4, 120, 87, 0.08)',
  },
  sendModeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(4, 120, 87, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendModeIconWrapActive: {
    backgroundColor: colors.primaryPurple,
  },
  sendModeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMain,
  },
  sendModeTitleActive: {
    color: colors.primaryPurple,
  },
  sendModeSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

