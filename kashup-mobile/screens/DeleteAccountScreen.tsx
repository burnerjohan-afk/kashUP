/**
 * Écran de suppression de compte (RGPD - droit à l'oubli)
 */

import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../src/services/gdpr';

export default function DeleteAccountScreen() {
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const CONFIRMATION_TEXT = 'SUPPRIMER';

  const handleDelete = async () => {
    if (confirmation !== CONFIRMATION_TEXT) {
      Alert.alert('Erreur', `Veuillez taper "${CONFIRMATION_TEXT}" pour confirmer la suppression.`);
      return;
    }

    Alert.alert(
      'Confirmation finale',
      'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible et toutes vos données seront supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAccount();
              await logout();
              Alert.alert(
                'Compte supprimé',
                'Votre compte et toutes vos données ont été supprimés. Vous allez être déconnecté.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigation vers l'écran de login sera gérée par le système d'auth
                      navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
                    },
                  },
                ],
              );
            } catch (error) {
              console.error('[DeleteAccount] Erreur:', error);
              Alert.alert('Erreur', 'Impossible de supprimer votre compte. Veuillez réessayer plus tard.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

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
          <Text style={styles.title}>Supprimer mon compte</Text>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="warning" size={32} color="#DC2626" />
          <Text style={styles.warningTitle}>Action irréversible</Text>
          <Text style={styles.warningText}>
            La suppression de votre compte entraînera la suppression définitive de toutes vos données :
          </Text>
          <View style={styles.consequencesList}>
            <ConsequenceItem text="Votre profil et vos informations personnelles" />
            <ConsequenceItem text="Votre historique de transactions" />
            <ConsequenceItem text="Votre solde de cashback et vos récompenses" />
            <ConsequenceItem text="Vos préférences et paramètres" />
            <ConsequenceItem text="Votre connexion bancaire (Powens)" />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primaryBlue} />
          <Text style={styles.infoText}>
            Conformément au RGPD, vous avez le droit à l'effacement de vos données. Cette action est définitive et
            ne peut pas être annulée. Certaines données peuvent être conservées pour des obligations légales (ex:
            transactions financières).
          </Text>
        </View>

        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationLabel}>
            Pour confirmer, tapez <Text style={styles.confirmationText}>{CONFIRMATION_TEXT}</Text> ci-dessous :
          </Text>
          <TextInput
            style={styles.confirmationInput}
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={CONFIRMATION_TEXT}
            autoCapitalize="characters"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={loading || confirmation !== CONFIRMATION_TEXT}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="trash" size={20} color={colors.white} />
              <Text style={styles.deleteButtonText}>Supprimer définitivement mon compte</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConsequenceItem({ text }: { text: string }) {
  return (
    <View style={styles.consequenceItem}>
      <Ionicons name="close-circle" size={16} color="#DC2626" />
      <Text style={styles.consequenceText}>{text}</Text>
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
  warningCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  consequencesList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  consequenceText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
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
  confirmationSection: {
    marginBottom: spacing.lg,
  },
  confirmationLabel: {
    fontSize: 14,
    color: colors.textMain,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  confirmationText: {
    fontWeight: '700',
    color: '#DC2626',
  },
  confirmationInput: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#DC2626',
    padding: spacing.md,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
