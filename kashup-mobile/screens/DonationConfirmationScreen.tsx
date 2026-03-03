import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '../constants/theme';
import type { HomeStackParamList } from '../navigation/HomeStack';

type ConfirmationRoute = RouteProp<HomeStackParamList, 'DonationConfirmation'>;
type ConfirmationNav = NavigationProp<HomeStackParamList>;

export default function DonationConfirmationScreen() {
  const navigation = useNavigation<ConfirmationNav>();
  const route = useRoute<ConfirmationRoute>();
  const { association, category, amount } = route.params;

  const handleConfirm = () => {
    Alert.alert(
      'Merci pour votre geste !',
      `Votre don de ${amount.toFixed(2)} € pour ${association.name} sera débloqué immédiatement.`,
      [
        {
          text: 'Fermer',
          onPress: () => navigation.popToTop(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Confirmer votre don</Text>
        <Text style={styles.subtitle}>Vérifiez les informations avant validation définitive.</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Association soutenue</Text>
          <Text style={styles.associationName}>{association.name}</Text>
          <Text style={styles.associationMeta}>
            {category.title} • {association.location}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Montant du don</Text>
          <Text style={[styles.amount, { color: category.accent }]}>{amount.toFixed(2)} €</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.thanksRow}>
            <Ionicons name="heart" size={18} color={category.accent} />
            <Text style={styles.cardLabel}>Merci pour votre geste</Text>
          </View>
          <Text style={styles.thanksText}>
            Votre contribution aide {association.name} à {association.impact.toLowerCase()}.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: category.accent }]}
          onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>Confirmer le don</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Modifier le montant</Text>
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
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  associationName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  associationMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: 30,
    fontWeight: '800',
  },
  thanksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  thanksText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryPurple,
  },
  secondaryButtonText: {
    color: colors.primaryPurple,
    fontWeight: '700',
  },
});

