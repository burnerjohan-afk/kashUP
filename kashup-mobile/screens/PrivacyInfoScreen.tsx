/**
 * Écran d'information sur la collecte et le traitement des données personnelles (RGPD)
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing } from '../constants/theme';

const DATA_CATEGORIES = [
  {
    title: 'Données d\'identification',
    items: ['Nom et prénom', 'Adresse e-mail', 'Numéro de téléphone', 'Date de naissance'],
  },
  {
    title: 'Données de transaction',
    items: ['Historique des achats', 'Montants des transactions', 'Méthodes de paiement', 'Cashback accumulé'],
  },
  {
    title: 'Données bancaires',
    items: ['Informations de compte bancaire (via Powens)', 'IBAN', 'Statut de connexion bancaire'],
  },
  {
    title: 'Données d\'utilisation',
    items: ['Pages visitées', 'Actions effectuées', 'Préférences utilisateur', 'Cookies et traceurs'],
  },
];

const PURPOSES = [
  {
    title: 'Exécution du contrat',
    description: 'Gestion de votre compte, traitement des transactions, attribution du cashback.',
  },
  {
    title: 'Obligations légales',
    description: 'Conformité aux réglementations DSP2, KYC, lutte contre la fraude et le blanchiment.',
  },
  {
    title: 'Amélioration du service',
    description: 'Analyse de l\'utilisation de l\'application pour améliorer nos services.',
  },
  {
    title: 'Marketing (avec consentement)',
    description: 'Envoi d\'offres personnalisées et de communications marketing si vous y avez consenti.',
  },
];

export default function PrivacyInfoScreen() {
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
          <Text style={styles.title}>Vos données personnelles</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Données collectées</Text>
          <Text style={styles.sectionDescription}>
            KashUP collecte et traite les données personnelles suivantes pour vous fournir nos services :
          </Text>

          {DATA_CATEGORIES.map((category, index) => (
            <View key={index} style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              {category.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.itemRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primaryBlue} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finalités du traitement</Text>
          <Text style={styles.sectionDescription}>
            Vos données sont utilisées pour les finalités suivantes :
          </Text>

          {PURPOSES.map((purpose, index) => (
            <View key={index} style={styles.purposeCard}>
              <Text style={styles.purposeTitle}>{purpose.title}</Text>
              <Text style={styles.purposeDescription}>{purpose.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vos droits RGPD</Text>
          <View style={styles.rightsList}>
            <RightItem icon="eye" text="Droit d'accès : consulter vos données" />
            <RightItem icon="create" text="Droit de rectification : corriger vos données" />
            <RightItem icon="trash" text="Droit à l'effacement : supprimer votre compte" />
            <RightItem icon="download" text="Droit à la portabilité : exporter vos données" />
            <RightItem icon="ban" text="Droit d'opposition : refuser certains traitements" />
            <RightItem icon="stop-circle" text="Droit de limitation : limiter le traitement" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Durée de conservation</Text>
          <Text style={styles.sectionDescription}>
            Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été
            collectées, conformément aux obligations légales. En cas de suppression de compte, vos données sont
            supprimées dans un délai de 30 jours, sauf obligation légale de conservation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <Text style={styles.sectionDescription}>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données
            personnelles contre tout accès non autorisé, perte, destruction ou altération. Vos mots de passe sont
            chiffrés et ne sont jamais stockés en clair.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DataExport' as never)}>
            <Ionicons name="download" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Exporter mes données</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={() => navigation.navigate('DeleteAccount' as never)}>
            <Ionicons name="trash" size={20} color={colors.white} />
            <Text style={styles.actionButtonText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RightItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.rightItem}>
      <Ionicons name={icon as any} size={20} color={colors.primaryPurple} />
      <Text style={styles.rightText}>{text}</Text>
    </View>
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  categoryCard: {
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
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  purposeCard: {
    backgroundColor: '#F6F3FF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  purposeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryPurple,
    marginBottom: spacing.xs,
  },
  purposeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  rightsList: {
    gap: spacing.sm,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rightText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMain,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryPurple,
    padding: spacing.md,
    borderRadius: radius.pill,
  },
  actionButtonDanger: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
