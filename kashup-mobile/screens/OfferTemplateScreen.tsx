import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getPartnerById } from '@/src/services/partnerService';
import { adaptPartnerFromApi } from '@/src/utils/partnerAdapter';
import type { PartnerViewModel } from '@/src/utils/partnerAdapter';
import { colors, spacing, radius } from '../constants/theme';
import type { MainStackParamList } from '../navigation/MainStack';
import { getCategoryAccent } from '../constants/categoryAccents';

type OfferTemplateRouteProp = RouteProp<MainStackParamList, 'OfferTemplate'>;

const OFFER_TYPE_LABEL: Record<'welcome' | 'permanent' | 'voucher', string> = {
  welcome: 'Offre de bienvenue',
  permanent: 'Offre permanente',
  voucher: 'Bon d’achat',
};

export default function OfferTemplateScreen() {
  const navigation = useNavigation();
  const route = useRoute<OfferTemplateRouteProp>();
  const { partnerId, offerType } = route.params;

  const [partner, setPartner] = useState<PartnerViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPartner = useCallback(async () => {
    setLoading(true);
    try {
      const apiPartner = await getPartnerById(partnerId);
      setPartner(adaptPartnerFromApi(apiPartner));
    } catch {
      setPartner(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchPartner();
  }, [fetchPartner]);

  const content = useMemo(() => {
    if (!partner) {
      return null;
    }

    const accent = getCategoryAccent(partner.categoryId);

    if (offerType === 'voucher') {
      return {
        accent,
        title: `${partner.name} – Bon d’achat`,
        advantage: `Achetez un bon d’achat ${partner.name} et recevez instantanément votre cashback dans votre portefeuille KashUP.`,
        amount: 'Montant au choix (5 € à 150 €)',
        typeLabel: 'Bon d’achat',
        steps: [
          'Choisissez un montant et une quantité de bons depuis l’onglet “Bons d’achat” de la fiche partenaire.',
          'Réglez directement dans l’app KashUP : le bon et son code (QR ou alphanumérique) sont générés immédiatement.',
          'Présentez le QR code en magasin ou saisissez le code en ligne pour déduire le montant de votre achat.',
        ],
        conditions: [
          'Bon valable 12 mois à compter de la date d’achat.',
          'Utilisable en une ou plusieurs fois tant que du solde reste disponible.',
          'Non cumulable avec d’autres bons sur une même transaction sans accord du commerçant.',
          'Non échangeable, non remboursable une fois généré.',
          `Utilisable uniquement dans les établissements ${partner.city} participants.`,
        ],
        voucherDetails: [
          'Montants proposés : 5 €, 20 €, 50 €, 100 €, 150 € et montant personnalisé (palier minimum 5 €).',
          'Le code cadeau doit être présenté en caisse ou saisi dans le panier en ligne pour être déduit.',
          'Les bons ne couvrent pas les frais de livraison et ne peuvent pas être convertis en espèces.',
        ],
        faq: [
          {
            question: 'Quand reçois-je mon cashback ?',
            answer: 'Le montant du cashback est crédité immédiatement dans votre portefeuille KashUP après l’achat du bon.',
          },
          {
            question: 'Puis-je offrir ce bon ?',
            answer: 'Oui, partagez simplement le QR code ou le code cadeau avec la personne de votre choix.',
          },
        ],
      };
    }

    const rate = offerType === 'welcome' ? partner.welcomeOffer.rate : partner.permanentOffer.rate;
    const typeLabel = offerType === 'welcome' ? 'Bienvenue' : 'Permanente';
    const firstCondition =
      offerType === 'welcome'
        ? "L'offre de bienvenue est valable qu'une seule fois par partenaire."
        : "Offre valable toute l'année chez ce partenaire, hors restrictions indiquées en caisse.";

    return {
      accent,
      title: `${partner.name} – ${offerType === 'welcome' ? 'Offre de bienvenue' : 'Offre permanente'}`,
      advantage: `Profitez de ${rate}% de cashback immédiatement crédité dans votre portefeuille KashUP à chaque achat chez ${partner.name}.`,
      amount: `${rate}% de cashback`,
      typeLabel,
      steps: [
        'Liez votre carte bancaire à KashUP (une seule fois) depuis la section Carte.',
        `Utilisez cette carte liée pour payer chez ${partner.name} en magasin ou en ligne.`,
        'Le cashback est crédité automatiquement quelques minutes après la transaction.',
      ],
      conditions: [
        firstCondition,
        'Cashback calculé sur le montant TTC réglé, hors frais de service ou livraison.',
        'Non cumulable avec les opérations boostées temporaires sauf mention contraire.',
        'Plusieurs cartes peuvent être associées par compte KashUP.',
      ],
      voucherDetails: null,
      faq: [
        {
          question: 'Dois-je activer mon offre avant chaque achat ?',
          answer: 'Non, une fois votre carte liée, les achats sont détectés automatiquement.',
        },
        {
          question: 'Quand le cashback apparaît-il ?',
          answer: 'Il est généralement visible sous quelques minutes et utilisable dès qu’il apparaît dans votre portefeuille.',
        },
      ],
    };
  }, [offerType, partner]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.fallback}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!partner || !content) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Cette offre n’est plus disponible.</Text>
          <TouchableOpacity style={styles.backButtonInline} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonInlineText}>Revenir</Text>
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleButton}>
            <Ionicons name="chevron-back" size={20} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{content.title}</Text>
        </View>

        <View style={[styles.sectionCard, { borderColor: content.accent }]}>
          <Text style={styles.sectionTitle}>Ce que vous gagnez</Text>
          <Text style={styles.sectionSubtitle}>{content.advantage}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Montant</Text>
            <Text style={styles.infoValue}>{content.amount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type d’offre</Text>
            <Text style={styles.infoValue}>{content.typeLabel}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
          {content.steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Conditions de l’offre</Text>
          {content.conditions.map((condition) => (
            <View key={condition} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{condition}</Text>
            </View>
          ))}
        </View>

        {content.voucherDetails && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Pour les bons d’achat</Text>
            {content.voucherDetails.map((detail) => (
              <View key={detail} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{detail}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          {content.faq.map((item) => (
            <View key={item.question} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 1.5,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMain,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMain,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryPurple,
    marginTop: spacing.sm / 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMain,
    lineHeight: 20,
  },
  faqItem: {
    gap: spacing.xs,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
  },
  faqAnswer: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fallbackText: {
    fontSize: 16,
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  backButtonInline: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryBlue,
  },
  backButtonInlineText: {
    color: colors.white,
    fontWeight: '700',
  },
});

