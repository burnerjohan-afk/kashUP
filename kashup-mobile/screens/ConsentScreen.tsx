/**
 * Écran de gestion des consentements RGPD
 * Permet à l'utilisateur de gérer ses préférences de consentement
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing } from '../constants/theme';
import { Consent, ConsentType, fetchConsents, updateConsent } from '../src/services/gdpr';

const CONSENT_TYPES: Array<{ type: ConsentType; label: string; description: string; required?: boolean }> = [
  {
    type: 'necessary',
    label: 'Cookies nécessaires',
    description: 'Ces cookies sont essentiels au fonctionnement de l\'application et ne peuvent pas être désactivés.',
    required: true,
  },
  {
    type: 'functional',
    label: 'Cookies fonctionnels',
    description: 'Ces cookies permettent d\'améliorer les fonctionnalités de l\'application.',
  },
  {
    type: 'analytics',
    label: 'Cookies analytiques',
    description: 'Ces cookies nous aident à comprendre comment vous utilisez l\'application pour l\'améliorer.',
  },
  {
    type: 'marketing',
    label: 'Cookies marketing',
    description: 'Ces cookies permettent de personnaliser les publicités et les offres qui vous sont proposées.',
  },
];

export default function ConsentScreen() {
  const navigation = useNavigation();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      setLoading(true);
      const data = await fetchConsents();
      setConsents(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger vos préférences de consentement.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConsent = async (type: ConsentType, granted: boolean) => {
    const consent = CONSENT_TYPES.find((c) => c.type === type);
    if (consent?.required && !granted) {
      Alert.alert('Consentement requis', 'Ce consentement est nécessaire au fonctionnement de l\'application.');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateConsent(type, granted);
      setConsents((prev) => prev.map((c) => (c.type === type ? updated : c)));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour ce consentement.');
    } finally {
      setSaving(false);
    }
  };

  const getConsentStatus = (type: ConsentType): boolean => {
    const consent = consents.find((c) => c.type === type);
    return consent?.granted ?? false;
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
          <Text style={styles.loadingText}>Chargement de vos préférences...</Text>
        </View>
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
          <Text style={styles.title}>Gestion des consentements</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primaryBlue} />
          <Text style={styles.infoText}>
            Vous pouvez à tout moment modifier vos préférences de consentement. Ces paramètres contrôlent les cookies
            et le suivi utilisés par l'application.
          </Text>
        </View>

        <View style={styles.consentsList}>
          {CONSENT_TYPES.map((consentType) => {
            const isGranted = getConsentStatus(consentType.type);
            const isRequired = consentType.required ?? false;

            return (
              <View key={consentType.type} style={styles.consentItem}>
                <View style={styles.consentHeader}>
                  <View style={styles.consentInfo}>
                    <Text style={styles.consentLabel}>
                      {consentType.label}
                      {isRequired && <Text style={styles.requiredBadge}> (Requis)</Text>}
                    </Text>
                    <Text style={styles.consentDescription}>{consentType.description}</Text>
                  </View>
                  <Switch
                    value={isGranted}
                    onValueChange={(value) => handleToggleConsent(consentType.type, value)}
                    disabled={isRequired || saving}
                    thumbColor="#fff"
                    trackColor={{ true: colors.primaryPurple, false: '#E5E7EB' }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.privacyButton}
          onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
          <Ionicons name="document-text" size={20} color={colors.primaryPurple} />
          <Text style={styles.privacyButtonText}>Voir la politique de confidentialité</Text>
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
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
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
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  consentsList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  consentItem: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  consentInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  consentLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  requiredBadge: {
    fontSize: 12,
    color: colors.primaryBlue,
    fontWeight: '600',
  },
  consentDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryPurple,
    backgroundColor: colors.white,
  },
  privacyButtonText: {
    color: colors.primaryPurple,
    fontWeight: '600',
    fontSize: 14,
  },
});
