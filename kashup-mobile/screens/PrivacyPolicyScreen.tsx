/**
 * Écran de politique de confidentialité
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing } from '../constants/theme';

const SECTIONS = [
  {
    title: '1. Collecte des données',
    content:
      'KashUP collecte les données personnelles nécessaires à la fourniture de nos services : identité, coordonnées, données de transaction, informations bancaires (via Powens), et données d\'utilisation de l\'application.',
  },
  {
    title: '2. Finalités du traitement',
    content:
      'Vos données sont utilisées pour : l\'exécution du contrat (gestion de compte, transactions, cashback), le respect des obligations légales (DSP2, KYC, lutte contre la fraude), l\'amélioration de nos services, et le marketing (avec votre consentement).',
  },
  {
    title: '3. Base légale',
    content:
      'Le traitement de vos données repose sur : l\'exécution du contrat, le respect d\'obligations légales, votre consentement (pour le marketing), et notre intérêt légitime (amélioration des services).',
  },
  {
    title: '4. Partage des données',
    content:
      'Vos données peuvent être partagées avec : nos prestataires techniques (hébergement, paiement), Powens (connexion bancaire), les partenaires commerciaux (pour le cashback), et les autorités compétentes si requis par la loi.',
  },
  {
    title: '5. Conservation des données',
    content:
      'Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, conformément aux obligations légales. En cas de suppression de compte, vos données sont supprimées dans un délai de 30 jours.',
  },
  {
    title: '6. Vos droits',
    content:
      'Vous disposez des droits suivants : accès, rectification, effacement, portabilité, opposition, limitation du traitement. Vous pouvez exercer ces droits en nous contactant ou via l\'application.',
  },
  {
    title: '7. Sécurité',
    content:
      'Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement, authentification forte, accès restreint, sauvegardes régulières.',
  },
  {
    title: '8. Cookies et traceurs',
    content:
      'Nous utilisons des cookies et traceurs pour : le fonctionnement de l\'application (nécessaires), l\'amélioration des services (fonctionnels), l\'analyse d\'utilisation (analytiques), et le marketing (avec consentement).',
  },
  {
    title: '9. Transferts internationaux',
    content:
      'Vos données peuvent être transférées hors de l\'UE vers des pays offrant un niveau de protection adéquat ou avec des garanties appropriées (clauses contractuelles types).',
  },
  {
    title: '10. Contact',
    content:
      'Pour toute question concernant vos données personnelles, contactez notre délégué à la protection des données (DPO) à l\'adresse : dpo@kashup.fr',
  },
];

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.title}>Politique de confidentialité</Text>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={styles.introDescription}>
            KashUP s'engage à protéger vos données personnelles et à respecter votre vie privée. Cette politique
            explique comment nous collectons, utilisons et protégeons vos données conformément au RGPD.
          </Text>
        </View>

        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            En utilisant KashUP, vous acceptez cette politique de confidentialité. Si vous n'acceptez pas ces termes,
            veuillez ne pas utiliser l'application.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
  },
  introCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  introText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  introDescription: {
    fontSize: 14,
    color: colors.textMain,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryPurple,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#F6F3FF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
});
