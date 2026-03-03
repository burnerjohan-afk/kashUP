import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useDonationImpact } from '@/src/hooks/useDonationImpact';
import { useWallet } from '@/src/hooks/useWallet';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../constants/theme';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { MainStackParamList } from '../navigation/MainStack';
import { useKYCGuard } from '../src/guards/kycGuard';

type ContributionRoute = RouteProp<HomeStackParamList, 'DonationContribution'>;
type ContributionNav = NavigationProp<HomeStackParamList>;
type MainNav = NativeStackNavigationProp<MainStackParamList>;

export default function DonationContributionScreen() {
  const navigation = useNavigation<ContributionNav>();
  const mainNavigation = useNavigation<MainNav>();
  const route = useRoute<ContributionRoute>();
  const { association, category } = route.params;
  const { data: walletData, loading: walletLoading, error: walletError, refetch } = useWallet();
  const { impact } = useDonationImpact();
  const { checkAccess } = useKYCGuard();
  const [amount, setAmount] = useState<number>(10);

  const availableBalance = walletData.wallet?.soldeCashback ?? 0;

  useEffect(() => {
    setAmount((prev) => {
      const capped = Math.min(prev, availableBalance);
      return Number.isFinite(capped) ? capped : 0;
    });
  }, [availableBalance]);

  const safeAmount = useMemo(() => {
    return Math.min(Math.max(amount, 0), availableBalance > 0 ? availableBalance : 0);
  }, [amount, availableBalance]);

  const updateAmount = (value: string) => {
    const numericValue = Number(value.replace(',', '.'));
    if (Number.isNaN(numericValue)) {
      setAmount(0);
    } else {
      setAmount(Math.min(Math.max(numericValue, 0), availableBalance));
    }
  };

  const handleDelta = (delta: number) => {
    setAmount((prev) => {
      const next = Math.min(Math.max(prev + delta, 0), availableBalance);
      return Number(next.toFixed(2));
    });
  };

  const handleContinue = async () => {
    if (safeAmount <= 0) {
      Alert.alert('Montant invalide', 'Veuillez sélectionner un montant supérieur à 0 €.');
      return;
    }

    // Vérification KYC avant le don
    const kycCheck = await checkAccess('donation');
    if (!kycCheck.allowed) {
      Alert.alert(
        'Vérification requise',
        kycCheck.reason || 'Une vérification d\'identité est requise pour effectuer un don.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Vérifier mon identité',
            onPress: () => {
              if (kycCheck.redirectTo === 'KYCVerification') {
                mainNavigation.navigate('KYCVerification');
              }
            },
          },
        ]
      );
      return;
    }

    navigation.navigate('DonationConfirmation', {
      association,
      category,
      amount: Number(safeAmount.toFixed(2)),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.title}>Définissez votre don</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>
          Vous allez soutenir <Text style={styles.highlight}>{association.name}</Text> ({category.title}).
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Solde de cashback disponible</Text>
          {walletLoading ? (
            <Text style={styles.balance}>Chargement…</Text>
          ) : (
            <Text style={styles.balance}>{availableBalance.toFixed(2)} €</Text>
          )}
          <Text style={styles.cardHint}>
            Utilisable immédiatement pour vos dons solidaires.
            {walletError ? ` (${walletError})` : ''}
          </Text>
          {walletError && (
            <TouchableOpacity style={styles.secondaryButton} onPress={refetch}>
              <Text style={styles.secondaryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Montant du don</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity style={styles.amountButton} onPress={() => handleDelta(-5)}>
              <Text style={styles.amountButtonText}>-5€</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.amountInput}
              value={safeAmount.toFixed(2)}
              keyboardType="decimal-pad"
              onChangeText={updateAmount}
            />
            <TouchableOpacity style={styles.amountButton} onPress={() => handleDelta(5)}>
              <Text style={styles.amountButtonText}>+5€</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardHint}>Montant plafonné à votre solde disponible.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.impactHeader}>
            <Ionicons name="sparkles-outline" size={18} color={category.accent} />
            <Text style={styles.cardLabel}>Ton impact</Text>
          </View>
          <Text style={styles.impactText}>{association.impact}</Text>
          {impact && (
            <View style={styles.impactGrid}>
              <View style={styles.impactMetric}>
                <Text style={styles.impactMetricValue}>{impact.donatedThisMonth.toFixed(2)} €</Text>
                <Text style={styles.impactMetricLabel}>Donnés ce mois</Text>
              </View>
              <View style={styles.impactMetric}>
                <Text style={styles.impactMetricValue}>{impact.associationsSupported}</Text>
                <Text style={styles.impactMetricLabel}>Associations aidées</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: category.accent }]}
          onPress={handleContinue}
          disabled={walletLoading}>
          <Text style={styles.primaryButtonText}>Continuer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Annuler</Text>
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
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
  highlight: {
    color: colors.primaryPurple,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  balance: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryBlue,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amountButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    alignItems: 'center',
  },
  amountButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryBlue,
  },
  amountInput: {
    flex: 1.2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  impactText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  impactGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  impactMetric: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  impactMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  impactMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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

