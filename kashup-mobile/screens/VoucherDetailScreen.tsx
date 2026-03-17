import React, { useRef } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation } from '@react-navigation/native';

import { colors, radius, spacing } from '../constants/theme';
import { VoucherPayload } from '../types/vouchers';
import { getApiBaseUrl } from '@/src/config/api';
import { markGiftVideoViewed } from '@/src/services/giftCardService';

type VoucherDetailRoute = RouteProp<{ VoucherDetail: { voucher: VoucherPayload } }, 'VoucherDetail'>;

type Props = {
  route: VoucherDetailRoute;
};

export default function VoucherDetailScreen({ route }: Props) {
  const navigation = useNavigation();
  const { voucher } = route.params;
  const hasLocation = !!(voucher.locationText || voucher.mapUrl);
  const apiBaseUrl = getApiBaseUrl();
  const hasVideo = voucher.purchaseId && voucher.videoStatus === 'ready';
  const hasMarkedViewedRef = useRef(false);

  const openMap = () => {
    if (voucher.mapUrl) {
      Linking.openURL(voucher.mapUrl).catch(() =>
        Alert.alert('Erreur', "Impossible d'ouvrir la carte."),
      );
    }
  };

  const handleVideoStatusUpdate = async (status: any) => {
    if (!hasVideo || !voucher.purchaseId) return;
    if (status.isLoaded && status.didJustFinish && !hasMarkedViewedRef.current) {
      hasMarkedViewedRef.current = true;
      try {
        await markGiftVideoViewed(voucher.purchaseId);
      } catch {
        // best effort
      }
    }
  };

  const handleSendEmail = () => {
    const subject = `Utilisation du bon ${voucher.partenaire}`;
    const body = `Bonjour,\n\nJe souhaite utiliser mon bon d’achat (réf. ${
      voucher.id
    }) d’un montant de ${voucher.montant.toFixed(2)} € chez ${voucher.partenaire}.${
      voucher.expiration ? `\nValable jusqu’au ${voucher.expiration}.` : ''
    }${hasLocation ? `\n\nLocalisation du partenaire : ${voucher.locationText ?? 'Voir carte'}${voucher.mapUrl ? `\nCarte : ${voucher.mapUrl}` : ''}` : ''}\n\nMerci de me confirmer la prise en compte.\n\nÀ bientôt.`;
    const mailto = `mailto:contact@kashup.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body,
    )}`;
    Linking.openURL(mailto).catch(() =>
      Alert.alert('Messagerie indisponible', 'Impossible d’ouvrir votre application e-mail.'),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.primaryBlue, colors.primaryPurple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}>
          <Text style={styles.heroPersonalCopy}>Profite des <Text style={styles.heroValue}>{voucher.montant.toFixed(2)} €</Text> chez <Text style={styles.heroPartnerName}>{voucher.partenaire}</Text></Text>
          {!!voucher.expiration && (
            <Text style={styles.heroExpiration}>Valable jusqu’au {voucher.expiration}</Text>
          )}
        </LinearGradient>

        {hasVideo && voucher.purchaseId && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Message vidéo</Text>
            <View style={styles.videoContainer}>
              <Video
                source={{ uri: `${apiBaseUrl}/gift-cards/orders/${voucher.purchaseId}/video` }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                onPlaybackStatusUpdate={handleVideoStatusUpdate}
              />
            </View>
            {!!voucher.videoDurationSeconds && (
              <Text style={styles.videoMeta}>Durée ~ {voucher.videoDurationSeconds}s</Text>
            )}
          </View>
        )}

        {hasLocation && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Où utiliser ce bon ?</Text>
            {voucher.locationText ? (
              <Text style={styles.locationText}>{voucher.locationText}</Text>
            ) : null}
            {voucher.mapUrl ? (
              <TouchableOpacity style={styles.mapButton} onPress={openMap}>
                <Ionicons name="map" size={20} color={colors.primaryBlue} />
                <Text style={styles.mapButtonText}>Ouvrir dans la carte</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comment l’utiliser ?</Text>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Présentez ce bon directement chez le partenaire.</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              Réglez votre achat avec votre carte bancaire liée à KashUP.
            </Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Le cashback instantané est versé dans votre cagnotte une fois le paiement validé.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Besoin de confirmation ?</Text>
          <Text style={styles.cardParagraph}>
            Vous pouvez envoyer un e-mail automatique à l’équipe KashUP pour confirmer l’utilisation du
            bon et obtenir un reçu.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSendEmail}>
            <LinearGradient
              colors={[colors.primaryBlue, colors.primaryPurple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}>
              <Text style={styles.primaryText}>Envoyer un e-mail</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Fermer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroPersonalCopy: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 32,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  heroPartnerName: {
    fontWeight: '800',
    textDecorationLine: 'underline',
    color: colors.white,
  },
  heroExpiration: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: spacing.xs,
  },
  locationText: {
    fontSize: 15,
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryBlue,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  cardParagraph: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    color: colors.primaryPurple,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMain,
  },
  primaryButton: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  primaryGradient: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.white,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.primaryBlue,
    fontWeight: '700',
  },
  videoContainer: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    aspectRatio: 16 / 9,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },
});


