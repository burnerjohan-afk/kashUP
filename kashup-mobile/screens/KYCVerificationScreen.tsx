/**
 * Écran de vérification KYC (Know Your Customer)
 * Conforme à DSP2 pour les services de paiement
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing } from '../constants/theme';
import { fetchKYCStatus, KYCStatus, KYCVerificationRequest, submitKYCVerification } from '../src/services/kyc';

export default function KYCVerificationScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus>('not_started');
  const [form, setForm] = useState<KYCVerificationRequest>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: 'FR',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'FR',
    },
  });

  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    try {
      setLoading(true);
      const status = await fetchKYCStatus();
      setKycStatus(status.status);
      if (status.status === 'verified') {
        Alert.alert('Vérification complète', 'Votre identité a déjà été vérifiée.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('[KYC] Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.firstName || !form.lastName || !form.dateOfBirth) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!form.address.street || !form.address.city || !form.address.postalCode) {
      Alert.alert('Adresse incomplète', 'Veuillez remplir tous les champs de l\'adresse.');
      return;
    }

    try {
      setSubmitting(true);
      await submitKYCVerification(form);
      Alert.alert(
        'Demande soumise',
        'Votre demande de vérification d\'identité a été soumise. Elle sera traitée sous 24-48h.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de soumettre votre demande. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.slateBackgroundLight, colors.slateBackground]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryPurple} />
        </View>
      </SafeAreaView>
    );
  }

  if (kycStatus === 'pending') {
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
            <Text style={styles.title}>Vérification d'identité</Text>
          </View>

          <View style={styles.statusCard}>
            <Ionicons name="time" size={48} color="#F59E0B" />
            <Text style={styles.statusTitle}>Vérification en cours</Text>
            <Text style={styles.statusText}>
              Votre demande de vérification d'identité est en cours de traitement. Vous serez notifié dès que la
              vérification sera complétée.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (kycStatus === 'rejected') {
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
            <Text style={styles.title}>Vérification d'identité</Text>
          </View>

          <View style={styles.statusCard}>
            <Ionicons name="close-circle" size={48} color="#DC2626" />
            <Text style={styles.statusTitle}>Vérification rejetée</Text>
            <Text style={styles.statusText}>
              Votre demande de vérification a été rejetée. Veuillez contacter le support pour plus d'informations.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Vérification d'identité</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primaryBlue} />
          <Text style={styles.infoText}>
            Conformément à la réglementation DSP2, une vérification d'identité (KYC) est requise pour certaines
            actions (paiements, retraits, etc.). Vos données sont sécurisées et ne sont utilisées qu'à cette fin.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput
                style={styles.input}
                value={form.firstName}
                onChangeText={(text) => setForm({ ...form, firstName: text })}
                placeholder="Jean"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={form.lastName}
                onChangeText={(text) => setForm({ ...form, lastName: text })}
                placeholder="Dupont"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date de naissance *</Text>
            <TextInput
              style={styles.input}
              value={form.dateOfBirth}
              onChangeText={(text) => setForm({ ...form, dateOfBirth: text })}
              placeholder="YYYY-MM-DD"
            />
            <Text style={styles.hint}>Format : AAAA-MM-JJ (ex: 1990-01-15)</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nationalité *</Text>
            <TextInput
              style={styles.input}
              value={form.nationality}
              onChangeText={(text) => setForm({ ...form, nationality: text.toUpperCase() })}
              placeholder="FR"
              maxLength={2}
            />
          </View>

          <Text style={styles.sectionTitle}>Adresse</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Rue et numéro *</Text>
            <TextInput
              style={styles.input}
              value={form.address.street}
              onChangeText={(text) => setForm({ ...form, address: { ...form.address, street: text } })}
              placeholder="123 Rue de la République"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Code postal *</Text>
              <TextInput
                style={styles.input}
                value={form.address.postalCode}
                onChangeText={(text) => setForm({ ...form, address: { ...form.address, postalCode: text } })}
                placeholder="97100"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Ville *</Text>
              <TextInput
                style={styles.input}
                value={form.address.city}
                onChangeText={(text) => setForm({ ...form, address: { ...form.address, city: text } })}
                placeholder="Basse-Terre"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Pays *</Text>
            <TextInput
              style={styles.input}
              value={form.address.country}
              onChangeText={(text) => setForm({ ...form, address: { ...form.address, country: text.toUpperCase() } })}
              placeholder="FR"
              maxLength={2}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.white} />
              <Text style={styles.submitButtonText}>Soumettre la vérification</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.textMain,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryPurple,
    padding: spacing.md,
    borderRadius: radius.pill,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});

