import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing } from '../constants/theme';
import { useWallet } from '@/src/hooks/useWallet';
import { getCoffreFortHistory, transferToCoffreFort, withdrawFromCoffreFort } from '@/src/services/walletService';
import type { CagnotteStackParamList } from '../navigation/CagnotteStack';

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

type NavProp = NativeStackNavigationProp<CagnotteStackParamList, 'CoffreFort'>;

export default function CoffreFortScreen() {
  const navigation = useNavigation<NavProp>();
  const { data, loading, refetch } = useWallet();
  const [transferAmount, setTransferAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [history, setHistory] = useState<{
    versements: { amount: number; date: string }[];
    retraits: { amount: number; date: string }[];
    points: { points: number; date: string }[];
  } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const h = await getCoffreFortHistory();
      setHistory(h);
    } catch {
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
      loadHistory();
    }, [refetch, loadHistory])
  );

  const wallet = data.wallet;
  const soldeCoffreFort = wallet?.soldeCoffreFort ?? 0;
  const soldeCashback = wallet?.soldeCashback ?? 0;
  const withdrawableCoffreFort = wallet?.withdrawableCoffreFort ?? 0;
  const config = wallet?.coffreFortConfig;
  const lockMonths = config?.lockPeriodMonths ?? 2;
  const pointsPerEuro = config?.pointsPerEuroPerMonth ?? 10;

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant positif.');
      return;
    }
    if (amount > soldeCashback) {
      Alert.alert('Solde insuffisant', `Disponible : ${formatCurrency(soldeCashback)}`);
      return;
    }
    setTransferring(true);
    try {
      await transferToCoffreFort(amount);
      setTransferAmount('');
      await Promise.all([refetch(), loadHistory()]);
      Alert.alert('Versement effectué', `Votre coffre-fort sera débloqué dans ${lockMonths} mois.`);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'effectuer le versement.');
    } finally {
      setTransferring(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant positif.');
      return;
    }
    if (amount > withdrawableCoffreFort) {
      Alert.alert('Montant non disponible', `Retirable : ${formatCurrency(withdrawableCoffreFort)} (déblocage après ${lockMonths} mois).`);
      return;
    }
    setWithdrawing(true);
    try {
      await withdrawFromCoffreFort(amount);
      setWithdrawAmount('');
      await Promise.all([refetch(), loadHistory()]);
      Alert.alert('Retrait effectué', 'Le montant a été recrédité sur votre cagnotte.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'effectuer le retrait.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coffre-fort</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={loading && !wallet} onRefresh={() => { refetch(); loadHistory(); }} />
          }>
          <View style={styles.ruleCard}>
            <Text style={styles.ruleTitle}>Règle du coffre-fort</Text>
            <Text style={styles.ruleText}>
              L’argent versé dans le coffre ne peut pas être retiré avant {lockMonths} mois.
            </Text>
            <Text style={styles.ruleText}>
              1 € dans le coffre = <Text style={styles.ruleHighlight}>{pointsPerEuro} points</Text> par mois.
            </Text>
          </View>

          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde disponible (cagnotte)</Text>
            <Text style={styles.balanceValue}>{formatCurrency(soldeCashback)}</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde en coffre-fort</Text>
            <Text style={styles.balanceValue}>{formatCurrency(soldeCoffreFort)}</Text>
            {withdrawableCoffreFort > 0 && (
              <Text style={styles.withdrawableHint}>Retirable : {formatCurrency(withdrawableCoffreFort)}</Text>
            )}
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Verser en coffre-fort</Text>
            <Text style={styles.formHint}>Transférer de la cagnotte vers le coffre (blocage {lockMonths} mois)</Text>
            <TextInput
              style={styles.input}
              placeholder="Montant (€)"
              placeholderTextColor={colors.textTertiary}
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={[styles.primaryButton, transferring && styles.buttonDisabled]}
              onPress={handleTransfer}
              disabled={transferring}>
              {transferring ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Verser</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Retirer du coffre-fort</Text>
            <Text style={styles.formHint}>
              {withdrawableCoffreFort > 0
                ? `Créditer la cagnotte (montants débloqués). Retirable : ${formatCurrency(withdrawableCoffreFort)}`
                : `Aucun montant débloqué pour l’instant (déblocage après ${lockMonths} mois).`}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Montant (€)"
              placeholderTextColor={colors.textTertiary}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="decimal-pad"
              editable={withdrawableCoffreFort > 0}
            />
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                (withdrawing || withdrawableCoffreFort <= 0) && styles.buttonDisabled,
              ]}
              onPress={handleWithdraw}
              disabled={withdrawing || withdrawableCoffreFort <= 0}>
              {withdrawing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Retirer</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Historique coffre-fort</Text>
            {historyLoading ? (
              <View style={styles.historyLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.historyLoaderText}>Chargement…</Text>
              </View>
            ) : history ? (
              <>
                {history.versements.length > 0 && (
                  <View style={styles.historyBlock}>
                    <Text style={styles.historyBlockTitle}>Cashback versé</Text>
                    {history.versements.map((v, i) => (
                      <View key={`v-${i}`} style={styles.historyRow}>
                        <Ionicons name="arrow-down-circle" size={18} color={colors.primary} />
                        <Text style={styles.historyAmount}>+{formatCurrency(v.amount)}</Text>
                        <Text style={styles.historyDate}>{formatDate(v.date)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {history.retraits.length > 0 && (
                  <View style={styles.historyBlock}>
                    <Text style={styles.historyBlockTitle}>Cashback retiré</Text>
                    {history.retraits.map((r, i) => (
                      <View key={`r-${i}`} style={styles.historyRow}>
                        <Ionicons name="arrow-up-circle" size={18} color={colors.textSecondary} />
                        <Text style={styles.historyAmountRetrait}>-{formatCurrency(r.amount)}</Text>
                        <Text style={styles.historyDate}>{formatDate(r.date)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {history.points.length > 0 && (
                  <View style={styles.historyBlock}>
                    <Text style={styles.historyBlockTitle}>Points gagnés</Text>
                    {history.points.map((p, i) => (
                      <View key={`p-${i}`} style={styles.historyRow}>
                        <Ionicons name="star" size={18} color={colors.primary} />
                        <Text style={styles.historyPoints}>+{p.points} pts</Text>
                        <Text style={styles.historyDate}>{formatDate(p.date)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {history.versements.length === 0 &&
                  history.retraits.length === 0 &&
                  history.points.length === 0 && (
                    <Text style={styles.historyEmpty}>Aucun mouvement pour le moment.</Text>
                  )}
              </>
            ) : (
              <Text style={styles.historyEmpty}>Impossible de charger l’historique.</Text>
            )}
          </View>

          {loading && !wallet && (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.slateBackground },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textMain },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  ruleCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  ruleTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: spacing.sm },
  ruleText: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xs },
  ruleHighlight: { fontWeight: '700', color: colors.primary },
  balanceCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  balanceLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  balanceValue: { fontSize: 20, fontWeight: '700', color: colors.textMain },
  withdrawableHint: { fontSize: 12, color: colors.primary, marginTop: 4 },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: 4 },
  formHint: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.greyBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textMain,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.white },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  buttonDisabled: { opacity: 0.6 },
  loader: { padding: spacing.xl, alignItems: 'center' },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greyBorder,
  },
  historyTitle: { fontSize: 16, fontWeight: '700', color: colors.textMain, marginBottom: spacing.md },
  historyLoader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  historyLoaderText: { fontSize: 14, color: colors.textSecondary },
  historyBlock: { marginBottom: spacing.md },
  historyBlockTitle: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyBorder,
  },
  historyAmount: { fontSize: 15, fontWeight: '700', color: colors.primary, flex: 1 },
  historyAmountRetrait: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, flex: 1 },
  historyPoints: { fontSize: 15, fontWeight: '700', color: colors.primary, flex: 1 },
  historyDate: { fontSize: 13, color: colors.textTertiary },
  historyEmpty: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', paddingVertical: spacing.sm },
});
